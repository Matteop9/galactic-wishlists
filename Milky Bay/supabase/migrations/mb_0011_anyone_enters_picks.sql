-- Group decision (2026-08-19): anyone in the syndicate can transcribe
-- anyone's picks — they all read the same group chat, and the stamp trigger
-- records WHO entered each pick. Replaces the own-row-only policies from
-- mb_0003. Window-gated for members; admins any time.

drop policy mb_picks_insert on milkybay.picks;
drop policy mb_picks_update on milkybay.picks;

create policy mb_picks_insert on milkybay.picks for insert to authenticated
  with check (
    milkybay.is_admin()
    or (milkybay.is_player() and milkybay.window_open(gameweek_id))
  );

create policy mb_picks_update on milkybay.picks for update to authenticated
  using (
    milkybay.is_admin()
    or (milkybay.is_player()
        and milkybay.window_open(gameweek_id)
        and result is null
        and not locked)
  )
  with check (
    milkybay.is_admin()
    or (milkybay.is_player() and milkybay.window_open(gameweek_id))
  );
