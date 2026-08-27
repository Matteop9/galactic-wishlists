-- Team logos, admin-editable at runtime (ported from JHH migrations 0025-0027,
-- shipped there as v0.9.0 — the three JHH migrations are folded into this one).
--
-- Crests for the W acca live in two build-time maps (src/lib/teams.ts CRESTS +
-- the copied src/lib/badges.ts), so a club nobody had thought of showed a
-- two-letter chip until someone edited code and redeployed. This table is the
-- live override layer that sits ON TOP of both, so Admin -> Team logos fixes a
-- missing crest in seconds.
--
-- Client resolution order (src/components/ui.tsx TeamBadge):
--   team_badges row -> CRESTS -> SDB_BADGES -> initials chip
-- A row with badge_url NULL means "deliberately no logo": the initials chip
-- still renders, but the name stops showing up in the admin's missing list.

create table milkybay.team_badges (
  team text primary key,
  badge_url text check (badge_url is null or badge_url ~ '^https://'),
  updated_at timestamptz not null default now(),
  updated_by uuid references milkybay.players(id)
);

alter table milkybay.team_badges enable row level security;
grant select on milkybay.team_badges to authenticated;
grant all on milkybay.team_badges to service_role;
revoke all on milkybay.team_badges from anon;

-- Writes are admin-only, and updated_at/updated_by are stamped server-side so
-- the client can never supply them.
revoke insert, update, delete on milkybay.team_badges from authenticated;
grant insert (team, badge_url) on milkybay.team_badges to authenticated;
-- `team` needs UPDATE as well as `badge_url`: PostgREST's upsert compiles to
--   insert ... on conflict (team) do update set team = excluded.team, ...
-- so a badge_url-only grant fails 42501 on every re-save of an existing
-- override (learned the hard way in JHH 0026). `team` stays admin-only by
-- policy, and an admin renaming a row is the delete+insert they already have.
grant update (team, badge_url) on milkybay.team_badges to authenticated;
grant delete on milkybay.team_badges to authenticated;

-- Everyone reads (crests render on every page); only admins write. The
-- (select ...) wrapper makes the predicate an InitPlan evaluated once per
-- statement rather than once per row — JHH learned this the expensive way
-- (its 0013), and it costs nothing here.
create policy mb_read_team_badges on milkybay.team_badges for select to authenticated
  using ((select milkybay.is_player()));
create policy mb_admin_write_team_badges on milkybay.team_badges for all to authenticated
  using ((select milkybay.is_admin())) with check ((select milkybay.is_admin()));

create or replace function milkybay.stamp_team_badge()
returns trigger
language plpgsql security definer set search_path = milkybay as
$$
begin
  new.updated_at := now();
  new.updated_by := current_player_id();
  return new;
end
$$;
revoke execute on function milkybay.stamp_team_badge() from anon, authenticated, public;

create trigger mb_team_badges_stamp before insert or update on milkybay.team_badges
  for each row execute function milkybay.stamp_team_badge();
create trigger mb_audit_team_badges after insert or update or delete on milkybay.team_badges
  for each row execute function milkybay.audit();

-- audit() derived row_id from an `id` column only, so this text-keyed table
-- would log null row_ids. Add `team` as a fallback; every table with an `id`
-- still short-circuits on it first, so nothing else changes. (JHH 0027.)
create or replace function milkybay.audit()
returns trigger
language plpgsql security definer set search_path = milkybay as
$$
declare
  hdrs jsonb;
  v_ip text;
  v_ua text;
  rid text;
begin
  begin
    hdrs := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    hdrs := null;
  end;
  if hdrs is not null then
    v_ip := nullif(trim(split_part(hdrs ->> 'x-forwarded-for', ',', 1)), '');
    v_ua := hdrs ->> 'user-agent';
  end if;
  rid := coalesce(
    case when tg_op = 'DELETE' then to_jsonb(old) ->> 'id' else to_jsonb(new) ->> 'id' end,
    case when tg_op = 'DELETE' then to_jsonb(old) ->> 'team' else to_jsonb(new) ->> 'team' end
  );
  insert into audit_log (action, table_name, row_id, old_row, new_row,
                         actor_auth, actor_player, ip, user_agent)
  values (
    tg_op, tg_table_name, rid,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end,
    auth.uid(), current_player_id(), v_ip, v_ua
  );
  return coalesce(new, old);
end
$$;
-- create or replace keeps the ACL, but re-issue the schema-wide revokes so it
-- can never quietly hand EXECUTE back to PUBLIC.
revoke execute on function milkybay.audit() from anon, authenticated, public;
