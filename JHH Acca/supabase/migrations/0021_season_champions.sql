-- 0021 — season champions: gold (individual season winner) and silver
-- (winning-team member) stars, computed from the canonical scoring functions.
--
-- League seasons only. A season counts as complete when its end_date has
-- passed, it has at least one settled gameweek, and no gameweek is still
-- scheduled/open/closed — so nothing is awarded mid-season or to empty seasons.
--
-- Gold is all-time; silver only from Season 5 (start 2025-08-16) onwards —
-- Seasons 1–4 predate the real VDL/JHP team structure (labels there are a
-- retrospective backfill, see docs/score-reconciliation.md).
--
-- Ties: every rank-1 row gets the star. Rules §5's real-life tie-breaker
-- round can be recorded as a Bonus adjustment, which then breaks the tie here.
--
-- Silver reuses team_leaderboard (not a per-player sum) so team-level
-- adjustments (player_id is null) are included. Season date ranges are
-- disjoint, so team_leaderboard(start_date, end_date) isolates one season.

create function season_champions()
returns table (
  season_id uuid,
  season_name text,
  end_date date,
  star text,            -- 'gold' | 'silver'
  player_id uuid,
  player_name text
)
language sql
stable
set search_path to 'public'
as $function$
with done as (
  select s.id, s.name, s.start_date, s.end_date
  from seasons s
  where s.kind = 'league'
    and s.end_date < current_date
    and exists (select 1 from gameweeks g
                where g.season_id = s.id and g.status = 'settled')
    and not exists (select 1 from gameweeks g
                    where g.season_id = s.id
                      and g.status in ('scheduled', 'open', 'closed'))
),
indiv as (
  select d.id, d.name, d.end_date,
         sl.player_id, sl.name as player_name,
         rank() over (partition by d.id order by sl.score desc) as rnk
  from done d
  cross join lateral season_leaderboard(d.id) sl
),
team as (
  select d.id, d.name, d.end_date, tl.acca_team,
         rank() over (partition by d.id order by tl.score desc) as rnk
  from done d
  cross join lateral team_leaderboard(d.start_date, d.end_date) tl
  where d.start_date >= date '2025-08-16'  -- VDL/JHP era: Season 5 onwards
)
select id, name, end_date, 'gold', player_id, player_name
from indiv
where rnk = 1
union all
select t.id, t.name, t.end_date, 'silver', p.id, p.name
from team t
join players p on p.acca_team = t.acca_team
where t.rnk = 1
order by 3, 4, 6
$function$;

grant execute on function season_champions() to authenticated, service_role;
revoke execute on function season_champions() from anon;
