-- PostgREST must serve the milkybay schema. Done via in-database config
-- (equivalent to Dashboard -> Settings -> API -> "Exposed schemas", which is
-- not reachable via SQL). If the exposed-schemas list is ever edited in the
-- dashboard, remove this role setting first or the two will fight:
--   alter role authenticator reset pgrst.db_schemas;

alter role authenticator set pgrst.db_schemas = 'public, graphql_public, milkybay';
notify pgrst, 'reload config';
notify pgrst, 'reload schema';

-- Also in this migration: unclaimed_players must include non-playing admins
-- (Matteo claims his own row through the same join UI).
create or replace function milkybay.unclaimed_players()
returns table (id uuid, name text)
language sql stable security definer set search_path = milkybay as
$$ select id, name from players where auth_user_id is null order by name $$;
