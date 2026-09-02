-- Feedback queue (The Acca / Milky Bay pattern, adapted): anyone submits from
-- Profile, an app admin triages in the same place. Purely additive — no
-- existing table, policy or grant is touched.

-- App-level admin, distinct from a group admin. Membership is service-role
-- only: `authenticated` has no insert/update path, so it cannot be granted
-- from the client. Add someone with:
--   insert into tenpins.app_admins (profile_id) values ('<profile uuid>');
create table tenpins.app_admins (
  profile_id uuid primary key references tenpins.profiles on delete cascade,
  created_at timestamptz not null default now()
);
alter table tenpins.app_admins enable row level security;
revoke all on tenpins.app_admins from anon, authenticated;
grant all on tenpins.app_admins to service_role;

-- Definer helper so policies (and the client, via rpc) can read admin status
-- without any table access to app_admins.
create or replace function tenpins.is_app_admin()
returns boolean
language sql stable security definer set search_path = tenpins
as $$
  select exists (select 1 from app_admins where profile_id = auth.uid());
$$;

revoke execute on function tenpins.is_app_admin() from anon, public;
grant execute on function tenpins.is_app_admin() to authenticated;

create table tenpins.feedback (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references tenpins.profiles on delete cascade,
  kind text not null default 'idea' check (kind in ('bug', 'idea', 'other')),
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  status text not null default 'new' check (status in ('new', 'planned', 'done', 'dismissed')),
  admin_note text check (admin_note is null or char_length(admin_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index feedback_profile_idx on tenpins.feedback (profile_id, created_at desc);
create index feedback_status_idx on tenpins.feedback (status, created_at desc);

alter table tenpins.feedback enable row level security;

revoke all on tenpins.feedback from anon, authenticated;
grant select on tenpins.feedback to authenticated;
-- Authors write only these columns; status/admin_note are the triage columns,
-- so even an admin can never rewrite what someone actually said.
grant insert (profile_id, kind, message) on tenpins.feedback to authenticated;
grant update (status, admin_note) on tenpins.feedback to authenticated;
grant delete on tenpins.feedback to authenticated;
grant all on tenpins.feedback to service_role;

-- Your own items, plus everything if you're an app admin. Direct owner check
-- leads so `insert … returning` keeps working (see the note in tp_0002).
create policy feedback_select on tenpins.feedback for select to authenticated
  using (profile_id = auth.uid() or tenpins.is_app_admin());
create policy feedback_insert on tenpins.feedback for insert to authenticated
  with check (profile_id = auth.uid());
create policy feedback_update on tenpins.feedback for update to authenticated
  using (tenpins.is_app_admin()) with check (tenpins.is_app_admin());
-- An author can withdraw an untriaged item; an admin can bin anything.
create policy feedback_delete on tenpins.feedback for delete to authenticated
  using ((profile_id = auth.uid() and status = 'new') or tenpins.is_app_admin());

create or replace function tenpins.touch_feedback()
returns trigger
language plpgsql set search_path = tenpins
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger feedback_touch before update on tenpins.feedback
  for each row execute function tenpins.touch_feedback();
