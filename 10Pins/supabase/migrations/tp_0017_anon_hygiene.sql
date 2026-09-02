-- tp_0017 — what an anonymous demo visitor may do, and how long they last.
--
-- tp_0016 made "Try the demo" an anonymous sign-in. That fixed the leaked
-- credential, but it also handed every passer-by a real `authenticated` user
-- with no friction at all, and the review that followed found three things
-- that was too generous about:
--
--   1. `profiles_select` is `using (true)`, so an anonymous visitor could list
--      every real user — display name, username, avatar.
--   2. Nothing stopped them sending friend requests to those users (each one a
--      notification), creating groups, or filing feedback nobody can reply to.
--   3. Nothing ever deleted them. Every tap of the demo button would have been
--      a permanent auth user, profile and group_members row.
--
-- The JWT for an anonymous user carries `is_anonymous: true`, which is what
-- every rule below keys on. Real accounts are untouched by all of it.

-- ---------------------------------------------------------------------------
-- 0. Helper: is the caller an anonymous (demo) user?
--    `auth.jwt()` reads the request's claims; the claim is absent for a real
--    account and for the anon (signed-out) role, so both come back false.
create or replace function tenpins.is_anonymous()
returns boolean
language sql stable
set search_path = tenpins
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;

revoke execute on function tenpins.is_anonymous() from public;
grant execute on function tenpins.is_anonymous() to authenticated, anon;

-- ---------------------------------------------------------------------------
-- 1. Anonymous visitors only see the people they share a group with — which,
--    for a demo visitor, is the demo group — plus themselves. `can_tag` (tp_0015)
--    already expresses "friend or group mate" as a definer function, so reuse it
--    rather than write the join a second time. Real accounts keep `true`: the
--    Friends screen searches profiles by name, and that is a product decision
--    (COUNCIL_REVIEW_TODO) rather than a bug.
drop policy profiles_select on tenpins.profiles;
create policy profiles_select on tenpins.profiles for select to authenticated
  using (
    not tenpins.is_anonymous()
    or id = auth.uid()
    or tenpins.can_tag(id)
  );

-- ---------------------------------------------------------------------------
-- 2. Anonymous visitors can bowl in the demo (games, live sessions, comments,
--    reactions) but cannot reach outside it: no friend requests, no groups of
--    their own, no match days, no feedback. Each of these is a write that lands
--    on a real person or a queue a real person has to triage.
drop policy friendships_insert on tenpins.friendships;
create policy friendships_insert on tenpins.friendships for insert to authenticated
  with check (requester = auth.uid() and status = 'pending' and not tenpins.is_anonymous());

drop policy groups_insert on tenpins.groups;
create policy groups_insert on tenpins.groups for insert to authenticated
  with check (created_by = auth.uid() and not tenpins.is_anonymous());

drop policy match_days_insert on tenpins.match_days;
create policy match_days_insert on tenpins.match_days for insert to authenticated
  with check (created_by = auth.uid() and tenpins.is_group_member(group_id) and not tenpins.is_anonymous());

drop policy feedback_insert on tenpins.feedback;
create policy feedback_insert on tenpins.feedback for insert to authenticated
  with check (profile_id = auth.uid() and not tenpins.is_anonymous());

-- ---------------------------------------------------------------------------
-- 3. Anonymous visitors expire. Supabase's own guidance is a periodic delete of
--    `auth.users where is_anonymous`; `profiles.id` cascades from it, but most
--    of the schema's FKs to `profiles` are NO ACTION (deliberately — a real
--    account's games must never vanish by accident), so a bare delete would
--    fail the moment a visitor had entered a game. This walks each visitor's
--    footprint in dependency order first.
--
--    Their own games and sessions go. A seat they held in someone ELSE's game
--    turns into a guest seat, so the other players' scorecard survives intact.
--    Each visitor is its own sub-transaction: one that won't delete is logged
--    and skipped, never allowed to block the rest.
create or replace function tenpins.purge_anonymous_users(p_older_than interval default interval '7 days')
returns integer
language plpgsql security definer
set search_path = tenpins, pg_temp
as $$
declare
  u record;
  purged integer := 0;
begin
  for u in
    select id from auth.users
    where is_anonymous
      and created_at < now() - p_older_than
      and coalesce(last_sign_in_at, created_at) < now() - p_older_than
  loop
    begin
      -- What they did on other people's posts and profiles.
      delete from comments where profile_id = u.id;
      delete from reactions where profile_id = u.id;
      delete from notifications where actor_id = u.id;
      delete from friendships where requester = u.id or addressee = u.id;
      delete from name_mappings where profile_id = u.id;
      delete from match_day_players where profile_id = u.id;
      update guest_claims set claimed_by = null where claimed_by = u.id;

      -- A seat in a game they didn't create becomes a guest seat.
      update game_players
         set profile_id = null,
             guest_name = coalesce(guest_name, 'Guest bowler')
       where profile_id = u.id
         and game_id not in (select id from games where created_by = u.id);

      -- What they created. `feed_events.session_id` / `group_id` do not cascade.
      delete from games where created_by = u.id;                      -- cascades players, frames, feed events
      delete from feed_events where session_id in (select id from sessions where created_by = u.id);
      delete from match_days where created_by = u.id;
      delete from sessions where created_by = u.id;                   -- cascades games, match days, viewers
      delete from group_members where profile_id = u.id;

      -- Groups of their own should not exist after this migration, but a
      -- visitor from before it might own one.
      delete from match_days where group_id in (select id from groups where created_by = u.id);
      delete from feed_events where group_id in (select id from groups where created_by = u.id);
      delete from guest_claims where group_id in (select id from groups where created_by = u.id);
      update sessions set group_id = null where group_id in (select id from groups where created_by = u.id);
      delete from groups where created_by = u.id;                     -- cascades members, name mappings

      -- profiles cascades from here; feedback, scan_events, session_viewers
      -- and app_admins cascade from profiles.
      delete from auth.users where id = u.id;
      purged := purged + 1;
    exception when others then
      raise warning 'purge_anonymous_users: skipped % — %', u.id, sqlerrm;
    end;
  end loop;
  return purged;
end;
$$;

revoke execute on function tenpins.purge_anonymous_users(interval) from public, anon, authenticated;

-- Nightly, off-peak. Same pg_cron the other schemas in this project use.
select cron.schedule('tp-purge-anon', '20 4 * * *', 'select tenpins.purge_anonymous_users()');

-- ---------------------------------------------------------------------------
-- 4. Review leftover: the friendship freeze trigger (tp_0015) had a mutable
--    search_path. It references no tables, so the risk was nil, but the
--    advisor flags it and every other function here pins it.
alter function tenpins.freeze_friendship_endpoints() set search_path = tenpins;
