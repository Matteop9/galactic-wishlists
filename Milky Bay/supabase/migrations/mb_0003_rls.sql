-- RLS + grants. A hand-created schema has NO default PostgREST grants (unlike
-- public), so table privileges are granted explicitly here and anon is locked
-- out entirely. Reads require a CLAIMED milkybay player; writes are own-row
-- (picks) or admin. result/void/locked/stamps are physically un-writable via
-- the API — settlement goes through settle_pick.

alter table milkybay.players enable row level security;
alter table milkybay.seasons enable row level security;
alter table milkybay.gameweeks enable row level security;
alter table milkybay.picks enable row level security;
alter table milkybay.adjustments enable row level security;
alter table milkybay.honours enable row level security;
alter table milkybay.app_config enable row level security;
alter table milkybay.audit_log enable row level security;

grant select on all tables in schema milkybay to authenticated;
grant all on all tables in schema milkybay to service_role;
revoke all on all tables in schema milkybay from anon;
alter default privileges in schema milkybay grant all on tables to service_role;

-- Functions: strip the PUBLIC-execute default, then re-grant per function in
-- mb_0005 (auth RPCs) and below. Cron/internal functions stay unreachable.
alter default privileges in schema milkybay revoke execute on functions from public;
revoke execute on all functions in schema milkybay from anon, authenticated, public;

grant execute on function milkybay.settle_pick(uuid, smallint, text) to authenticated;
grant execute on function milkybay.lock_pick(uuid, boolean) to authenticated;
grant execute on function milkybay.set_gameweek_status(uuid, text) to authenticated;
grant execute on function milkybay.create_gameweek(date, uuid) to authenticated;
-- current_player_id/is_player/is_admin/window_open/uk_ts are called from RLS
-- policies and other definers, which run as the function owner — but the
-- picks policies also evaluate them as the calling role, so:
grant execute on function milkybay.current_player_id() to authenticated;
grant execute on function milkybay.is_player() to authenticated;
grant execute on function milkybay.is_admin() to authenticated;
grant execute on function milkybay.window_open(uuid) to authenticated;

-- Player-readable reference data
create policy mb_read_players on milkybay.players for select to authenticated using (milkybay.is_player());
create policy mb_read_seasons on milkybay.seasons for select to authenticated using (milkybay.is_player());
create policy mb_read_gameweeks on milkybay.gameweeks for select to authenticated using (milkybay.is_player());
create policy mb_read_picks on milkybay.picks for select to authenticated using (milkybay.is_player());
create policy mb_read_adjustments on milkybay.adjustments for select to authenticated using (milkybay.is_player());
create policy mb_read_honours on milkybay.honours for select to authenticated using (milkybay.is_player());
create policy mb_read_app_config on milkybay.app_config for select to authenticated using (milkybay.is_player());

-- Admin-managed tables
create policy mb_admin_write_seasons on milkybay.seasons for all to authenticated
  using (milkybay.is_admin()) with check (milkybay.is_admin());
create policy mb_admin_write_gameweeks on milkybay.gameweeks for all to authenticated
  using (milkybay.is_admin()) with check (milkybay.is_admin());
create policy mb_admin_write_adjustments on milkybay.adjustments for all to authenticated
  using (milkybay.is_admin()) with check (milkybay.is_admin());
create policy mb_admin_write_honours on milkybay.honours for all to authenticated
  using (milkybay.is_admin()) with check (milkybay.is_admin());
create policy mb_admin_write_app_config on milkybay.app_config for all to authenticated
  using (milkybay.is_admin()) with check (milkybay.is_admin());

-- audit_log: admins read; nobody writes via the API (trigger runs as owner)
create policy mb_audit_admin_read on milkybay.audit_log for select to authenticated
  using (milkybay.is_admin());
revoke insert, update, delete on milkybay.audit_log from authenticated;

-- players: read-only via the API; management is SQL/RPC (register/link/unlink)
revoke insert, update, delete on milkybay.players from authenticated;

-- picks: column grants stop clients touching result/void_reason/is_no_pick/
-- locked or the submitted_* stamps. Own-row while the window is open; admins
-- any time (late transcription is the admins' whole job here).
revoke insert, update, delete on milkybay.picks from authenticated;
grant insert (gameweek_id, player_id, acca_kind, game, selection, odds, odds_display)
  on milkybay.picks to authenticated;
grant update (game, selection, odds, odds_display) on milkybay.picks to authenticated;

create policy mb_picks_insert on milkybay.picks for insert to authenticated
  with check (
    milkybay.is_admin()
    or (player_id = milkybay.current_player_id() and milkybay.window_open(gameweek_id))
  );

create policy mb_picks_update on milkybay.picks for update to authenticated
  using (
    milkybay.is_admin()
    or (player_id = milkybay.current_player_id()
        and milkybay.window_open(gameweek_id)
        and result is null
        and not locked)
  )
  with check (
    milkybay.is_admin()
    or (player_id = milkybay.current_player_id() and milkybay.window_open(gameweek_id))
  );

create policy mb_picks_admin_delete on milkybay.picks for delete to authenticated
  using (milkybay.is_admin());

-- seasons/gameweeks/adjustments/honours/app_config writes ride the admin
-- policies above but still need the table privilege:
grant insert, update, delete on milkybay.seasons to authenticated;
grant insert, update, delete on milkybay.gameweeks to authenticated;
grant insert, update, delete on milkybay.adjustments to authenticated;
grant insert, update, delete on milkybay.honours to authenticated;
grant insert, update, delete on milkybay.app_config to authenticated;
