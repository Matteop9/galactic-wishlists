-- Auth. SHARED with The Acca: same auth.users, same synthetic-email domain
-- (@players.jhh-acca.app), so one login works in both apps. Two join paths:
--   * register_player — brand-new user, mints the auth user (JHH 0016 clone)
--   * link_player     — existing Acca user signs in with their usual
--                       credentials, then claims their Milky Bay player row
--                       with the group code (modeled on JHH claim_player)
-- admin_unlink_player only deletes the auth user when the OTHER schema no
-- longer references it (see JHH 0022 for the mirror-image guard).

-- Placeholder only. This repo is PUBLIC, so the real join code must NOT live
-- here — set it after deploy via Admin → Join code (app_config.join_code).
-- A fresh DB seeds an unusable placeholder so registration stays closed until
-- an admin sets the real code.
insert into milkybay.app_config (key, value) values ('join_code', '"CHANGE-ME-IN-ADMIN"')
on conflict (key) do nothing;

-- Includes non-playing admins: Matteo must be able to claim his own row
-- (fixed in mb_0010 after the original filtered on plays).
create or replace function milkybay.unclaimed_players()
returns table (id uuid, name text)
language sql stable security definer set search_path = milkybay as
$$ select id, name from players where auth_user_id is null order by name $$;
grant execute on function milkybay.unclaimed_players() to anon, authenticated;

create or replace function milkybay.register_player(p_player uuid, p_username text, p_password text, p_code text)
returns text
language plpgsql security definer set search_path = milkybay, extensions as
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
    raise exception 'That username already has an Acca account — choose "I have an Acca account" to sign in and link it';
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
grant execute on function milkybay.register_player(uuid, text, text, text) to anon, authenticated;

-- The link path: already signed in (Acca credentials), claim a Milky Bay name.
create or replace function milkybay.link_player(p_player uuid, p_code text)
returns uuid
language plpgsql security definer set search_path = milkybay as
$$
declare expected_code text;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select value #>> '{}' into expected_code from app_config where key = 'join_code';
  if expected_code is null or lower(trim(p_code)) <> lower(expected_code) then
    raise exception 'Wrong group code — ask the group chat';
  end if;
  if exists (select 1 from players where auth_user_id = auth.uid()) then
    raise exception 'This login is already linked to a Milky Bay player';
  end if;
  update players set auth_user_id = auth.uid()
   where id = p_player and auth_user_id is null;
  if not found then raise exception 'That name is already claimed'; end if;
  return p_player;
end
$$;
grant execute on function milkybay.link_player(uuid, text) to authenticated;

-- NB: resets the password for BOTH apps (it is one shared account).
create or replace function milkybay.admin_reset_password(p_player uuid, p_password text)
returns void
language plpgsql security definer set search_path = milkybay, extensions as
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
grant execute on function milkybay.admin_reset_password(uuid, text) to authenticated;

-- Unlink frees the Milky Bay name; the shared auth user is only deleted when
-- The Acca no longer references it either.
create or replace function milkybay.admin_unlink_player(p_player uuid)
returns void
language plpgsql security definer set search_path = milkybay as
$$
declare uid uuid;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  select auth_user_id into uid from players where id = p_player;
  if uid is null then raise exception 'Player has no account'; end if;
  update players set auth_user_id = null where id = p_player;
  if not exists (select 1 from public.players where auth_user_id = uid) then
    delete from auth.identities where user_id = uid;
    delete from auth.users where id = uid;
  end if;
end
$$;
grant execute on function milkybay.admin_unlink_player(uuid) to authenticated;

create or replace function milkybay.admin_player_accounts()
returns table (player_id uuid, username text, created_at timestamptz)
language sql stable security definer set search_path = milkybay as
$$
  select p.id, u.raw_user_meta_data ->> 'username', u.created_at
  from players p
  join auth.users u on u.id = p.auth_user_id
  where is_admin()
$$;
grant execute on function milkybay.admin_player_accounts() to authenticated;
