-- 0025 granted update (badge_url) only, which looks right but breaks the one
-- write the client actually makes: PostgREST's upsert compiles to
--   insert ... on conflict (team) do update set team = excluded.team, ...
-- so it needs update privilege on the conflict column too, or every re-save of
-- an existing override fails with 42501. `team` is still admin-only by policy,
-- and an admin renaming a row is just the delete+insert they could already do.
grant update (team) on team_badges to authenticated;
