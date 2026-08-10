-- Scoring layer. Everything derives from v_pick_scores; the x2 sweep
-- multiplier composes in exactly one place (effective_odds). Views are
-- security_invoker so RLS still applies through them.

-- Per gameweek x team: leg counts and the generalised "6/6" (full sweep =
-- every expected leg present and won; 6 for league seasons, the mapped
-- member count for test/special seasons - 2 for Test Weekend pairs).
create view v_team_weeks with (security_invoker = on) as
with pick_teams as (
  select p.gameweek_id,
         g.season_id,
         s.kind as season_kind,
         coalesce(m.team_name, pl.acca_team) as team_name,
         p.result
  from picks p
  join players pl on pl.id = p.player_id
  join gameweeks g on g.id = p.gameweek_id
  join seasons s on s.id = g.season_id
  left join season_team_members m
    on m.season_id = g.season_id and m.player_id = p.player_id
),
agg as (
  select gameweek_id, season_id, season_kind, team_name,
         count(*) as legs,
         count(*) filter (where result = 1) as leg_wins,
         count(*) filter (where result is not null) as legs_settled
  from pick_teams
  group by 1, 2, 3, 4
)
select a.gameweek_id, a.team_name, a.legs, a.leg_wins, a.legs_settled,
       r.required_legs,
       (a.legs = r.required_legs and a.leg_wins = r.required_legs) as is_full_sweep
from agg a
cross join lateral (
  -- League seasons are a hard 6 (Season 1 VDL had 5 members: 5/5 must never
  -- sweep, matching the sheet). Mapped seasons use their member count.
  select case
           when a.season_kind = 'league' then 6
           else coalesce(
             nullif((select count(*)::int from season_team_members m2
                     where m2.season_id = a.season_id
                       and m2.team_name = a.team_name), 0), 6)
         end as required_legs
) r;

create view v_pick_scores with (security_invoker = on) as
select p.id,
       p.player_id,
       pl.name,
       pl.acca_team,
       coalesce(m.team_name, pl.acca_team) as team_name,
       p.gameweek_id,
       g.gw_date,
       g.season_id,
       s.kind as season_kind,
       p.method, p.team, p.second_team, p.odds, p.result,
       p.fixture_id, p.fixture_side, p.locked, p.submitted_at, p.submitted_by,
       (tw.is_full_sweep and s.double_rule and not g.is_season_final) as doubled,
       p.odds * case when tw.is_full_sweep and s.double_rule and not g.is_season_final
                     then 2 else 1 end as effective_odds,
       -- Weekly form value: 2 on a sweep (NOT gated on double_rule - the two
       -- pre-rule 6/6 weeks show gold in the grid but never doubled scores),
       -- else +1 win / -1 loss / -2 no-pick. Null while unsettled.
       case when p.result is null then null
            when tw.is_full_sweep then 2
            when p.result = 1 then 1
            when p.method = 'N/A' then -2
            else -1
       end as form_value
from picks p
join players pl on pl.id = p.player_id
join gameweeks g on g.id = p.gameweek_id
join seasons s on s.id = g.season_id
left join season_team_members m
  on m.season_id = g.season_id and m.player_id = p.player_id
join v_team_weeks tw
  on tw.gameweek_id = p.gameweek_id
 and tw.team_name = coalesce(m.team_name, pl.acca_team);

create view v_team_week_scores with (security_invoker = on) as
select gameweek_id, team_name,
       coalesce(sum(effective_odds) filter (where result = 1), 0) as week_score,
       count(*) as legs,
       count(*) filter (where result is not null) as settled,
       count(*) filter (where result = 1) as wins,
       count(*) filter (where result = 0) as losses,
       bool_or(doubled) as doubled
from v_pick_scores
group by 1, 2;

