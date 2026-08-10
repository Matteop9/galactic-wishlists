-- Username + password auth (user decision): the group is fixed, so players
-- pick their name from the unclaimed list, choose a username/password and a
-- shared group code. Auth users are created server-side (GoTrue verifies
-- bcrypt), signed in as <username>@players.jhh-acca.app. No email, no magic
-- links, no redirect-URL config. Admin gets reset/unlink for recovery.

create extension if not exists pgcrypto schema extensions;

insert into app_config (key, value) values ('join_code', '"ACCA2627"')
on conflict (key) do nothing;

-- Who can still be claimed (name picker on the join screen; anon-callable,
-- exposes nothing but first names the group already knows).
create or replace function unclaimed_players()
returns table (id uuid, name text, acca_team text)
language sql stable security definer set search_path = public as
$$ select id, name, acca_team from players where auth_user_id is null order by name $$;
grant execute on function unclaimed_players() to anon, authenticated;

create or replace function register_player(p_player uuid, p_username text, p_password text, p_code text)
returns text
language plpgsql security definer set search_path = public, extensions as
$$
declare
  uname text := lower(trim(p_username));
  em text;
  uid uuid := gen_random_uuid();
  expected_code text;
begin
  select value #>> '{}' into expected_code from app_config where key = 'join_code';
  if expected_code is null or lower(trim(p_code)) <> lower(expected_code) then
    raise exception 'Wrong group code — ask the group chat';
  end if;
  if uname !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'Username must be 3-20 characters: letters, numbers or underscores';
  end if;
  if length(p_password) < 8 then
    raise exception 'Password must be at least 8 characters';
  end if;
  if not exists (select 1 from players where id = p_player and auth_user_id is null) then
    raise exception 'That name is already claimed';
  end if;
  em := uname || '@players.jhh-acca.app';
  if exists (select 1 from auth.users where email = em) then
    raise exception 'Username already taken';
  end if;

  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                          created_at, updated_at, confirmation_token, recovery_token,
                          email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
          em, extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}',
          jsonb_build_object('username', uname),
          now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider,
                               last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text,
          jsonb_build_object('sub', uid::text, 'email', em, 'email_verified', true),
          'email', now(), now(), now());

  update players set auth_user_id = uid where id = p_player;
  return em;
end
$$;
grant execute on function register_player(uuid, text, text, text) to anon, authenticated;

-- Recovery without email: admin resets a password or frees the name so the
-- player can re-register. Both audited via the players trigger / RPC writes.
create or replace function admin_reset_password(p_player uuid, p_password text)
returns void
language plpgsql security definer set search_path = public, extensions as
$$
declare uid uuid;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  if length(p_password) < 8 then raise exception 'Password must be at least 8 characters'; end if;
  select auth_user_id into uid from players where id = p_player;
  if uid is null then raise exception 'Player has no account'; end if;
  update auth.users
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
         updated_at = now()
   where id = uid;
end
$$;

create or replace function admin_unlink_player(p_player uuid)
returns void
language plpgsql security definer set search_path = public as
$$
declare uid uuid;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  select auth_user_id into uid from players where id = p_player;
  if uid is null then raise exception 'Player has no account'; end if;
  update players set auth_user_id = null where id = p_player;
  delete from auth.identities where user_id = uid;
  delete from auth.users where id = uid;
end
$$;
grant execute on function admin_reset_password(uuid, text) to authenticated;
grant execute on function admin_unlink_player(uuid) to authenticated;

-- Show usernames on the admin accounts list.
create or replace function admin_player_accounts()
returns table (player_id uuid, username text, created_at timestamptz)
language sql stable security definer set search_path = public as
$$
  select p.id, u.raw_user_meta_data ->> 'username', u.created_at
  from players p
  join auth.users u on u.id = p.auth_user_id
  where is_admin()
$$;
grant execute on function admin_player_accounts() to authenticated;
