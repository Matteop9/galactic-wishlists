-- Reference data: teams, the 12 players, all seasons (historic + 2026/27 +
-- Test Weekend), Test Weekend pairs, and the forward gameweek calendar.

insert into acca_teams (id) values ('VDL'), ('JHP');

insert into players (name, acca_team, is_admin) values
  ('Ausy',   'VDL', false),
  ('Fraser', 'VDL', false),
  ('Henry',  'VDL', false),
  ('Luke',   'VDL', false),
  ('Matteo', 'VDL', true),
  ('Tom',    'VDL', false),
  ('Dom',    'JHP', false),
  ('George', 'JHP', false),
  ('Harry',  'JHP', false),
  ('Matt',   'JHP', false),
  ('Sandy',  'JHP', false),
  ('Will',   'JHP', false);

-- double_rule: on from Season 5 (start >= 2025-08-16). The two 6/6 weeks in
-- Seasons 1-2 predate the rule and must not double.
insert into seasons (name, start_date, end_date, kind, double_rule) values
  ('Season 1',     '2023-11-04', '2023-12-30', 'league',  false),
  ('Season 2',     '2024-01-13', '2024-05-19', 'league',  false),
  ('Season 3',     '2024-08-17', '2024-12-26', 'league',  false),
  ('Season 4',     '2024-12-29', '2025-05-24', 'league',  false),
  ('Season 5',     '2025-08-16', '2025-12-27', 'league',  true),
  ('Season 6',     '2026-01-01', '2026-05-30', 'league',  true),
  ('World Cup 26', '2026-06-01', '2026-08-01', 'special', true),
  ('Test Weekend', '2026-08-15', '2026-08-15', 'test',    true),
  ('Season 7',     '2026-08-22', '2026-12-19', 'league',  true),
  ('Season 8',     '2027-01-02', '2027-05-22', 'league',  true);

-- Test Weekend pairs (drawn 10 Aug 2026, locked; names are placeholders the
-- pairs can rename via admin).
insert into season_team_members (season_id, team_name, player_id)
select s.id, t.team_name, p.id
from seasons s
cross join (values
  ('Team 1', 'Matteo'), ('Team 1', 'Henry'),
  ('Team 2', 'Fraser'), ('Team 2', 'Ausy'),
  ('Team 3', 'Tom'),    ('Team 3', 'Luke')
) as t(team_name, player)
join players p on p.name = t.player
where s.name = 'Test Weekend';

-- Test Weekend gameweek. is_season_final deliberately FALSE: a 2/2 pair
-- sweep must double, that's the point of the shakedown.
insert into gameweeks (season_id, gw_date, window_opens, window_closes, status, is_season_final, live_enabled)
select id, date '2026-08-15',
       uk_ts('2026-08-13', '18:00'), uk_ts('2026-08-14', '20:00'),
       'scheduled', false, true
from seasons where name = 'Test Weekend';

-- Season 7 + 8 Saturdays (group skip-votes remove weeks via admin later).
-- Final Saturday of each season is exempt from doubling per the 26/27 rules.
insert into gameweeks (season_id, gw_date, window_opens, window_closes, status, is_season_final)
select s.id, d::date,
       uk_ts(d::date - 2, '18:00'), uk_ts(d::date - 1, '20:00'),
       'scheduled', (d::date = s.end_date)
from seasons s
cross join lateral generate_series(s.start_date::timestamp, s.end_date::timestamp, interval '7 days') d
where s.name in ('Season 7', 'Season 8');

insert into app_config (key, value) values
  ('no_pick_form_penalty', '-2'),
  ('live_window', '{"day": 6, "start": "14:00", "end": "19:30"}');
