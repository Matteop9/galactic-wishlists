-- Milky Bay Betting Syndicate — schema. Lives in the SAME Supabase project as
-- The Acca (public schema), fully isolated in the `milkybay` schema. Auth is
-- shared: auth.users is project-scoped, so one login serves both apps.
--
-- Differences from the JHH model: no teams (5 individuals), TWO picks per
-- player per week (W acca + Random acca), points = capped odds with a
-- sole-loser penalty, and a seeded honours table (crowns / wooden spoons)
-- because pre-app history can't be computed from scores.

create schema milkybay;

-- anon needs usage for the two anon-callable RPCs (unclaimed_players,
-- register_player); every table is locked away from anon in mb_0003.
grant usage on schema milkybay to anon, authenticated, service_role;

create table milkybay.players (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  auth_user_id uuid references auth.users(id),
  is_admin boolean not null default false,
  -- Matteo administers without playing: non-playing rows are exempt from the
  -- no-pick sweep and never appear on leaderboards (they have no picks).
  plays boolean not null default true
);
create unique index mb_players_auth_user_uidx
  on milkybay.players (auth_user_id) where auth_user_id is not null;

create table milkybay.seasons (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  start_date date not null,
  end_date date not null,
  -- Rules §6: mini league runs for the first N weekends (loser gets a forfeit)
  mini_league_gws int not null default 6
);

create table milkybay.gameweeks (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references milkybay.seasons(id),
  gw_date date unique not null,
  window_opens timestamptz not null,
  window_closes timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'open', 'closed', 'settled', 'skipped'))
);

create table milkybay.picks (
  id uuid primary key default gen_random_uuid(),
  gameweek_id uuid not null references milkybay.gameweeks(id),
  player_id uuid not null references milkybay.players(id),
  -- Rules §2: W acca (min 1.50, straight win) and Random acca (min 1.70,
  -- bet-builder). Min odds are a UI warning, not a constraint — the admin
  -- transcribes real chat picks and those must never fail an insert.
  acca_kind text not null check (acca_kind in ('W', 'random')),
  game text,                             -- match name ("Norwich v West Brom")
  selection text not null,               -- team to win (W) / free-text builder (random)
  odds numeric not null check (odds >= 1.0),
  odds_display text,                     -- fractional as entered ("4/5"), display only
  result smallint check (result in (0, 1)),
  void_reason text check (void_reason in ('invalid', 'postponed')),
  -- Rules §1: no pick = -1 per missed acca. A no-pick row is just the penalty
  -- marker (odds 1.0, result 0), inserted by the window sweeper.
  is_no_pick boolean not null default false,
  locked boolean not null default false,
  submitted_at timestamptz not null default now(),
  submitted_by uuid references milkybay.players(id),
  unique (gameweek_id, player_id, acca_kind)
);
create index mb_picks_gameweek_idx on milkybay.picks (gameweek_id);
create index mb_picks_player_idx on milkybay.picks (player_id);

create table milkybay.adjustments (
  id uuid primary key default gen_random_uuid(),
  gameweek_id uuid references milkybay.gameweeks(id),
  player_id uuid references milkybay.players(id),
  kind text not null check (kind in ('Bonus', 'Minus')),
  reason text not null,
  score numeric not null,
  created_at timestamptz not null default now()
);

-- Seeded honours: winners get a crown, the 22/23 half season a half crown,
-- last place a wooden spoon ("As long as Milky Bay lives, the memory of
-- finishing last stays with you"). Pre-app seasons can't be computed from
-- scores, so this is a table, not a function.
create table milkybay.honours (
  id uuid primary key default gen_random_uuid(),
  season_label text not null,            -- '22/23', '23/24', ...
  player_id uuid not null references milkybay.players(id),
  award text not null check (award in ('winner', 'half_season_winner', 'wooden_spoon')),
  notes text,
  unique (season_label, award)
);

create table milkybay.app_config (
  key text primary key,
  value jsonb not null
);

create table milkybay.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  action text not null,
  table_name text not null,
  row_id text,
  old_row jsonb,
  new_row jsonb,
  actor_auth uuid,
  actor_player uuid,
  ip text,
  user_agent text
);
create index mb_audit_log_table_row_idx on milkybay.audit_log (table_name, row_id);
create index mb_audit_log_actor_idx on milkybay.audit_log (actor_player, at desc);
