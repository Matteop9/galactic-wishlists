-- PostgREST must serve the tenpins schema alongside public (The Acca) and
-- milkybay. Done via in-database config (equivalent to Dashboard -> Settings
-- -> API -> "Exposed schemas", which is not reachable via SQL). If the
-- exposed-schemas list is ever edited in the dashboard, remove this role
-- setting first or the two will fight:
--   alter role authenticator reset pgrst.db_schemas;

alter role authenticator set pgrst.db_schemas = 'public, graphql_public, milkybay, tenpins';
notify pgrst, 'reload config';
notify pgrst, 'reload schema';
