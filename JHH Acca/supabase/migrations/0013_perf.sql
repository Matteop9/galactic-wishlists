-- Performance: (1) wrap policy predicates in scalar subqueries so Postgres
-- evaluates is_player()/is_admin() ONCE per statement (InitPlan) instead of
-- per row - without this the scoring views time out under RLS; (2) simplify
-- team_leaderboard's sweep count, which recomputed v_pick_scores needlessly.

-- 1. Read policies
do $$
declare t text;
begin
  foreach t in array array['acca_teams','players','seasons','season_team_members',
                           'gameweeks','fixtures','picks','adjustments','disputes','app_config']
  loop
    execute format('drop policy read_%s on %s',
      case t when 'season_team_members' then 'stm' else t end, t);
    execute format(
      'create policy read_%s on %s for select to authenticated using ((select is_player()))',
      case t when 'season_team_members' then 'stm' else t end, t);
  end loop;
end
$$;

-- 2. Admin-write policies
do $$
declare t text;
begin
  foreach t in array array['acca_teams','seasons','season_team_members','gameweeks',
                           'fixtures','adjustments','app_config']
  loop
    execute format('drop policy admin_write_%s on %s',
      case t when 'season_team_members' then 'stm' else t end, t);
    execute format(
      'create policy admin_write_%s on %s for all to authenticated using ((select is_admin())) with check ((select is_admin()))',
      case t when 'season_team_members' then 'stm' else t end, t);
  end loop;
end
$$;

drop policy admin_claim_tokens on claim_tokens;
create policy admin_claim_tokens on claim_tokens for all to authenticated
  using ((select is_admin())) with check ((select is_admin()));

drop policy audit_admin_read on audit_log;
create policy audit_admin_read on audit_log for select to authenticated
  using ((select is_admin()));

drop policy llm_config_admin on llm_config;
create policy llm_config_admin on llm_config for all to authenticated
  using ((select is_admin())) with check ((select is_admin()));

drop policy llm_usage_admin_read on llm_usage;
create policy llm_usage_admin_read on llm_usage for select to authenticated
  using ((select is_admin()));

drop policy seed_stage_admin_read on seed_stage;
create policy seed_stage_admin_read on seed_stage for select to authenticated
  using ((select is_admin()));

-- Picks: keep row-dependent checks per row (they gate single-row writes) but
-- wrap the constant admin check.
drop policy picks_insert on picks;
create policy picks_insert on picks for insert to authenticated
  with check (
    ((select is_admin()) or same_team(player_id, gameweek_id))
    and window_open(gameweek_id)
  );

drop policy picks_update on picks;
create policy picks_update on picks for update to authenticated
  using (
    (select is_admin())
    or (same_team(player_id, gameweek_id)
        and window_open(gameweek_id)
        and result is null
        and not locked)
  )
  with check (
    (select is_admin())
    or (same_team(player_id, gameweek_id) and window_open(gameweek_id))
  );

drop policy picks_admin_delete on picks;
create policy picks_admin_delete on picks for delete to authenticated
  using ((select is_admin()));

drop policy players_self_pref on players;
create policy players_self_pref on players for update to authenticated
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));

drop policy disputes_insert on disputes;
create policy disputes_insert on disputes for insert to authenticated
  with check (raised_by = (select current_player_id()));

-- 3. team_leaderboard: sweep count without the nested view recomputation.
--    Real (VDL/JHP) sweeps only - ad-hoc test/special team sweeps are not
--    attributable to an acca team and test is excluded everywhere.
create or replace function team_leaderboard(range_start date, range_end date)
returns table (
  acca_team text, entries bigint, wins bigint, win_pct numeric,
  avg_odds numeric, sweeps bigint, score numeric, score_per_match numeric
)
language sql stable set search_path = public as
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
  select tw.team_name as team, count(*) as n
  from v_team_weeks tw
  join gameweeks g on g.id = tw.gameweek_id
  join seasons s on s.id = g.season_id
  where tw.is_full_sweep
    and s.kind <> 'test'
    and tw.team_name in (select id from acca_teams)
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
left join sweeps sw on sw.team = pr.acca_team
group by pr.acca_team
$$;
