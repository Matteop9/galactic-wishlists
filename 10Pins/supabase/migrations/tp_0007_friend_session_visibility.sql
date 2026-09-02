-- Companion to tp_0006: a friend could now see the game but not its session,
-- so the venue name vanished from their feed card. Let a session be read by
-- anyone who can see one of its games (definer helper — no policy recursion).

drop policy sessions_select on tenpins.sessions;
create policy sessions_select on tenpins.sessions for select to authenticated
  using (
    created_by = auth.uid()
    or (group_id is not null and tenpins.is_group_member(group_id))
    or exists (
      select 1 from tenpins.games g
      where g.session_id = id and tenpins.can_see_game(g.id)
    )
  );
