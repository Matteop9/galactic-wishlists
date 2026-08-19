-- Scoring. Everything derives from v_pick_scores, which computes a per-pick
-- `points` column so every leaderboard is a plain sum:
--
--   win            -> least(odds, 2.50)          (rules §3 + §8 cap)
--   loss           -> 0, UNLESS sole loser of that week's acca (per kind,
--                     among real non-void picks) -> -odds, uncapped (§4;
--                     group confirmed the cap does NOT apply to the penalty)
--   no pick        -> -1 per missed acca (§1)
--   void           -> 0, no knock-ons (§9) — and excluded from the sole-loser
--                     count, since a void leg was never part of the acca
--   unsettled      -> null; a LOSS also stays null until every leg of that
--                     acca is settled, because "sole loser" is undecidable
--                     mid-settlement.

create view milkybay.v_pick_scores with (security_invoker = on) as
with scored as (
  select p.*,
         count(*) filter (where p.result = 0 and p.void_reason is null and not p.is_no_pick)
           over (partition by p.gameweek_id, p.acca_kind) as real_losers,
         bool_and(p.result is not null)
           over (partition by p.gameweek_id, p.acca_kind) as kind_settled
  from milkybay.picks p
)
select s.id, s.player_id, pl.name, s.gameweek_id, g.gw_date, g.season_id,
       s.acca_kind, s.game, s.selection, s.odds, s.odds_display,
       s.result, s.void_reason, s.is_no_pick, s.locked, s.submitted_at, s.submitted_by,
       least(s.odds, 2.50) as capped_odds,
       (s.result = 0 and s.void_reason is null and not s.is_no_pick
        and s.real_losers = 1 and s.kind_settled) as sole_loser,
       case
         when s.result is null then null
         when s.void_reason is not null then 0
         when s.is_no_pick then -1
         when s.result = 1 then least(s.odds, 2.50)
         when not s.kind_settled then null
         when s.real_losers = 1 then -s.odds
         else 0
       end as points
from scored s
join milkybay.players pl on pl.id = s.player_id
join milkybay.gameweeks g on g.id = s.gameweek_id;

grant select on milkybay.v_pick_scores to authenticated;

create view milkybay.v_player_weeks with (security_invoker = on) as
select player_id, name, gameweek_id, gw_date, season_id,
       sum(points) as week_points,
       count(*) filter (where result = 1) as wins,
       bool_or(sole_loser) as had_sole_loss,
       count(*) filter (where is_no_pick) as no_picks
from milkybay.v_pick_scores
group by 1, 2, 3, 4, 5;

grant select on milkybay.v_player_weeks to authenticated;

-- The one leaderboard. Season, Mini League (first N gameweeks) and All Time
-- are all this function with different ranges.
create or replace function milkybay.leaderboard(range_start date, range_end date)
returns table (
  player_id uuid, name text,
  entries bigint, wins bigint, win_pct numeric, avg_odds numeric,
  sole_losses bigint, no_picks bigint,
  bonus numeric, minus numeric, score numeric
)
language sql stable set search_path = milkybay as
$$
  with pr as (
    select * from v_pick_scores
    where gw_date between range_start and range_end
      and points is not null
  ),
  adj as (
    select a.player_id,
           coalesce(sum(a.score) filter (where a.kind = 'Bonus'), 0) as bonus,
           coalesce(sum(a.score) filter (where a.kind = 'Minus'), 0) as minus
    from adjustments a
    join gameweeks g on g.id = a.gameweek_id
    where a.player_id is not null
      and g.gw_date between range_start and range_end
    group by 1
  )
  select pl.id, pl.name,
         count(*) filter (where not pr.is_no_pick),
         count(*) filter (where pr.result = 1),
         round(100.0 * count(*) filter (where pr.result = 1)
               / nullif(count(*) filter (where not pr.is_no_pick), 0), 1),
         avg(pr.odds) filter (where not pr.is_no_pick),
         count(*) filter (where pr.sole_loser),
         count(*) filter (where pr.is_no_pick),
         coalesce(max(a.bonus), 0), coalesce(max(a.minus), 0),
         coalesce(sum(pr.points), 0) + coalesce(max(a.bonus), 0) + coalesce(max(a.minus), 0)
  from pr
  join players pl on pl.id = pr.player_id
  left join adj a on a.player_id = pr.player_id
  group by pl.id, pl.name
$$;

grant execute on function milkybay.leaderboard(date, date) to authenticated;

-- Honours rollup for the crown / half-crown / wooden-spoon emblems.
create view milkybay.v_honours with (security_invoker = on) as
select player_id,
       count(*) filter (where award = 'winner') as crowns,
       count(*) filter (where award = 'half_season_winner') as half_crowns,
       count(*) filter (where award = 'wooden_spoon') as spoons,
       array_agg(season_label || ' ' || award order by season_label) as detail
from milkybay.honours
group by 1;

grant select on milkybay.v_honours to authenticated;
