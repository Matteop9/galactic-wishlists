-- 10 Pins schema (build spec §4) — lives in the SAME Supabase project as
-- The Acca (public schema) and Milky Bay (milkybay schema), fully isolated in
-- the `tenpins` schema. Auth (GoTrue) is project-scoped, so auth.users is
-- shared across all three apps; 10 Pins keys everything off tenpins.profiles.
--
-- Moved here 2026-09-01 from the standalone `10pins` project (txqtdogymumvfvdoksow,
-- paused — free-tier active-project limit). Fresh start: only demo/test data existed.
--
-- Includes the milestone-5 group settings (season_starts, handicap_basis/pct)
-- that were a later migration on the old project.

create extension if not exists pgcrypto with schema extensions;

create schema tenpins;

-- Everything is auth-gated (no anon-callable RPCs), so anon gets no usage.
grant usage on schema tenpins to authenticated, service_role;

-- Profiles (1:1 with auth.users)
create table tenpins.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null,
  avatar_url text,
  created_at timestamptz default now()
);

create table tenpins.friendships (
  requester uuid references tenpins.profiles not null,
  addressee uuid references tenpins.profiles not null,
  status text not null check (status in ('pending','accepted')) default 'pending',
  created_at timestamptz default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);

create table tenpins.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references tenpins.profiles not null,
  verified_only_leaderboard boolean not null default false,
  season_name text default '2026 season',
  season_starts date,
  season_ends date,
  handicap_basis int not null default 200 check (handicap_basis between 100 and 300),
  handicap_pct int not null default 90 check (handicap_pct between 0 and 100),
  invite_code text unique default encode(extensions.gen_random_bytes(6),'hex'),
  created_at timestamptz default now()
);

create table tenpins.group_members (
  group_id uuid references tenpins.groups on delete cascade,
  profile_id uuid references tenpins.profiles,
  role text not null default 'member' check (role in ('admin','member')),
  joined_at timestamptz default now(),
  primary key (group_id, profile_id)
);

create table tenpins.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lat double precision, lng double precision,
  place_id text unique
);

create table tenpins.sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references tenpins.groups,
  venue_id uuid references tenpins.venues,
  created_by uuid references tenpins.profiles not null,
  started_at timestamptz default now(),
  status text not null default 'active' check (status in ('active','finished','abandoned'))
);

create table tenpins.games (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references tenpins.sessions on delete cascade,
  game_number int not null default 1,
  entry_type text not null check (entry_type in ('photo','live','total','manual')),
  verification_status text not null default 'unverified'
    check (verification_status in ('verified','live','unverified')),
  photo_path text,                       -- storage path when a monitor photo exists
  extraction jsonb,                      -- raw vision output, kept for re-reconciliation
  status text not null default 'complete' check (status in ('in_progress','complete','abandoned')),
  played_at timestamptz not null default now(),
  created_by uuid references tenpins.profiles not null
);

create table tenpins.game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references tenpins.games on delete cascade,
  profile_id uuid references tenpins.profiles,   -- null for guests
  guest_name text,                               -- null for profiles
  seat_order int not null,
  final_score int check (final_score between 0 and 300),
  strikes int, spares int, opens int,            -- cached; null for totals-only
  check (profile_id is not null or guest_name is not null)
);

create table tenpins.frames (
  game_player_id uuid references tenpins.game_players on delete cascade,
  frame_no int not null check (frame_no between 1 and 10),
  rolls jsonb not null,                          -- e.g. ["9","/"] or ["X"] or ["X","9","/"]
  cumulative int,                                -- engine-derived cache; null while pending
  is_split boolean default false,
  primary key (game_player_id, frame_no)
);

create table tenpins.feed_events (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('game','session','milestone')),
  game_id uuid references tenpins.games,
  session_id uuid references tenpins.sessions,
  group_id uuid references tenpins.groups,
  highlights jsonb default '[]',                 -- ["PB","200_CLUB","TURKEY"]
  created_at timestamptz default now()
);

create table tenpins.reactions (
  feed_event_id uuid references tenpins.feed_events on delete cascade,
  profile_id uuid references tenpins.profiles,
  emoji text not null check (emoji in ('🔥','👏','💀','🎳')),
  primary key (feed_event_id, profile_id, emoji)
);

create table tenpins.comments (
  id uuid primary key default gen_random_uuid(),
  feed_event_id uuid references tenpins.feed_events on delete cascade,
  profile_id uuid references tenpins.profiles not null,
  body text not null check (char_length(body) <= 500),
  created_at timestamptz default now()
);

create table tenpins.guest_claims (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references tenpins.groups not null,
  guest_name text not null,
  claim_code text unique default encode(extensions.gen_random_bytes(8),'hex'),
  claimed_by uuid references tenpins.profiles,
  claimed_at timestamptz
);

-- Per-group extracted-name → player mapping so photo review is one tap next time (spec §6)
create table tenpins.name_mappings (
  group_id uuid references tenpins.groups on delete cascade not null,
  displayed_name text not null,
  profile_id uuid references tenpins.profiles,
  guest_name text,
  primary key (group_id, displayed_name),
  check (profile_id is not null or guest_name is not null)
);

-- Indexes (spec §4; frames(game_player_id) is covered by its composite primary key)
create index tp_game_players_game_id_idx on tenpins.game_players (game_id);
create index tp_games_session_id_idx on tenpins.games (session_id);
create index tp_feed_events_group_created_idx on tenpins.feed_events (group_id, created_at desc);
create index tp_group_members_profile_id_idx on tenpins.group_members (profile_id);

-- Custom schemas get no Supabase default privileges: grant now and for
-- everything created later (RLS does the real gatekeeping).
grant all on all tables in schema tenpins to authenticated, service_role;
alter default privileges in schema tenpins grant all on tables to authenticated, service_role;
alter default privileges in schema tenpins grant all on sequences to authenticated, service_role;
