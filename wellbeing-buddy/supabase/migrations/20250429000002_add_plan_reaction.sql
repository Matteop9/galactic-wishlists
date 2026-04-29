alter table public.daily_plans
  add column if not exists reaction text check (reaction in ('good', 'bad', 'push_back'));
