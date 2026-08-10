-- Close the advisor findings: pin search_path on every function, move pg_net
-- out of public, and strip EXECUTE so anon can call nothing and clients can
-- only call what they're meant to.

-- pg_net belongs in the extensions schema (nothing depends on it yet)
drop extension if exists pg_net;
create extension pg_net schema extensions;

-- Pin search_path on the scoring functions (they were created without it)
alter function leaderboard(date, date) set search_path = public;
alter function team_leaderboard(date, date) set search_path = public;
alter function season_leaderboard(uuid) set search_path = public;
alter function form_grid(int, date) set search_path = public;
alter function uk_ts(date, time) set search_path = public;

-- anon can execute nothing
revoke execute on all functions in schema public from anon;
alter default privileges in schema public revoke execute on functions from anon;

-- Trigger + system functions: not callable by clients at all
revoke execute on function audit() from authenticated;
revoke execute on function stamp_pick() from authenticated;
revoke execute on function tick_gameweeks() from authenticated;
revoke execute on function insert_no_picks(uuid) from authenticated;

-- Everything else stays executable by authenticated: the admin RPCs check
-- is_admin() internally, the predicates are needed by RLS policies, and the
-- leaderboard functions are SECURITY INVOKER so RLS applies through them.
