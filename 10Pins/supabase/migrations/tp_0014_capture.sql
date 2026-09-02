-- tp_0014 — milestone 7: the scorecard capture pipeline (spec §6).
--
-- Three pieces of server furniture. The extraction itself lives in the
-- `extract-scorecard` Edge Function; the engine reconciliation stays in the
-- client so there is exactly ONE copy of the scoring engine (see the note in
-- the function's header).

-- 1. Private bucket for monitor photos. Path is `{profile_id}/{uuid}.jpg`, so
-- the folder name is the owner and the policies are a folder check. Nobody
-- reads anyone else's photo from the client; the Edge Function reads with the
-- service role, and the review screen reads its own upload back by signed URL.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('scorecards', 'scorecards', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy scorecards_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'scorecards'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy scorecards_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'scorecards'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- A scan that fails review is a photo nobody wants kept.
create policy scorecards_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'scorecards'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2. Scan log. Two jobs: the per-user daily cap the spec asks for (a guard
-- against a runaway client, not a product limit), and a record of what the
-- model cost. Written by the function under the service role only —
-- `authenticated` can read its own rows and nothing else, so the cap cannot
-- be dodged by deleting history.
create table tenpins.scan_events (
  id bigint generated always as identity primary key,
  profile_id uuid not null references tenpins.profiles on delete cascade,
  at timestamptz not null default now(),
  ok boolean not null default true,
  model text,
  prompt_tokens int,
  completion_tokens int,
  cost_usd numeric,
  note text
);

create index scan_events_profile_at_idx on tenpins.scan_events (profile_id, at desc);

alter table tenpins.scan_events enable row level security;
revoke insert, update, delete on tenpins.scan_events from authenticated;
revoke all on tenpins.scan_events from anon;

create policy scan_events_select_own on tenpins.scan_events
  for select to authenticated
  using (profile_id = auth.uid());

-- How many scans this profile has run in the last 24h. Definer so the
-- function can ask cheaply, and so a future "N scans left today" line on the
-- client can use the same number the cap is enforced on.
create or replace function tenpins.scans_today(p_profile uuid default auth.uid())
returns int
language sql stable security definer set search_path = tenpins
as $$
  select count(*)::int
  from scan_events
  where profile_id = coalesce(p_profile, auth.uid())
    and at > now() - interval '24 hours';
$$;

revoke execute on function tenpins.scans_today(uuid) from anon, public;
grant execute on function tenpins.scans_today(uuid) to authenticated, service_role;

-- 3. Model routing, so the model can change without redeploying the function
-- (The Acca's llm_config pattern). Service-role only: the client has no
-- business knowing or setting which model reads the photo.
create table tenpins.vision_config (
  job text primary key,
  model text not null,
  max_tokens int not null default 4000,
  daily_cap int not null default 30,
  enabled boolean not null default true
);

alter table tenpins.vision_config enable row level security;
revoke all on tenpins.vision_config from anon, authenticated;
grant all on tenpins.vision_config to service_role;

insert into tenpins.vision_config (job, model, max_tokens, daily_cap)
values ('extract_scorecard', 'anthropic/claude-sonnet-5', 4000, 30);
