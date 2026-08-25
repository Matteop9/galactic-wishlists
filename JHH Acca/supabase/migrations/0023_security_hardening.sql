-- Security hardening (review 2026-08-25).
--
-- 1) Internal / cron-only functions were still executable by anon +
--    authenticated: new functions get EXECUTE granted to PUBLIC by default, and
--    0012's `revoke ... from anon` did not touch that PUBLIC grant. live_tick
--    fires an external football-data API call (cost/quota abuse) and
--    insert_no_picks can force no-pick penalties mid-window. None are called by
--    the client — the three pg_cron jobs run as the `postgres` role, which keeps
--    EXECUTE — so revoke from PUBLIC (and anon/authenticated explicitly).
revoke execute on function public.insert_no_picks(uuid)        from public, anon, authenticated;
revoke execute on function public.tick_gameweeks()             from public, anon, authenticated;
revoke execute on function public.live_tick()                  from public, anon, authenticated;
revoke execute on function public.process_poll_responses()     from public, anon, authenticated;
revoke execute on function public.audit()                      from public, anon, authenticated;
revoke execute on function public.stamp_pick()                 from public, anon, authenticated;

-- 2) join_code sat behind a player-readable policy, so any signed-in player
--    could read the group code — which made "revoke someone's access" mean
--    "rotate the code for everyone". Every app_config reader (register_player,
--    live_tick) is SECURITY DEFINER and bypasses RLS; the client only reads
--    app_config from the Admin page. Restrict direct reads to admins.
drop policy read_app_config on public.app_config;
create policy read_app_config on public.app_config
  for select to authenticated using ((select is_admin()));

-- 3) Feedback was readable by every player (the client fetched the whole table
--    and filtered client-side), despite the "it lands in the admin queue" copy
--    implying it's private. Scope reads to the author and admins.
drop policy feedback_read on public.feedback;
create policy feedback_read on public.feedback
  for select to authenticated
  using (player_id = (select current_player_id()) or (select is_admin()));
