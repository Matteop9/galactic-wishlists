-- Rules become data: admins edit them in-app, and the audit trigger records
-- every change (old/new row, actor, IP, UA) like any other admin write.
-- Seeded from the Season 26/27 agreement; the History section is NOT here —
-- it renders from honours + season_history.

create table milkybay.rules_sections (
  id uuid primary key default gen_random_uuid(),
  sort int not null,
  title text not null,
  items text[] not null
);
alter table milkybay.rules_sections enable row level security;
grant select on milkybay.rules_sections to authenticated;
grant insert, update, delete on milkybay.rules_sections to authenticated;
grant all on milkybay.rules_sections to service_role;
revoke all on milkybay.rules_sections from anon;
create policy mb_read_rules on milkybay.rules_sections for select to authenticated using (milkybay.is_player());
create policy mb_admin_write_rules on milkybay.rules_sections for all to authenticated
  using (milkybay.is_admin()) with check (milkybay.is_admin());

create trigger mb_audit_rules after insert or update or delete on milkybay.rules_sections
  for each row execute function milkybay.audit();

insert into milkybay.rules_sections (sort, title, items) values
(1, '1 · Bets & deadlines', array[
  'Bets open Wednesday 6:00pm — exclusively for the bottom of the leaderboard. Everyone else from 6:05pm.',
  'All bets in by Thursday 8:00pm (in the group chat — the app is the record).',
  'No bet = −1 point and no points that round. Miss both accas = −2.']),
(2, '2 · Selections', array[
  'W acca: minimum odds 1.50, must qualify for Bet365 early payout.',
  'Random acca: minimum odds 1.70. Not a straight win on its own — but a win can be combined with another selection.']),
(3, '3 & 8 · Points', array[
  'A winning pick earns its decimal odds (1.90 pick → 1.9 points).',
  'Points are capped at 2.50 per pick. Maximum odds: unlimited.']),
(4, '4 · Letting the acca down', array[
  'If your pick is the ONLY losing selection in an acca: penalty −1 × your odds (uncapped).']),
(5, '5 · Proof of bets', array[
  'When an acca wins, show proof on request — minimum £2.50 stake, matching everyone''s selections.',
  'No proof = −1 point per bet not placed (recorded as an adjustment).']),
(6, '6 · Mini league', array[
  'Runs for the first 6 weekends, until Jersey weekend.',
  'Mini league loser takes a forfeit (TBC).']),
(7, '7 · The meal', array[
  'Season end: everyone attends. Max spend £400.',
  'Split: loser 45% · 4th 30% · 3rd 15% · 2nd 10%. Overspend split between 3rd, 4th and 5th.',
  'The winner picks the loser''s hat, the venue, and everyone''s attire.']),
(8, '9 · Voids', array[
  'Postponed / cancelled / abandoned match: 0 points, even if replayed later. No minus points to anyone else.',
  'Abandoned before the deadline: you may re-pick in time.',
  'A voided leg of a bet builder voids the whole selection — 0 points.']),
(9, '10 · Odds drops', array[
  'If your odds drop below the minimum before Thursday 8pm you may change the pick.',
  'Nobody is obliged to warn you. No re-selection = 0 points, and minus points still apply if it loses.']);
