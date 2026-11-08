-- 0028 — Admins can correct any pick once its window has closed
--
-- Players can only change a pick while the entry window is open. After that
-- (and especially once the week is settled) the only fix was raw SQL — e.g. a
-- pick made in the group chat that never got transcribed and was swept to a
-- no-pick at Saturday midnight.
--
-- admin_edit_pick rewrites one player's pick for a closed gameweek and settles
-- it in the same call: method / team(s) / odds / result / void reason.
--
-- Deliberately NOT a "reopen the window" switch. Reopening would fight
-- tick_gameweeks (it re-closes any open week past window_closes on the next
-- tick), re-arm the 48h no-pick sweep, rewrite the recorded window times, and
-- push a settled week back through 'closed' for everyone. This edits the one
-- row and leaves the week's history alone.
--
-- 'N/A' (no pick) is finalised to the sheet convention on the spot
-- (team-average odds, result 0, locked). insert_no_picks is NOT reused: it
-- also inserts no-picks for anyone missing a row, and must never be pointed
-- at a historical week (that would rewrite history validated to 4dp).
--
-- A change of method/team drops the pick's fixture link (and any pending
-- match suggestion) so live chips never show the old team's match.
-- Gameweek status is reconciled exactly as settle_pick does it.

create function admin_edit_pick(
  p_gw uuid,
  p_player uuid,
  p_method text,
  p_team text,
  p_second_team text,
  p_odds numeric,
  p_result smallint,
  p_void_reason text default null
) returns uuid
language plpgsql security definer set search_path = public as
$$
declare
  g gameweeks;
  prev picks;
  pid uuid;
  v_team text := nullif(btrim(p_team), '');
  v_second text := nullif(btrim(p_second_team), '');
  v_odds numeric := round(p_odds, 2);
  v_result smallint := p_result;
  v_void text := p_void_reason;
  v_relink boolean;
begin
  if not is_admin() then raise exception 'Admins only'; end if;

  select * into g from gameweeks where id = p_gw;
  if not found then raise exception 'Gameweek not found'; end if;
  if g.status in ('scheduled', 'skipped') then
    raise exception 'This gameweek is %', g.status;
  end if;
  if now() < g.window_closes then
    raise exception 'Window is still open — use Enter Pick';
  end if;

  select * into prev from picks where gameweek_id = p_gw and player_id = p_player;
  if prev.id is null
     and not exists (select 1 from gw_participants(p_gw) where player_id = p_player) then
    raise exception 'That player isn''t in this gameweek';
  end if;

  if p_method is null or p_method not in ('Win', 'BTTS', 'N/A') then
    raise exception 'Method must be Win, BTTS or N/A';
  end if;

  if p_method = 'N/A' then
    v_team := 'N/A';
    v_second := null;
    v_result := 0;
    v_void := null;
    -- Same odds convention as insert_no_picks: the team's average that week,
    -- else the gameweek's, else 1.50. This player's own row is excluded — it
    -- may still hold the real pick being replaced.
    select coalesce(
             (select round(avg(pk.odds), 2)
                from picks pk
                join gw_participants(p_gw) gp on gp.player_id = pk.player_id
               where pk.gameweek_id = p_gw and pk.method <> 'N/A'
                 and pk.player_id <> p_player
                 and gp.team_name = (select team_name from gw_participants(p_gw)
                                      where player_id = p_player limit 1)),
             (select round(avg(pk.odds), 2)
                from picks pk
               where pk.gameweek_id = p_gw and pk.method <> 'N/A'
                 and pk.player_id <> p_player),
             1.50)
      into v_odds;
  else
    if v_team is null then raise exception 'Pick a team'; end if;
    if p_method = 'BTTS' and v_second is null then
      raise exception 'BTTS needs a second team';
    end if;
    if p_method = 'Win' then v_second := null; end if;
    if v_odds is null or v_odds < 1.0 then
      raise exception 'Odds must be at least 1.00';
    end if;
    if v_result is not null and v_result not in (0, 1) then
      raise exception 'Result must be 0, 1 or null';
    end if;
    if v_void is not null then
      if v_void not in ('invalid', 'postponed') then
        raise exception 'Void reason must be invalid or postponed';
      end if;
      if v_result is distinct from 0::smallint then
        raise exception 'Void picks score 0 — settle with result 0';
      end if;
    end if;
  end if;

  v_relink := prev.id is null
    or (prev.method, prev.team, prev.second_team)
       is distinct from (p_method, v_team, v_second);

  insert into picks (gameweek_id, player_id, method, team, second_team, odds,
                     result, void_reason, locked)
  values (p_gw, p_player, p_method, v_team, v_second, v_odds,
          v_result, v_void, true)
  on conflict (gameweek_id, player_id) do update
     set method = excluded.method,
         team = excluded.team,
         second_team = excluded.second_team,
         odds = excluded.odds,
         result = excluded.result,
         void_reason = excluded.void_reason,
         locked = true,
         fixture_id = case when v_relink then null else picks.fixture_id end,
         fixture_side = case when v_relink then null else picks.fixture_side end,
         match_confidence = case when v_relink then null else picks.match_confidence end
  returning id into pid;

  if v_relink then
    delete from match_suggestions where pick_id = pid;
  end if;

  -- Reconcile the week's status (same rule as settle_pick).
  if not exists (select 1 from picks where gameweek_id = p_gw and result is null) then
    update gameweeks set status = 'settled' where id = p_gw and status in ('open', 'closed');
  else
    update gameweeks set status = 'closed' where id = p_gw and status = 'settled';
  end if;

  return pid;
end
$$;

revoke execute on function admin_edit_pick(uuid, uuid, text, text, text, numeric, smallint, text)
  from public, anon;
grant execute on function admin_edit_pick(uuid, uuid, text, text, text, numeric, smallint, text)
  to authenticated, service_role;
