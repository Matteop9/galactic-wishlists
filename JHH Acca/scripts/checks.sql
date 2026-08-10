-- Re-runnable reconciliation checks (see docs/score-reconciliation.md).
-- Every query must return ZERO rows. Run any time to prove the ledger still
-- reproduces the workbook - e.g. after the Test Weekend, to prove test picks
-- never touched real stats.

-- 1. Full all-time table vs the reconciliation doc
with expected (name, entries, wins, score2, spm4) as (
  values ('George',108,66,119.73,1.1086),('Ausy',108,60,118.58,1.0979),
         ('Henry',108,61,117.95,1.0922),('Luke',99,59,105.23,1.0630),
         ('Fraser',108,56,110.56,1.0237),('Dom',108,60,102.76,0.9515),
         ('Tom',108,55,102.29,0.9471),('Matteo',108,56,101.86,0.9432),
         ('Matt',108,57,96.41,0.8927),('Sandy',108,57,95.50,0.8843),
         ('Will',108,53,94.05,0.8708),('Harry',108,51,90.84,0.8411)
)
select 'ALL-TIME MISMATCH' as problem, e.name
from expected e
join leaderboard('2023-01-01','2100-01-01') l on l.name = e.name
where l.entries <> e.entries or l.wins <> e.wins
   or round(l.score,2) <> e.score2 or round(l.score_per_match,4) <> e.spm4;

-- 2. Team totals (all-time; note these only hold exactly at 4dp BEFORE any
-- 2026/27 picks settle - afterwards compare against a '2023-01-01'..'2026-08-01' range)
select 'TEAM MISMATCH' as problem, acca_team
from team_leaderboard('2023-01-01','2026-08-09')
where (acca_team = 'VDL' and round(score,4) <> 656.4740)
   or (acca_team = 'JHP' and round(score,4) <> 599.2911);

-- 3. Per-row: scoring must reproduce the sheet's as-entered odds exactly
select 'EFFECTIVE ODDS MISMATCH' as problem, vs.gw_date, vs.name
from v_pick_scores vs
join seed_stage st on st.gw_date = vs.gw_date and st.player = vs.name
where vs.effective_odds <> st.odds_scored;

-- 4. Test isolation: no test-season pick may appear in any real output
select 'TEST LEAK' as problem, ps.name, ps.gw_date
from v_pick_scores ps
join seasons s on s.id = ps.season_id
where s.kind = 'test'
  and ps.gw_date between '2023-01-01' and '2100-01-01'
  and exists (
    select 1 from leaderboard('2023-01-01','2100-01-01') l
    where l.player_id = ps.player_id
      and l.entries <> (select count(*) from v_pick_scores x
                        where x.player_id = ps.player_id
                          and x.season_kind <> 'test' and x.result is not null)
  );
