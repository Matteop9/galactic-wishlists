-- Fix: "permission denied for table picks" on every pick entry.
--
-- The client saved picks with a PostgREST upsert. PostgREST compiles that to
--   insert ... on conflict (gameweek_id, player_id, acca_kind)
--   do update set gameweek_id = excluded.gameweek_id, player_id = ..., acca_kind = ...
-- i.e. EVERY payload column lands in the SET list, including the conflict
-- target. Postgres checks UPDATE privilege on every column in that SET list at
-- plan time — even for a brand-new row that never conflicts — so the tight
-- column grants from mb_0003 (`grant update (game, selection, odds,
-- odds_display)`) made the statement fail outright with 42501. No pick had
-- ever been entered through the app; only the mb_0007 seed rows existed.
--
-- Fix without loosening the grants: one security-definer write path, mirroring
-- settle_pick/lock_pick. Same authorisation as the mb_0011 policies (anyone in
-- the syndicate transcribes anyone's picks while the window's open; admins any
-- time) and the same four mutable columns. result/void_reason/is_no_pick/
-- locked and the submitted_* stamps stay un-writable from the client.
--
-- Min odds (W 1.50 / Random 1.70) stay a UI warning, not a constraint — real
-- chat picks must never fail to transcribe (mb_0001 comment).

create or replace function milkybay.upsert_pick(
  p_gameweek uuid,
  p_player uuid,
  p_kind text,
  p_selection text,
  p_odds numeric,
  p_game text default null,
  p_odds_display text default null
)
returns uuid
language plpgsql security definer set search_path = milkybay as
$$
declare pid uuid;
begin
  if not is_player() then
    raise exception 'Not a Milky Bay player';
  end if;
  if not (is_admin() or window_open(p_gameweek)) then
    raise exception 'The pick window for that gameweek is closed';
  end if;
  if p_kind not in ('W', 'random') then
    raise exception 'Bad acca kind %', p_kind;
  end if;
  if coalesce(trim(p_selection), '') = '' then
    raise exception 'A selection is required';
  end if;
  if p_odds is null or p_odds < 1.0 then
    raise exception 'Odds must be 1.0 or better';
  end if;
  if not exists (select 1 from players where id = p_player and plays) then
    raise exception 'Not a playing Milky Bay member';
  end if;

  insert into picks (gameweek_id, player_id, acca_kind, game, selection, odds, odds_display)
  values (p_gameweek, p_player, p_kind, nullif(trim(p_game), ''),
          trim(p_selection), p_odds, nullif(trim(p_odds_display), ''))
  on conflict (gameweek_id, player_id, acca_kind) do update
    set game = excluded.game,
        selection = excluded.selection,
        odds = excluded.odds,
        odds_display = excluded.odds_display
    where is_admin() or (picks.result is null and not picks.locked)
  returning id into pid;

  -- Conflict + DO UPDATE ... WHERE false returns no row: the existing pick is
  -- settled or locked and the caller isn't an admin.
  if pid is null then
    raise exception 'That pick is already settled or locked';
  end if;
  return pid;
end
$$;

grant execute on function milkybay.upsert_pick(uuid, uuid, text, text, numeric, text, text)
  to authenticated;

-- Single write path from here on: the direct table grants + policies that
-- PostgREST used are now dead weight, and leaving them would let a client
-- insert a pick that skipped the checks above.
drop policy if exists mb_picks_insert on milkybay.picks;
drop policy if exists mb_picks_update on milkybay.picks;
revoke insert, update on milkybay.picks from authenticated;
