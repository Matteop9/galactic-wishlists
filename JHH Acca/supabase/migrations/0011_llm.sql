-- LLM routing config + usage log. All calls go via OpenRouter (user
-- decision) from Edge Functions; the key has a spending limit, so every
-- call is logged and surfaced on the admin dashboard.

create table llm_config (
  job text primary key,
  model text not null,
  max_tokens int not null default 2000,
  enabled boolean not null default true
);

create table llm_usage (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  job text not null,
  model text not null,
  prompt_tokens int,
  completion_tokens int,
  total_tokens int,
  cost_usd numeric,                      -- from OpenRouter usage accounting
  ok boolean not null default true,
  note text
);

alter table llm_config enable row level security;
alter table llm_usage enable row level security;
revoke all on llm_config from anon;
revoke all on llm_usage from anon;
revoke insert, update, delete on llm_usage from authenticated;

create policy llm_config_admin on llm_config for all to authenticated
  using (is_admin()) with check (is_admin());
create policy llm_usage_admin_read on llm_usage for select to authenticated
  using (is_admin());

-- Model strings are OpenRouter ids, swappable without redeploying.
insert into llm_config (job, model, max_tokens) values
  ('pick_matching', 'deepseek/deepseek-chat', 2000);