-- Live chip state, pure SQL - no LLM in the hot path. BTTS LANDED is
-- irreversible the moment the second team scores.
create view v_live_pick_status with (security_invoker = on) as
select p.id as pick_id, p.gameweek_id, p.player_id, p.method,
       f.id as fixture_id, f.status as fixture_status,
       f.home_team, f.away_team, f.home_score, f.away_score, f.minute, f.kickoff,
       case
         when p.fixture_id is null or f.status in ('POSTPONED', 'CANCELLED') then 'NO_LIVE'
         when f.status in ('TIMED', 'SCHEDULED') then 'NOT_STARTED'
         when p.method = 'BTTS' then
           case when f.home_score > 0 and f.away_score > 0 then 'LANDED'
                when f.status = 'FINISHED' then 'LOST'
                else 'WAITING'
           end
         when p.method = 'Win' and p.fixture_side is not null then
           case
             when f.status = 'FINISHED' then
               case when (p.fixture_side = 'HOME' and f.home_score > f.away_score)
                      or (p.fixture_side = 'AWAY' and f.away_score > f.home_score)
                    then 'WON' else 'LOST'
               end
             when (p.fixture_side = 'HOME' and f.home_score > f.away_score)
               or (p.fixture_side = 'AWAY' and f.away_score > f.home_score) then 'WINNING'
             when f.home_score = f.away_score then 'LEVEL'
             else 'LOSING'
           end
         else 'NO_LIVE'
       end as live_state
from picks p
left join fixtures f on f.id = p.fixture_id;

-- The one leaderboard. Season tabs, All Time and custom ranges are all this
-- function with different ranges. ALWAYS excludes test seasons - a test pick
-- must never touch the real ledger.
create or replace function leaderboard(range_start date, range_end date)
returns table (
  player_id uuid, name text, acca_team text,
  entries bigint, wins bigint, win_pct numeric,
  avg_odds numeric, avg_win_odds numeric, avg_loss_odds numeric,
  last_win date, last_loss date, days_since_win int,
  win_streak bigint, form bigint,
  bonus numeric, minus numeric, score numeric, score_per_match numeric
)
language sql stable as
$$
with pr as (
  select * from v_pick_scores
  where gw_date between range_start and range_end
    and season_kind <> 'test'
    and result is not null
),
last5 as (
  select gw_date
  from (select distinct gw_date from pr order by gw_date desc limit 5) t
),
adj as (
  select a.player_id,
         coalesce(sum(a.score) filter (where a.kind = 'Bonus'), 0) as bonus,
         coalesce(sum(a.score) filter (where a.kind = 'Minus'), 0) as minus
  from adjustments a
  join gameweeks g on g.id = a.gameweek_id
  join seasons s on s.id = g.season_id
  where a.player_id is not null
    and s.kind <> 'test'
    and g.gw_date between range_start and range_end
  group by 1
),
base as (
  select pr.player_id,
         count(*) as entries,
         count(*) filter (where pr.result = 1) as wins,
         avg(pr.odds) as avg_odds,
         avg(pr.odds) filter (where pr.result = 1) as avg_win_odds,
         avg(pr.odds) filter (where pr.result = 0) as avg_loss_odds,
         max(pr.gw_date) filter (where pr.result = 1) as last_win,
         max(pr.gw_date) filter (where pr.result = 0) as last_loss,
         coalesce(sum(pr.effective_odds) filter (where pr.result = 1), 0) as raw_score,
         count(*) filter (where pr.form_value >= 1
                            and pr.gw_date in (select gw_date from last5)) as form
  from pr
  group by 1
)
select p.id, p.name, p.acca_team,
       b.entries, b.wins,
       round(100.0 * b.wins / nullif(b.entries, 0), 1),
       b.avg_odds, b.avg_win_odds, b.avg_loss_odds,
       b.last_win, b.last_loss,
       (least(range_end, current_date) - b.last_win),
       -- consecutive wins since last loss == count of wins dated after it
       (select count(*) from pr
         where pr.player_id = b.player_id and pr.result = 1
           and pr.gw_date > coalesce(b.last_loss, date '1900-01-01')),
       b.form,
       coalesce(a.bonus, 0), coalesce(a.minus, 0),
       b.raw_score + coalesce(a.bonus, 0) + coalesce(a.minus, 0),
       (b.raw_score + coalesce(a.bonus, 0) + coalesce(a.minus, 0)) / nullif(b.entries, 0)
from base b
join players p on p.id = b.player_id
left join adj a on a.player_id = b.player_id
$$;

