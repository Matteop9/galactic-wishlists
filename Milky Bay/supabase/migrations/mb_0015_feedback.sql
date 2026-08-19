-- Feedback queue (JHH pattern): submit from your profile, admins review and
-- set status in Admin. Audited like everything else.

create table milkybay.feedback (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references milkybay.players(id),
  message text not null,
  status text not null default 'new' check (status in ('new', 'planned', 'done', 'dismissed')),
  created_at timestamptz not null default now()
);
alter table milkybay.feedback enable row level security;
grant select on milkybay.feedback to authenticated;
grant all on milkybay.feedback to service_role;
revoke all on milkybay.feedback from anon;

create policy mb_read_feedback on milkybay.feedback for select to authenticated using (milkybay.is_player());
-- players insert as themselves; status changes are admin-only
revoke insert, update, delete on milkybay.feedback from authenticated;
grant insert (player_id, message) on milkybay.feedback to authenticated;
grant update (status) on milkybay.feedback to authenticated;
grant delete on milkybay.feedback to authenticated;
create policy mb_feedback_insert on milkybay.feedback for insert to authenticated
  with check (player_id = milkybay.current_player_id());
create policy mb_feedback_admin_update on milkybay.feedback for update to authenticated
  using (milkybay.is_admin()) with check (milkybay.is_admin());
create policy mb_feedback_admin_delete on milkybay.feedback for delete to authenticated
  using (milkybay.is_admin());

create trigger mb_audit_feedback after insert or update or delete on milkybay.feedback
  for each row execute function milkybay.audit();
