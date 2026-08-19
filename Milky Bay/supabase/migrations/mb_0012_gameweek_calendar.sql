-- Season 25/26 gameweek calendar (data migration, applied 2026-08-19).
-- The group's "25/26" season tracks the REAL Premier League 26/27 calendar:
-- one gameweek per weekend that has PL weekend football (Fri-Mon), sourced
-- from football-data.org /v4/competitions/PL/matches?season=2026.
--
-- Result: 34 gameweeks — GW1 Sat 2026-08-15 (pre-PL, played on European
-- fixtures, settled) + 33 PL weekends Sat 2026-08-22 .. Sat 2027-05-29.
-- Skipped (no PL weekend football): 2026-09-26, 2026-10-03, 2026-11-14,
-- 2027-01-09, 2027-02-13, 2027-03-06, 2027-03-27, 2027-04-03
-- (international breaks / FA Cup weekends / winter break).
-- Season end_date extended 2027-05-24 -> 2027-05-31: PL matchday 38 is
-- Sun 2027-05-30, later than the agreement's guessed end date.
--
-- NB: PL dates beyond ~matchday 9 are placeholder Saturdays until broadcast
-- picks are finalised; the WEEKEND grid is stable, but if a whole round ever
-- moves weekends, adjust with create_gameweek / set_gameweek_status (skipped).

update milkybay.seasons set end_date = date '2027-05-31' where name = '25/26';

insert into milkybay.gameweeks (season_id, gw_date, window_opens, window_closes)
select s.id, d,
       milkybay.uk_ts(d - 3, '12:00'),
       milkybay.uk_ts(d, '23:59')
from milkybay.seasons s
cross join unnest(array[
  date '2026-08-22', date '2026-08-29', date '2026-09-05', date '2026-09-12',
  date '2026-09-19', date '2026-10-10', date '2026-10-17', date '2026-10-24',
  date '2026-10-31', date '2026-11-07', date '2026-11-21', date '2026-11-28',
  date '2026-12-05', date '2026-12-12', date '2026-12-19', date '2026-12-26',
  date '2027-01-02', date '2027-01-16', date '2027-01-23', date '2027-01-30',
  date '2027-02-06', date '2027-02-20', date '2027-02-27', date '2027-03-13',
  date '2027-03-20', date '2027-04-10', date '2027-04-17', date '2027-04-24',
  date '2027-05-01', date '2027-05-08', date '2027-05-15', date '2027-05-22',
  date '2027-05-29'
]) d
where s.name = '25/26'
on conflict (gw_date) do nothing;
