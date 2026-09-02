-- tp_0016 — the demo stops shipping a working password.
--
-- COUNCIL_REVIEW_TODO item 2: "Try the demo" signed in with
-- VITE_DEMO_EMAIL / VITE_DEMO_PASSWORD, and VITE_ vars are inlined into the
-- deployed bundle — so anyone could read the credentials out of the JS and
-- take the shared demo account over (change its password, enumerate profiles,
-- write to shared tables). Confirmed: the email string is present in dist/.
--
-- The fix is Supabase anonymous sign-in: every visitor gets their own
-- throwaway user, and no credential exists to leak. An anonymous user with no
-- games would see an empty app, which is a worse demo than none, so
-- `join_demo` gives them a profile and drops them into the demo group where
-- the seeded games live.
--
-- ⚠️ Requires Auth → Providers → "Anonymous sign-ins" to be ENABLED on this
-- project. Until it is, the client hides the demo button rather than showing
-- one that fails.
--
-- Blast radius, deliberately accepted: anonymous visitors become members of
-- the demo group, so they can write into it (a game, a comment) and — being
-- group mates — can tag its members under tp_0015. Every member of that group
-- is a throwaway test account, so the only data they can touch is demo data.
-- Never mark a real group as the demo group.

alter table tenpins.groups
  add column if not exists is_demo boolean not null default false;

-- One demo group at a time.
create unique index if not exists groups_single_demo_idx
  on tenpins.groups ((true)) where is_demo;

update tenpins.groups set is_demo = true where name = 'Test Crew';

create or replace function tenpins.join_demo()
returns uuid
language plpgsql security definer set search_path = tenpins
as $$
declare
  uid uuid := auth.uid();
  gid uuid;
  handle text;
begin
  if uid is null then
    raise exception 'NOT_SIGNED_IN';
  end if;

  select id into gid from groups where is_demo limit 1;
  if not found then
    raise exception 'NO_DEMO_GROUP';
  end if;

  -- A profile they own, named so it's obvious in the feed who is passing through.
  handle := 'guest_' || substr(replace(uid::text, '-', ''), 1, 8);
  insert into profiles (id, username, display_name)
  values (uid, handle, 'Guest bowler')
  on conflict (id) do nothing;

  insert into group_members (group_id, profile_id, role)
  values (gid, uid, 'member')
  on conflict do nothing;

  return gid;
end;
$$;

revoke execute on function tenpins.join_demo() from anon, public;
grant execute on function tenpins.join_demo() to authenticated;
