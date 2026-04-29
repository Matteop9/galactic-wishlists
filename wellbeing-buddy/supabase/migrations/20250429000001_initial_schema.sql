-- Enable UUID extension (already available in Supabase by default)
create extension if not exists "uuid-ossp";

-- ─── user_preferences ────────────────────────────────────────────────────────
create table public.user_preferences (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references auth.users(id) on delete cascade unique,
  gym_access       boolean not null default false,
  home_access      boolean not null default true,
  outdoor_access   boolean not null default true,
  equipment        text[]  not null default '{}',
  favourites       text[]  not null default '{}',
  avoid            text[]  not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

create policy "owner_all" on public.user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── health_metrics ───────────────────────────────────────────────────────────
create table public.health_metrics (
  id                        uuid primary key default uuid_generate_v4(),
  user_id                   uuid not null references auth.users(id) on delete cascade,
  date                      date not null,
  steps                     integer,
  active_energy_kcal        numeric(8,2),
  resting_heart_rate_bpm    numeric(6,2),
  hrv_ms                    numeric(6,2),
  sleep_duration_minutes    integer,
  sleep_deep_minutes        integer,
  sleep_rem_minutes         integer,
  sleep_core_minutes        integer,
  sleep_awake_minutes       integer,
  respiratory_rate_bpm      numeric(6,2),
  spo2_pct                  numeric(5,2),
  body_weight_kg            numeric(6,2),
  stand_hours               integer,
  mindful_minutes           integer,
  raw                       jsonb,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  unique (user_id, date)
);

create index health_metrics_user_date on public.health_metrics (user_id, date desc);

alter table public.health_metrics enable row level security;

create policy "owner_all" on public.health_metrics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Service role bypasses RLS for Worker inserts — no extra policy needed.

-- ─── daily_checkins ───────────────────────────────────────────────────────────
create table public.daily_checkins (
  id                      uuid primary key default uuid_generate_v4(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  date                    date not null,
  -- morning
  morning_energy          smallint check (morning_energy between 1 and 5),
  morning_soreness        smallint check (morning_soreness between 1 and 5),
  morning_mood            smallint check (morning_mood between 1 and 5),
  morning_gym_access      boolean,
  morning_available_minutes smallint check (morning_available_minutes between 0 and 480),
  morning_checked_in_at   timestamptz,
  -- evening
  evening_mood            smallint check (evening_mood between 1 and 5),
  evening_energy          smallint check (evening_energy between 1 and 5),
  evening_stress          smallint check (evening_stress between 1 and 5),
  evening_food_quality    smallint check (evening_food_quality between 1 and 5),
  evening_soreness        smallint check (evening_soreness between 1 and 5),
  evening_alcohol_units   smallint check (evening_alcohol_units between 0 and 20),
  evening_checked_in_at   timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (user_id, date)
);

create index daily_checkins_user_date on public.daily_checkins (user_id, date desc);

alter table public.daily_checkins enable row level security;

create policy "owner_all" on public.daily_checkins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── daily_plans ──────────────────────────────────────────────────────────────
create table public.daily_plans (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  date                  date not null,
  provisional_plan      text,                    -- Claude's evening preview
  morning_conversation  jsonb,                   -- [{role, content}] message array
  final_plan            text,                    -- locked after morning chat
  actual_activity       text,                    -- logged next evening
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (user_id, date)
);

create index daily_plans_user_date on public.daily_plans (user_id, date desc);

alter table public.daily_plans enable row level security;

create policy "owner_all" on public.daily_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── insights ─────────────────────────────────────────────────────────────────
create table public.insights (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  week_start  date not null,
  summary     text not null,
  created_at  timestamptz not null default now(),
  unique (user_id, week_start)
);

create index insights_user_week on public.insights (user_id, week_start desc);

alter table public.insights enable row level security;

create policy "owner_all" on public.insights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── updated_at trigger ───────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.user_preferences
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.health_metrics
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.daily_checkins
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.daily_plans
  for each row execute function public.set_updated_at();
