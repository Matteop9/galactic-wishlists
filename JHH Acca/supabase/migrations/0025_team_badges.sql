-- Team logos, admin-editable at runtime.
--
-- Until now every new club's crest meant a code change: add the name to
-- scripts/fetch-badges.ts, rerun it, regenerate src/lib/badges.ts, redeploy.
-- Fine for the 2026-08 bulk sweep, useless when someone picks Barnet on a
-- Friday night. This table is the live override layer that sits ON TOP of the
-- generated file, so Admin -> Team logos can fix a missing crest in seconds.
--
-- Resolution order in the client (src/lib/teams.ts + components/ui.tsx):
--   sport emoji -> team_badges row -> football-data CRESTS -> SDB_BADGES -> initials
-- A row with badge_url NULL means "deliberately no logo" (e.g. 'Draw'): the
-- initials chip still renders, but the name stops nagging in the admin list.

create table team_badges (
  team text primary key,
  badge_url text check (badge_url is null or badge_url ~ '^https://'),
  updated_at timestamptz not null default now(),
  updated_by uuid references players(id)
);

alter table team_badges enable row level security;
revoke all on team_badges from anon;
revoke insert, update, delete on team_badges from authenticated;
grant select on team_badges to authenticated;
-- updated_at/updated_by are stamped server-side, never client-supplied.
grant insert (team, badge_url) on team_badges to authenticated;
grant update (badge_url) on team_badges to authenticated;   -- widened in 0026
grant delete on team_badges to authenticated;

-- Everyone reads (crests render on every page); only admins write.
-- (select ...) wrappers keep the predicate an InitPlan (see migration 0013).
create policy read_team_badges on team_badges for select to authenticated
  using ((select is_player()));
create policy admin_write_team_badges on team_badges for all to authenticated
  using ((select is_admin())) with check ((select is_admin()));

create or replace function stamp_team_badge()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  new.updated_at := now();
  new.updated_by := current_player_id();
  return new;
end
$function$;
-- Trigger-only, like the other internal functions hardened in migration 0023.
revoke execute on function stamp_team_badge() from public;
revoke execute on function stamp_team_badge() from anon, authenticated;

create trigger team_badges_stamp before insert or update on team_badges
  for each row execute function stamp_team_badge();
create trigger audit_team_badges after insert or update or delete on team_badges
  for each row execute function audit();

-- Seed the gaps that existed when this shipped. Barnet (picked 2026-08-27) is
-- the club that prompted the feature; St Gallen and APOEL were the two
-- fetch-badges.ts could never resolve by name search (its query aliases hit a
-- reserve side / nothing at all, so both were stuck on initials chips).
-- Monza + Deportivo la Coruna were football-data clubs simply never mapped —
-- they went into the static CRESTS map in src/lib/teams.ts instead.
insert into team_badges (team, badge_url) values
  ('Barnet',         'https://r2.thesportsdb.com/images/media/team/badge/wyqvwq1447531659.png/small'),
  ('St Gallen',      'https://r2.thesportsdb.com/images/media/team/badge/tyvyvs1422644512.png/small'),
  ('Apoel Nicosia',  'https://r2.thesportsdb.com/images/media/team/badge/j5m0pu1779579095.png/small'),
  ('Draw',           null)
on conflict (team) do nothing;
