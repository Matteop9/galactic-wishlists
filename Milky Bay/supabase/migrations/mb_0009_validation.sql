-- Validation gate (JHH 0010 pattern): assert the seeded week 1 scores match
-- the hand-computed values from the rules. Fails the migration loudly on any
-- mismatch — never ship a scoring layer that disagrees with the sheet.
--
-- Hand computation (points cap 2.50; both accas had TWO losers so no
-- sole-loser penalty fired):
--   Tim   2.30 + 1.80 = 4.10
--   Harry 1.66 + 1.70 = 3.36
--   Sandy 0    + 1.72 = 1.72
--   Liam  1.61 + 0    = 1.61
--   Luke  0    + 0    = 0.00

do $$
declare
  bad int;
begin
  select count(*) into bad
  from (values
    ('Tim',   4.10), ('Harry', 3.36), ('Sandy', 1.72), ('Liam', 1.61), ('Luke', 0.00)
  ) expected(name, score)
  join milkybay.players p on p.name = expected.name
  left join milkybay.leaderboard(date '2026-08-09', date '2027-05-24') lb
    on lb.player_id = p.id
  where coalesce(round(lb.score, 2), -999) <> expected.score;

  if bad > 0 then
    raise exception 'Week 1 validation FAILED: % player(s) mismatch the hand-computed scores', bad;
  end if;

  -- No sole-loser flags should exist in week 1
  if exists (select 1 from milkybay.v_pick_scores where sole_loser) then
    raise exception 'Week 1 validation FAILED: unexpected sole_loser flag';
  end if;

  -- Non-playing admin (Matteo) must have no picks and no leaderboard row
  if exists (
    select 1 from milkybay.leaderboard(date '2026-08-09', date '2027-05-24') lb
    join milkybay.players p on p.id = lb.player_id
    where not p.plays
  ) then
    raise exception 'Week 1 validation FAILED: non-playing player on the leaderboard';
  end if;

  raise notice 'Milky Bay week 1 validation passed';
end
$$;
