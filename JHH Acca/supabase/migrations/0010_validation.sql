-- VALIDATION GATE (spec section 2): the import is only accepted if the
-- scoring layer reproduces the workbook exactly. A failure here fails the
-- migration - do not proceed past it.

do $$
declare
  n bigint;
  v numeric;
begin
  select count(*) into n from picks;
  if n <> 1287 then raise exception 'pick count %, want 1287', n; end if;

  select count(*) into n from gameweeks where status = 'settled';
  if n <> 108 then raise exception 'settled gameweek count %, want 108', n; end if;

  -- Strongest check in the build: the scoring function must reproduce the
  -- sheet's as-entered (pre-doubled) odds on every single row. This proves
  -- sweep detection, the double_rule gate, and the x2 composition at once,
  -- including the 18 doubled rows and the two pre-rule 6/6 weeks.
  select count(*) into n
  from v_pick_scores vs
  join seed_stage st on st.gw_date = vs.gw_date and st.player = vs.name
  where vs.effective_odds <> st.odds_scored;
  if n <> 0 then
    raise exception '% rows where effective_odds <> odds_scored', n;
  end if;

  -- All-time individual gate figures (score-reconciliation.md)
  select round(score, 4) into v
  from leaderboard('2023-01-01', '2100-01-01') where name = 'George';
  if v <> 119.7279 then raise exception 'George score %, want 119.7279', v; end if;

  select entries into n from leaderboard('2023-01-01', '2100-01-01') where name = 'George';
  if n <> 108 then raise exception 'George entries %, want 108', n; end if;
  select wins into n from leaderboard('2023-01-01', '2100-01-01') where name = 'George';
  if n <> 66 then raise exception 'George wins %, want 66', n; end if;

  select round(score, 4) into v from leaderboard('2023-01-01', '2100-01-01') where name = 'Ausy';
  if v <> 118.5773 then raise exception 'Ausy score %, want 118.5773', v; end if;

  select round(score, 4) into v from leaderboard('2023-01-01', '2100-01-01') where name = 'Matteo';
  if v <> 101.8621 then raise exception 'Matteo score %, want 101.8621', v; end if;

  select entries into n from leaderboard('2023-01-01', '2100-01-01') where name = 'Luke';
  if n <> 99 then raise exception 'Luke entries %, want 99 (joined Season 2)', n; end if;

  -- Team gate figures
  select round(score, 4) into v from team_leaderboard('2023-01-01', '2100-01-01') where acca_team = 'VDL';
  if v <> 656.4740 then raise exception 'VDL score %, want 656.4740', v; end if;

  select round(score, 4) into v from team_leaderboard('2023-01-01', '2100-01-01') where acca_team = 'JHP';
  if v <> 599.2911 then raise exception 'JHP score %, want 599.2911', v; end if;

  -- Season 6 spot checks (spec section 9 step 2)
  select round(score, 2) into v from leaderboard('2026-01-01', '2026-05-30') where name = 'Henry';
  if v <> 28.65 then raise exception 'Henry S6 score %, want 28.65', v; end if;

  select wins into n from leaderboard('2026-01-01', '2026-05-30') where name = 'Will';
  if n <> 16 then raise exception 'Will S6 wins %, want 16', n; end if;

  select round(score, 2) into v from leaderboard('2026-01-01', '2026-05-30') where name = 'Matt';
  if v <> 13.83 then raise exception 'Matt S6 score %, want 13.83', v; end if;

  raise notice 'VALIDATION GATE PASSED';
end
$$;
