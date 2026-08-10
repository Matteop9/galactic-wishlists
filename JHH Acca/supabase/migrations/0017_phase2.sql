-- Phase 2 (applied 2026-08-10 as `phase2_feedback_teams_jhp_test`):
-- feedback table, team-name canonicalisation, JHP test pairs.

-- 1) Feedback: any claimed player can submit; everyone can read; admins
-- manage status. Audited like every other mutable table.
create table feedback (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id),
  message text not null check (length(btrim(message)) > 0),
  status text not null default 'new' check (status in ('new', 'planned', 'done', 'dismissed')),
  created_at timestamptz not null default now()
);
alter table feedback enable row level security;
revoke all on feedback from anon;
revoke insert, update, delete on feedback from authenticated;
grant insert (player_id, message) on feedback to authenticated;
grant update (status) on feedback to authenticated;
grant delete on feedback to authenticated;
create policy feedback_read on feedback for select to authenticated using (is_player());
create policy feedback_insert on feedback for insert to authenticated
  with check (player_id = current_player_id());
create policy feedback_admin_update on feedback for update to authenticated
  using (is_admin()) with check (is_admin());
create policy feedback_admin_delete on feedback for delete to authenticated using (is_admin());
create trigger audit_feedback after insert or update or delete on feedback
  for each row execute function audit();

-- 2) Team-name canonicalisation. Historical picks only ever change their
-- team TEXT (odds/results untouched, so scoring is unaffected — the all-time
-- totals still reconcile to the workbook: VDL 656.4740 / JHP 599.2911).
-- The stamp trigger is disabled so submitted_at/submitted_by stay historical.
-- NB: supabase/seed/picks.csv keeps the original spellings — it is the record
-- of the import, not the canonical dataset.
alter table picks disable trigger picks_stamp;

with renames(old_name, new_name) as (values
  ('Athletico Madrid', 'Atletico Madrid'),
  ('Middlesborough', 'Middlesbrough'),
  ('Villareal', 'Villarreal'),
  ('Palmero', 'Palermo'),
  ('Ludogrets Razgrad', 'Ludogorets Razgrad'),
  ('Slovan Brastislava', 'Slovan Bratislava'),
  ('Sheff United', 'Sheffield United'),
  ('Hull City', 'Hull'),
  ('Colchester United', 'Colchester'),
  ('Cambridge United', 'Cambridge'),
  ('Preston North End', 'Preston'),
  ('Oxford', 'Oxford United'),
  ('Notts Forest', 'Nottingham Forest'),
  ('AFC Wimbledon', 'Wimbledon'),
  ('Betis', 'Real Betis'),
  ('Bayern', 'Bayern Munich'),
  ('Leverkusen', 'Bayer Leverkusen'),
  ('Leipzig', 'RB Leipzig'),
  ('Inter', 'Inter Milan'),
  ('Spurs', 'Tottenham'),
  ('FC Porto', 'Porto'),
  ('Sporting', 'Sporting Lisbon'),
  ('SK Sturm Graz', 'Sturm Graz'),
  ('Twente', 'FC Twente'),
  ('Utrecht', 'FC Utrecht'),
  ('Mjallby AIF', 'Mjallby'),
  ('SC Freiburg', 'Freiburg'),
  ('HSV', 'Hamburg'),
  ('Wolfsberg', 'Wolfsberger')
)
update picks p set team = r.new_name from renames r where p.team = r.old_name;

with renames(old_name, new_name) as (values
  ('Athletico Madrid', 'Atletico Madrid'),
  ('Middlesborough', 'Middlesbrough'),
  ('Villareal', 'Villarreal'),
  ('Palmero', 'Palermo'),
  ('Ludogrets Razgrad', 'Ludogorets Razgrad'),
  ('Slovan Brastislava', 'Slovan Bratislava'),
  ('Sheff United', 'Sheffield United'),
  ('Hull City', 'Hull'),
  ('Colchester United', 'Colchester'),
  ('Cambridge United', 'Cambridge'),
  ('Preston North End', 'Preston'),
  ('Oxford', 'Oxford United'),
  ('Notts Forest', 'Nottingham Forest'),
  ('AFC Wimbledon', 'Wimbledon'),
  ('Betis', 'Real Betis'),
  ('Bayern', 'Bayern Munich'),
  ('Leverkusen', 'Bayer Leverkusen'),
  ('Leipzig', 'RB Leipzig'),
  ('Inter', 'Inter Milan'),
  ('Spurs', 'Tottenham'),
  ('FC Porto', 'Porto'),
  ('Sporting', 'Sporting Lisbon'),
  ('SK Sturm Graz', 'Sturm Graz'),
  ('Twente', 'FC Twente'),
  ('Utrecht', 'FC Utrecht'),
  ('Mjallby AIF', 'Mjallby'),
  ('SC Freiburg', 'Freiburg'),
  ('HSV', 'Hamburg'),
  ('Wolfsberg', 'Wolfsberger')
)
update picks p set second_team = r.new_name from renames r where p.second_team = r.old_name;

update picks set team = btrim(team) where team <> btrim(team);
update picks set second_team = btrim(second_team)
  where second_team is not null and second_team <> btrim(second_team);

alter table picks enable trigger picks_stamp;

-- 3) JHP Test Weekend pairs (Team 4-6), same sandbox gameweek as the VDL
-- pairs. required_legs resolves to 2 per pair, so 2/2 sweeps double. If JHP
-- sit it out they only collect sandbox no-picks, which never touch real stats.
insert into season_team_members (season_id, team_name, player_id)
select s.id, t.team_name, p.id
from seasons s
cross join (values
  ('Team 4', 'Dom'),   ('Team 4', 'George'),
  ('Team 5', 'Harry'), ('Team 5', 'Matt'),
  ('Team 6', 'Sandy'), ('Team 6', 'Will')
) as t(team_name, player)
join players p on p.name = t.player
where s.name = 'Test Weekend'
on conflict do nothing;
