-- RLS: reads require a CLAIMED player (magic-link signup is open, so an
-- unclaimed account must see nothing). Writes are same-team (picks),
-- own-row (disputes), or admin. result/locked are physically un-writable
-- via the API - settlement goes through the settle_pick RPC.

alter table acca_teams enable row level security;
alter table players enable row level security;
alter table seasons enable row level security;
alter table season_team_members enable row level security;
alter table gameweeks enable row level security;
alter table fixtures enable row level security;
alter table picks enable row level security;
alter table adjustments enable row level security;
alter table disputes enable row level security;
alter table claim_tokens enable row level security;
alter table app_config enable row level security;
alter table audit_log enable row level security;

-- anon gets nothing at all
revoke all on all tables in schema public from anon;

-- Player-readable reference data
create policy read_acca_teams on acca_teams for select to authenticated using (is_player());
create policy read_players on players for select to authenticated using (is_player());
create policy read_seasons on seasons for select to authenticated using (is_player());
create policy read_stm on season_team_members for select to authenticated using (is_player());
create policy read_gameweeks on gameweeks for select to authenticated using (is_player());
create policy read_fixtures on fixtures for select to authenticated using (is_player());
create policy read_picks on picks for select to authenticated using (is_player());
create policy read_adjustments on adjustments for select to authenticated using (is_player());
create policy read_disputes on disputes for select to authenticated using (is_player());
create policy read_app_config on app_config for select to authenticated using (is_player());

-- Admin-managed tables (full-column writes, row-gated by is_admin)
create policy admin_write_acca_teams on acca_teams for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_write_seasons on seasons for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_write_stm on season_team_members for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_write_gameweeks on gameweeks for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_write_fixtures on fixtures for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_write_adjustments on adjustments for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_write_app_config on app_config for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_claim_tokens on claim_tokens for all to authenticated using (is_admin()) with check (is_admin());

-- audit_log: admins read; nobody writes via the API (trigger runs as owner)
create policy audit_admin_read on audit_log for select to authenticated using (is_admin());
revoke insert, update, delete on audit_log from authenticated;

-- players: everyone may flip their own live-table preference; anything else is
-- admin work done via SQL/RPC. Column grant keeps is_admin/auth_user_id safe.
revoke insert, update, delete on players from authenticated;
grant update (live_table_default) on players to authenticated;
create policy players_self_pref on players for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- picks: column grants stop clients ever touching result/locked/fixture
-- columns or the submitted_* stamps (trigger-set). Row policies allow
-- teammates while the window is open, admins any time.
revoke insert, update, delete on picks from authenticated;
grant insert (gameweek_id, player_id, method, team, second_team, odds) on picks to authenticated;
grant update (method, team, second_team, odds) on picks to authenticated;

create policy picks_insert on picks for insert to authenticated
  with check (
    (is_admin() or same_team(player_id, gameweek_id))
    and window_open(gameweek_id)
  );

create policy picks_update on picks for update to authenticated
  using (
    is_admin()
    or (same_team(player_id, gameweek_id)
        and window_open(gameweek_id)
        and result is null
        and not locked)
  )
  with check (
    is_admin()
    or (same_team(player_id, gameweek_id) and window_open(gameweek_id))
  );

create policy picks_admin_delete on picks for delete to authenticated using (is_admin());

-- disputes: anyone can raise one as themselves; resolution goes via RPC.
revoke insert, update, delete on disputes from authenticated;
grant insert (pick_id, raised_by, kind, reason) on disputes to authenticated;
create policy disputes_insert on disputes for insert to authenticated
  with check (raised_by = current_player_id());

-- NB: the stamp + audit triggers attach in 0009, AFTER the seed import, so
-- historic rows keep their timestamps and the audit log starts clean.
