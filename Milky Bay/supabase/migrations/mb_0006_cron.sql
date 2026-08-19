-- Window sweeper on the shared pg_cron (job names are unique per database,
-- so this one is mb- prefixed; JHH's 'gw-tick' is untouched).

select cron.schedule('mb-gw-tick', '*/5 * * * *', 'select milkybay.tick_gameweeks()');

-- Internal functions must not be client-callable (0012 pattern).
revoke execute on function milkybay.tick_gameweeks() from anon, authenticated;
revoke execute on function milkybay.insert_no_picks(uuid) from anon, authenticated;
