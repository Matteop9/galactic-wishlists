-- Core domain model. Odds are bare numeric: the seed carries full-precision
-- decimals (e.g. 1.9090909090909092) and the reconciliation gate targets 4dp,
-- so numeric(6,2) would fail validation. Display rounds to 2dp.

create table acca_teams (
  id text primary key
);

create table players (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  acca_team text not null references acca_teams(id),
  auth_user_id uuid references auth.users(id),
  is_admin boolean not null default false,
  live_table_default boolean not null default false
);
create unique index players_auth_user_uidx on players (auth_user_id) where auth_user_id is not null;

create table seasons (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  start_date date not null,
  end_date date not null,
  kind text not null default 'league' check (kind in ('league', 'special', 'test')),
  double_rule boolean not null default false
);

-- Ad-hoc team compositions for test/special seasons (Test Weekend pairs,
-- future World Cup-style side comps). League seasons have no rows here and
-- fall back to players.acca_team.
create table season_team_members (
  season_id uuid not null references seasons(id) on delete cascade,
  team_name text not null,
  player_id uuid not null references players(id),
  primary key (season_id, player_id)
);

create table gameweeks (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id),
  gw_date date unique not null,
  window_opens timestamptz not null,
  window_closes timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'open', 'closed', 'settled', 'skipped')),
  -- Explicit flag, never max(gw_date): during a live week the current GW is
  -- always the max existing one, which would wrongly exempt every week.
  is_season_final boolean not null default false,
  live_enabled boolean not null default true
);

create table fixtures (
  id bigint primary key,                 -- football-data.org match id
  gameweek_id uuid not null references gameweeks(id),
  competition text not null,
  home_team text not null,
  away_team text not null,
  kickoff timestamptz not null,
  status text not null default 'TIMED',
  home_score int,
  away_score int,
  minute text,
  last_polled timestamptz
);

create table picks (
  id uuid primary key default gen_random_uuid(),
  gameweek_id uuid not null references gameweeks(id),
  player_id uuid not null references players(id),
  method text not null,                  -- 'Win' | 'BTTS' | 'N/A'
  team text not null,
  second_team text,
  odds numeric not null check (odds >= 1.0),
  result smallint check (result in (0, 1)),
  submitted_at timestamptz not null default now(),
  submitted_by uuid references players(id),
  locked boolean not null default false,
  fixture_id bigint references fixtures(id),
  fixture_side text check (fixture_side in ('HOME', 'AWAY')),
  match_confidence numeric,
  unique (gameweek_id, player_id)
);

create table adjustments (
  id uuid primary key default gen_random_uuid(),
  gameweek_id uuid references gameweeks(id),
  player_id uuid references players(id),  -- null = team-level adjustment
  acca_team text references acca_teams(id),
  kind text not null check (kind in ('Bonus', 'Minus')),
  reason text not null,
  score numeric not null,                 -- signed contribution to Score
  created_at timestamptz not null default now()
);

create table disputes (
  id uuid primary key default gen_random_uuid(),
  pick_id uuid not null references picks(id),
  raised_by uuid not null references players(id),
  kind text not null check (kind in ('pick', 'odds', 'result')),
  reason text not null,
  status text not null default 'open' check (status in ('open', 'upheld', 'rejected')),
  resolution_note text,
  resolved_by uuid references players(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table claim_tokens (
  token uuid primary key default gen_random_uuid(),
  player_id uuid unique not null references players(id),
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);

create table app_config (
  key text primary key,
  value jsonb not null
);

create table audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  action text not null,
  table_name text not null,
  row_id text,
  old_row jsonb,
  new_row jsonb,
  actor_auth uuid,
  actor_player uuid,
  ip text,                               -- first hop of x-forwarded-for
  user_agent text
);

create index picks_gameweek_idx on picks (gameweek_id);
create index picks_player_idx on picks (player_id);
create index fixtures_gameweek_idx on fixtures (gameweek_id);
create index disputes_pick_idx on disputes (pick_id);
create index audit_log_table_row_idx on audit_log (table_name, row_id);
create index audit_log_actor_idx on audit_log (actor_player, at desc);
