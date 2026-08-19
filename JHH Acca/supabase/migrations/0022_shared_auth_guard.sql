-- 0022 — shared-auth guard. Milky Bay (schema `milkybay`, same project) links
-- its players to the SAME auth.users rows as The Acca, so deleting the auth
-- user on unlink would destroy the person's login in the other app.
-- admin_unlink_player now only deletes the auth user when no milkybay player
-- references it. (milkybay.admin_unlink_player carries the mirror guard.)
--
-- NB: admin_reset_password intentionally keeps resetting the shared password —
-- it is one account across both apps.

create or replace function public.admin_unlink_player(p_player uuid)
returns void
language plpgsql security definer set search_path = public as
$$
declare uid uuid;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  select auth_user_id into uid from players where id = p_player;
  if uid is null then raise exception 'Player has no account'; end if;
  update players set auth_user_id = null where id = p_player;
  if not exists (select 1 from milkybay.players where auth_user_id = uid) then
    delete from auth.identities where user_id = uid;
    delete from auth.users where id = uid;
  end if;
end
$$;
