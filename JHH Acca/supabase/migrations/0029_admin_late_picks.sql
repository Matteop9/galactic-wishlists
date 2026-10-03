-- 0029 — admin late pick entry (after the window has closed)
--
-- Picks are made in the group chat by Friday 8 PM and transcribed into the app
-- by Saturday 23:59. When one isn't, the sweeper (insert_no_picks) writes an
-- N/A row (team-average odds, result 0, locked) and nobody could put the real
-- pick in afterwards: picks_insert's `window_open()` applies to admins too, and
-- PostgREST's upsert is INSERT … ON CONFLICT, so even the update path was
-- rejected once closed. The column grants also keep result/locked/void_reason
-- out of reach, so a corrected row would have stayed scored 0.
--
-- admin_upsert_pick is the one sanctioned route around the deadline:
--   * admins only; the player must take part in that gameweek
--   * inserts or overwrites the row, un-settling it (result/void_reason null,
--     unlocked) so the admin re-settles it on the gameweek page
--   * a changed selection drops the live-score match so it gets re-matched
--   * a late 'N/A' after close is finalised straight away via insert_no_picks
--   * a 'settled' gameweek drops back to 'closed' while any pick is unsettled,
--     mirroring settle_pick
-- RLS/policies are unchanged — the deadline still stands for everyone else.
-- Audited like every other pick write (picks_stamp + audit_picks fire as usual).

create or replace function admin_upsert_pick(
  p_gw uuid,
  p_player uuid,
  p_method text,
  p_team text,
  p_second_team text,
  p_odds numeric
)
returns uuid
language plpgsql security definer set search_path = public as
$$
declare
  g gameweeks%rowtype;
  pid uuid;
begin
  if not is_admin() then raise exception 'Admins only'; end if;

  select * into g from gameweeks where id = p_gw;
  if g.id is null then raise exception 'Gameweek not found'; end if;
  if g.status = 'skipped' then raise exception 'Gameweek is skipped'; end if;

  if not exists (select 1 from gw_participants(p_gw) where player_id = p_player) then
    raise exception 'Player is not taking part in this gameweek';
  end if;

  if p_method not in ('Win', 'BTTS', 'N/A') then
    raise exception 'Method must be Win, BTTS or N/A';
  end if;
  if p_method = 'N/A' then
    p_team := 'N/A';
    p_second_team := null;
    p_odds := coalesce(p_odds, 1.5);
  else
    p_team := nullif(btrim(p_team), '');
    p_second_team := nullif(btrim(p_second_team), '');
    if p_team is null then raise exception 'Selection is required'; end if;
    if p_method = 'BTTS' and p_second_team is null then
      raise exception 'BTTS picks need a second team';
    end if;
    if p_method = 'Win' then p_second_team := null; end if;
    if p_odds is null or p_odds < 1.5 then raise exception 'Odds must be at least 1.50'; end if;
  end if;

  insert into picks (gameweek_id, player_id, method, team, second_team, odds)
  values (p_gw, p_player, p_method, p_team, p_second_team, round(p_odds, 2))
  on conflict (gameweek_id, player_id) do update
    set method       = excluded.method,
        team         = excluded.team,
        second_team  = excluded.second_team,
        odds         = excluded.odds,
        result       = null,
        void_reason  = null,
        locked       = false,
        -- a different selection invalidates the fixture match; same selection keeps it
        fixture_id   = case when (picks.method, picks.team, picks.second_team)
                                 is distinct from (excluded.method, excluded.team, excluded.second_team)
                            then null else picks.fixture_id end,
        fixture_side = case when (picks.method, picks.team, picks.second_team)
                                 is distinct from (excluded.method, excluded.team, excluded.second_team)
                            then null else picks.fixture_side end,
        match_confidence = case when (picks.method, picks.team, picks.second_team)
                                     is distinct from (excluded.method, excluded.team, excluded.second_team)
                                then null else picks.match_confidence end
  returning id into pid;

  -- A late no-pick after close takes the sheet convention immediately rather
  -- than waiting on (or missing) the sweeper's 48h grace window.
  if p_method = 'N/A' and now() >= g.window_closes then
    perform insert_no_picks(p_gw);
  end if;

  if exists (select 1 from picks where gameweek_id = p_gw and result is null) then
    update gameweeks set status = 'closed' where id = p_gw and status = 'settled';
  end if;

  return pid;
end
$$;

revoke execute on function admin_upsert_pick(uuid, uuid, text, text, text, numeric) from public, anon;
grant execute on function admin_upsert_pick(uuid, uuid, text, text, text, numeric) to authenticated, service_role;
