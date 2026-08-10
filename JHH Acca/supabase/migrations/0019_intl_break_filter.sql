-- 0019 — international-break filter for the standings
--
-- v0.5.0 feedback item: "Option to include/remove international weeks in the
-- standings, part of the dropdowns as suggested".
--
-- v_pick_scores didn't carry gameweeks.is_international_break, so the filter
-- couldn't be applied client-side. Here we expose the flag on the view and add an
-- opt-in `p_exclude_breaks` parameter to the two range leaderboards. The default is
-- false, so every existing call site is byte-for-byte unchanged.

-- 1. expose the break flag ---------------------------------------------------
-- Appended as the LAST column so `create or replace` is legal and
-- v_team_week_scores (which selects named columns from this view) is unaffected.

create or replace view v_pick_scores as
select p.id,
       p.player_id,
       pl.name,
       pl.acca_team,
       coalesce(m.team_name, pl.acca_team) as team_name,
       p.gameweek_id,
       g.gw_date,
       g.season_id,
       s.kind as season_kind,
       p.method,
       p.team,
       p.second_team,
       p.odds,
       p.result,
       p.fixture_id,
       p.fixture_side,
       p.locked,
       p.submitted_at,
       p.submitted_by,
       tw.is_full_sweep and s.double_rule and not g.is_season_final as doubled,
       p.odds * case
                  when tw.is_full_sweep and s.double_rule and not g.is_season_final then 2
                  else 1
                end::numeric as effective_odds,
       case
         when p.result is null then null::integer
         when tw.is_full_sweep then 2
         when p.result = 1 then 1
         when p.method = 'N/A'::text then '-2'::integer
         else '-1'::integer
       end as form_value,
       g.is_international_break
from picks p
  join players pl on pl.id = p.player_id
  join gameweeks g on g.id = p.gameweek_id
  join seasons s on s.id = g.season_id
  left join season_team_members m on m.season_id = g.season_id and m.player_id = p.player_id
  join v_team_weeks tw on tw.gameweek_id = p.gameweek_id
                      and tw.team_name = coalesce(m.team_name, pl.acca_team);

-- 2. leaderboard(range_start, range_end, p_exclude_breaks) -------------------
-- Dropped and recreated rather than overloaded, so only one definition exists.

drop function if exists leaderboard(date, date);

create function leaderboard(
  range_start date,
  range_end date,
  p_exclude_breaks boolean default false
)
returns table(player_id uuid, name text, acca_team text, entries bigint, wins bigint,
              win_pct numeric, avg_odds numeric, avg_win_odds numeric, avg_loss_odds numeric,
              last_win date, last_loss date, days_since_win integer, win_streak bigint,
              form bigint, bonus numeric, minus numeric, score numeric, score_per_match numeric)
language sql
stable
set search_path to 'public'
as $function$
with pr as (
  select * from v_pick_scores
  where gw_date between range_start and range_end
    and season_kind <> 'test'
    and result is not null
    and (not p_exclude_breaks or not is_international_break)
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
    and (not p_exclude_breaks or not g.is_international_break)
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
$function$;

grant execute on function leaderboard(date, date, boolean) to authenticated, service_role;

-- 3. team_leaderboard(range_start, range_end, p_exclude_breaks) --------------

drop function if exists team_leaderboard(date, date);

create function team_leaderboard(
  range_start date,
  range_end date,
  p_exclude_breaks boolean default false
)
returns table(acca_team text, entries bigint, wins bigint, win_pct numeric,
              avg_odds numeric, sweeps bigint, score numeric, score_per_match numeric)
language sql
stable
set search_path to 'public'
as $function$
with pr as (
  select * from v_pick_scores
  where gw_date between range_start and range_end
    and season_kind <> 'test'
    and result is not null
    and (not p_exclude_breaks or not is_international_break)
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
    and (not p_exclude_breaks or not g.is_international_break)
  group by 1
),
sweeps as (
  select tw.team_name as team, count(*) as n
  from v_team_weeks tw
  join gameweeks g on g.id = tw.gameweek_id
  join seasons s on s.id = g.season_id
  where tw.is_full_sweep
    and s.kind <> 'test'
    and tw.team_name in (select id from acca_teams)
    and g.gw_date between range_start and range_end
    and (not p_exclude_breaks or not g.is_international_break)
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
left join sweeps sw on sw.team = pr.acca_team
group by pr.acca_team
$function$;

grant execute on function team_leaderboard(date, date, boolean) to authenticated, service_role;