create or replace function team_leaderboard(range_start date, range_end date)
returns table (
  acca_team text, entries bigint, wins bigint, win_pct numeric,
  avg_odds numeric, sweeps bigint, score numeric, score_per_match numeric
)
language sql stable as
$$
with pr as (
  select * from v_pick_scores
  where gw_date between range_start and range_end
    and season_kind <> 'test'
    and result is not null
),
adj as (
  select coalesce(a.acca_team, pl.acca_team) as team,
         coalesce(sum(a.score), 0) as total
  from adjustments a
  join gameweeks g on g.id = a.gameweek_id
  join seasons s on s.id = g.season_id
  left join players pl on pl.id = a.player_id
  where s.kind <> 'test'
    and g.gw_date between range_start and range_end
  group by 1
),
sweeps as (
  select ps.acca_team, count(distinct tw.gameweek_id) as n
  from v_team_weeks tw
  join gameweeks g on g.id = tw.gameweek_id
  join seasons s on s.id = g.season_id
  join (select distinct acca_team, team_name from v_pick_scores) ps
    on ps.team_name = tw.team_name
  where tw.is_full_sweep
    and s.kind <> 'test'
    and g.gw_date between range_start and range_end
  group by 1
)
select pr.acca_team,
       count(*),
       count(*) filter (where pr.result = 1),
       round(100.0 * count(*) filter (where pr.result = 1) / nullif(count(*), 0), 1),
       avg(pr.odds),
       coalesce(max(sw.n), 0),
       coalesce(sum(pr.effective_odds) filter (where pr.result = 1), 0) + coalesce(max(adj.total), 0),
       (coalesce(sum(pr.effective_odds) filter (where pr.result = 1), 0) + coalesce(max(adj.total), 0))
         / nullif(count(*), 0)
from pr
left join adj on adj.team = pr.acca_team
left join sweeps sw on sw.acca_team = pr.acca_team
group by pr.acca_team
$$;

-- Season-scoped table (works for test seasons too - this is the only way
-- test picks are ever ranked). Groups by the season's resolved team names.
create or replace function season_leaderboard(p_season uuid)
returns table (
  player_id uuid, name text, team_name text,
  entries bigint, wins bigint, score numeric, score_per_match numeric
)
language sql stable as
$$
with pr as (
  select * from v_pick_scores
  where season_id = p_season and result is not null
),
adj as (
  select a.player_id, coalesce(sum(a.score), 0) as total
  from adjustments a
  join gameweeks g on g.id = a.gameweek_id
  where g.season_id = p_season and a.player_id is not null
  group by 1
)
select pr.player_id, pr.name, pr.team_name,
       count(*),
       count(*) filter (where pr.result = 1),
       coalesce(sum(pr.effective_odds) filter (where pr.result = 1), 0) + coalesce(max(a.total), 0),
       (coalesce(sum(pr.effective_odds) filter (where pr.result = 1), 0) + coalesce(max(a.total), 0))
         / nullif(count(*), 0)
from pr
left join adj a on a.player_id = pr.player_id
group by pr.player_id, pr.name, pr.team_name
$$;

-- Form grid feed: players x last N settled gameweeks, plus whether any team
-- swept that week (gold column header).
create or replace function form_grid(last_n int, as_of date default current_date)
returns table (
  player_id uuid, name text, acca_team text,
  gw_date date, form_value int, week_has_sweep boolean
)
language sql stable as
$$
with dates as (
  select distinct ps.gw_date
  from v_pick_scores ps
  where ps.season_kind <> 'test' and ps.result is not null and ps.gw_date <= as_of
  order by ps.gw_date desc
  limit last_n
),
sweep_weeks as (
  select g.gw_date, bool_or(tw.is_full_sweep) as has_sweep
  from v_team_weeks tw
  join gameweeks g on g.id = tw.gameweek_id
  where g.gw_date in (select gw_date from dates)
  group by 1
)
select ps.player_id, ps.name, ps.acca_team, ps.gw_date,
       ps.form_value::int, coalesce(sw.has_sweep, false)
from v_pick_scores ps
join dates d on d.gw_date = ps.gw_date
left join sweep_weeks sw on sw.gw_date = ps.gw_date
where ps.season_kind <> 'test' and ps.result is not null
$$;
