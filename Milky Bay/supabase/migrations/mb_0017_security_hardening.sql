-- Security hardening (review 2026-08-25), milkybay schema.
-- Milky Bay's internal functions are already locked down (mb_0006 revoked them
-- from PUBLIC), so this only pins uk_ts's search_path and scopes the
-- app_config / feedback reads. Mirrors JHH 0023.

-- uk_ts had a role-mutable search_path (advisor 0011_function_search_path).
alter function milkybay.uk_ts(date, time without time zone) set search_path = milkybay;

-- join_code was readable by any linked player; restrict direct reads to admins.
-- register_player / link_player read it as SECURITY DEFINER (RLS-exempt), and
-- the client only reads app_config from the Admin page.
drop policy mb_read_app_config on milkybay.app_config;
create policy mb_read_app_config on milkybay.app_config
  for select to authenticated using (milkybay.is_admin());

-- Feedback was readable by every player; scope reads to the author and admins.
drop policy mb_read_feedback on milkybay.feedback;
create policy mb_read_feedback on milkybay.feedback
  for select to authenticated
  using (player_id = milkybay.current_player_id() or milkybay.is_admin());
