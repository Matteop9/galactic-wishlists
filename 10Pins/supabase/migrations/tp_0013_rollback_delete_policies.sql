-- tp_0013 — let the client's rollback paths actually roll back.
--
-- Found while fixing the dead "Delete game" button (tp_0012): `sessions` and
-- `groups` had no DELETE policy at all, so every best-effort rollback in the
-- client (`createGroup`, `createLiveSession`, `createMatchDay`, the games
-- insert helpers) silently deleted 0 rows and left an orphan row behind after
-- a failed create. Owner-scoped, matching games_delete.
--
-- No UI exposes either as a button. Nothing else needs relaxing: the child
-- FKs that are NOT cascading (feed_events / guest_claims / match_days /
-- sessions → groups) act as a guard, so a group that has actually been used
-- still cannot be deleted from the client.

create policy sessions_delete on tenpins.sessions
  for delete to authenticated
  using (created_by = auth.uid());

create policy groups_delete on tenpins.groups
  for delete to authenticated
  using (created_by = auth.uid());
