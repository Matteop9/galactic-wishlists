-- Seed: the five members (+ Matteo as non-playing admin), season 25/26,
-- gameweek 1 with the real picks and results from the group chat, and the
-- pre-app honours (crowns / wooden spoons). Applied BEFORE the triggers
-- (mb_0008) so seeded rows keep hand-set stamps and the audit log starts
-- clean — same convention as JHH 0008/0009.

insert into milkybay.players (name, is_admin, plays) values
  ('Harry',  true,  true),
  ('Luke',   true,  true),
  ('Tim',    false, true),
  ('Sandy',  false, true),
  ('Liam',   false, true),
  ('Matteo', true,  false);

insert into milkybay.seasons (name, start_date, end_date, mini_league_gws)
values ('25/26', date '2026-08-09', date '2027-05-24', 6);

-- GW1: Saturday 2026-08-15 weekend, already played and settled.
insert into milkybay.gameweeks (season_id, gw_date, window_opens, window_closes, status)
select s.id, date '2026-08-15',
       milkybay.uk_ts(date '2026-08-12', '12:00'),
       milkybay.uk_ts(date '2026-08-15', '23:59'),
       'settled'
from milkybay.seasons s where s.name = '25/26';

with gw as (select id from milkybay.gameweeks where gw_date = date '2026-08-15'),
     pl as (select id, name from milkybay.players)
insert into milkybay.picks
  (gameweek_id, player_id, acca_kind, game, selection, odds, odds_display, result,
   submitted_at)
select gw.id, pl.id, v.kind, v.game, v.selection, v.odds, v.odds_display, v.result,
       milkybay.uk_ts(date '2026-08-13', '19:00')
from gw, pl
join (values
  -- name    kind      game                              selection                          odds  display  result
  ('Sandy',  'W',      null,                             'Midtjylland',                     1.69, null,    0),
  ('Sandy',  'random', 'Watford v Southampton',          'BTTS, O2 goals, Saints corners',  1.72, null,    1),
  ('Harry',  'W',      null,                             'Mallorca',                        1.66, null,    1),
  ('Harry',  'random', 'PSV',                            'PSV win, O1 goals, O5 corners',   1.70, null,    1),
  ('Luke',   'W',      null,                             'Villarreal',                      2.25, null,    0),
  ('Luke',   'random', 'Sheffield United v Birmingham',  'BTTS',                            1.72, null,    0),
  ('Tim',    'W',      null,                             'West Ham',                        2.30, null,    1),
  ('Tim',    'random', 'Norwich v West Brom',            'BTTS',                            1.80, '4/5',   1),
  ('Liam',   'W',      null,                             'Huddersfield',                    1.61, null,    1),
  ('Liam',   'random', 'PSG',                            'O1 PSG goal',                     1.72, null,    0)
) as v(name, kind, game, selection, odds, odds_display, result)
  on v.name = pl.name;

-- Pre-app honours (nicknames confirmed: Gloves = Luke, Blacks = Liam).
-- 22/23 was a half season -> half crown.
insert into milkybay.honours (season_label, player_id, award, notes)
select v.label, p.id, v.award, v.notes
from (values
  ('22/23', 'Luke',  'half_season_winner', 'Won as Gloves (half season)'),
  ('22/23', 'Sandy', 'wooden_spoon',       null),
  ('23/24', 'Tim',   'winner',             null),
  ('23/24', 'Liam',  'wooden_spoon',       'Last as Blacks'),
  ('24/25', 'Harry', 'winner',             null),
  ('24/25', 'Luke',  'wooden_spoon',       'Last as Gloves')
) as v(label, name, award, notes)
join milkybay.players p on p.name = v.name;
