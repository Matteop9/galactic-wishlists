-- Live scores layer, entirely in Postgres: pg_net for HTTP, Vault for the
-- API tokens, pg_cron for the tick. One server-side request per minute
-- during the Saturday live window (10% of football-data's free-tier limit);
-- clients never call the API. The LLM pick->fixture matching request also
-- runs through here (OpenRouter), with the admin queue as fallback.

create table poll_requests (
  request_id bigint primary key,        -- net request id
  kind text not null check (kind in ('fixtures', 'live', 'matching')),
  gameweek_id uuid references gameweeks(id),
  created_at timestamptz not null default now()
);

create table match_suggestions (
  pick_id uuid primary key references picks(id) on delete cascade,
  fixture_id bigint references fixtures(id),
  fixture_side text check (fixture_side in ('HOME', 'AWAY')),
  confidence numeric,
  created_at timestamptz not null default now()
);

alter table poll_requests enable row level security;
alter table match_suggestions enable row level security;
revoke all on poll_requests from anon, authenticated;
revoke all on match_suggestions from anon, authenticated;
grant select, delete on match_suggestions to authenticated;
create policy match_suggestions_admin on match_suggestions for all to authenticated
  using ((select is_admin())) with check ((select is_admin()));

-- Vault accessor: clients can never execute this.
create or replace function get_secret(p_name text)
returns text
language sql stable security definer set search_path = '' as
$$ select decrypted_secret from vault.decrypted_secrets where name = p_name $$;
revoke execute on function get_secret(text) from anon, authenticated, public;

-- Admin: pull the weekend's fixture list for a gameweek (1 API call).
create or replace function fetch_weekend_fixtures(p_gw uuid)
returns void
language plpgsql security definer set search_path = public as
$$
declare d date; req bigint;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  select gw_date into d from gameweeks where id = p_gw;
  if d is null then raise exception 'Gameweek not found'; end if;
  req := net.http_get(
    url := format('https://api.football-data.org/v4/matches?dateFrom=%s&dateTo=%s', d, d + 1),
    headers := jsonb_build_object('X-Auth-Token', get_secret('FOOTBALL_DATA_TOKEN')),
    timeout_milliseconds := 8000
  );
  insert into poll_requests (request_id, kind, gameweek_id) values (req, 'fixtures', p_gw);
end
$$;

-- Admin: send unmatched picks + fetched fixtures to the LLM (OpenRouter).
-- Confidence >= 0.8 auto-applies when the response lands; the rest queue in
-- match_suggestions for one-tap confirm. Works without ever being called -
-- manual matching via match_pick() is the fallback.
create or replace function request_pick_matching(p_gw uuid)
returns void
language plpgsql security definer set search_path = public as
$$
declare
  cfg record;
  fixtures_json jsonb;
  picks_json jsonb;
  req bigint;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  select * into cfg from llm_config where job = 'pick_matching' and enabled;
  if cfg is null then raise exception 'pick_matching is disabled in llm_config'; end if;

  select jsonb_agg(jsonb_build_object(
           'fixture_id', f.id, 'competition', f.competition,
           'home', f.home_team, 'away', f.away_team, 'kickoff', f.kickoff))
    into fixtures_json
  from fixtures f where f.gameweek_id = p_gw;
  if fixtures_json is null then raise exception 'Fetch fixtures first'; end if;

  select jsonb_agg(jsonb_build_object(
           'pick_id', p.id, 'player', pl.name, 'method', p.method,
           'team', p.team, 'second_team', p.second_team))
    into picks_json
  from picks p join players pl on pl.id = p.player_id
  where p.gameweek_id = p_gw and p.method <> 'N/A' and p.fixture_id is null;
  if picks_json is null then raise exception 'No unmatched picks'; end if;

  req := net.http_post(
    url := 'https://openrouter.ai/api/v1/chat/completions',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || get_secret('OPENROUTER_API_KEY'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'model', cfg.model,
      'max_tokens', cfg.max_tokens,
      'usage', jsonb_build_object('include', true),
      'messages', jsonb_build_array(
        jsonb_build_object('role', 'system', 'content',
          'You match football accumulator picks (WhatsApp shorthand like "W.Ham", "Hudds") to a fixture list. '
          || 'For method Win, side = which side the picked team is (HOME or AWAY). For BTTS, side = null and the fixture must contain both named teams. '
          || 'If no fixture in the list clearly matches, return fixture_id null - NEVER guess. '
          || 'Reply with a STRICT JSON array only, no prose, no code fences: '
          || '[{"pick_id":"uuid","fixture_id":123 or null,"side":"HOME"|"AWAY"|null,"confidence":0.0-1.0}]'),
        jsonb_build_object('role', 'user', 'content',
          'FIXTURES: ' || fixtures_json::text || E'\n\nPICKS: ' || picks_json::text)
      )
    ),
    timeout_milliseconds := 30000
  );
  insert into poll_requests (request_id, kind, gameweek_id) values (req, 'matching', p_gw);
end
$$;
grant execute on function fetch_weekend_fixtures(uuid) to authenticated;
grant execute on function request_pick_matching(uuid) to authenticated;

-- Ingest completed HTTP responses.
create or replace function process_poll_responses()
returns void
language plpgsql security definer set search_path = public as
$$
declare
  r record;
  body jsonb;
  content text;
  sugg jsonb;
  parsed jsonb;
begin
  for r in
    select pr.request_id, pr.kind, pr.gameweek_id, hr.status_code, hr.content as raw
    from poll_requests pr
    join net._http_response hr on hr.id = pr.request_id
  loop
    begin
      if r.kind in ('fixtures', 'live') then
        if r.status_code = 200 then
          body := r.raw::jsonb;
          insert into fixtures (id, gameweek_id, competition, home_team, away_team,
                                kickoff, status, home_score, away_score, minute, last_polled)
          select (m ->> 'id')::bigint, r.gameweek_id,
                 coalesce(m -> 'competition' ->> 'code', '?'),
                 coalesce(m -> 'homeTeam' ->> 'shortName', m -> 'homeTeam' ->> 'name', '?'),
                 coalesce(m -> 'awayTeam' ->> 'shortName', m -> 'awayTeam' ->> 'name', '?'),
                 (m ->> 'utcDate')::timestamptz,
                 coalesce(m ->> 'status', 'TIMED'),
                 (m -> 'score' -> 'fullTime' ->> 'home')::int,
                 (m -> 'score' -> 'fullTime' ->> 'away')::int,
                 m ->> 'minute',
                 now()
          from jsonb_array_elements(body -> 'matches') m
          on conflict (id) do update
            set status = excluded.status,
                home_score = excluded.home_score,
                away_score = excluded.away_score,
                minute = excluded.minute,
                last_polled = now();
        end if;
        -- non-200 (429 etc.): keep last-known scores, just drop the request

      elsif r.kind = 'matching' then
        if r.status_code = 200 then
          body := r.raw::jsonb;
          content := body -> 'choices' -> 0 -> 'message' ->> 'content';
          -- strip accidental code fences despite instructions
          content := regexp_replace(content, '^\s*```(json)?\s*|\s*```\s*$', '', 'g');
          parsed := content::jsonb;
          for sugg in select * from jsonb_array_elements(parsed)
          loop
            if (sugg ->> 'fixture_id') is not null
               and coalesce((sugg ->> 'confidence')::numeric, 0) >= 0.8 then
              update picks
                 set fixture_id = (sugg ->> 'fixture_id')::bigint,
                     fixture_side = nullif(sugg ->> 'side', 'null'),
                     match_confidence = (sugg ->> 'confidence')::numeric
               where id = (sugg ->> 'pick_id')::uuid
                 and gameweek_id = r.gameweek_id
                 and fixture_id is null;
            else
              insert into match_suggestions (pick_id, fixture_id, fixture_side, confidence)
              values ((sugg ->> 'pick_id')::uuid,
                      (sugg ->> 'fixture_id')::bigint,
                      nullif(sugg ->> 'side', 'null'),
                      (sugg ->> 'confidence')::numeric)
              on conflict (pick_id) do update
                set fixture_id = excluded.fixture_id,
                    fixture_side = excluded.fixture_side,
                    confidence = excluded.confidence,
                    created_at = now();
            end if;
          end loop;
          insert into llm_usage (job, model, prompt_tokens, completion_tokens, total_tokens, cost_usd, ok)
          values ('pick_matching',
                  coalesce(body ->> 'model', 'unknown'),
                  (body -> 'usage' ->> 'prompt_tokens')::int,
                  (body -> 'usage' ->> 'completion_tokens')::int,
                  (body -> 'usage' ->> 'total_tokens')::int,
                  (body -> 'usage' ->> 'cost')::numeric,
                  true);
        else
          insert into llm_usage (job, model, ok, note)
          values ('pick_matching', 'unknown', false,
                  'HTTP ' || r.status_code || ': ' || left(coalesce(r.raw, ''), 300));
        end if;
      end if;
    exception when others then
      insert into llm_usage (job, model, ok, note)
      values (r.kind, 'processor', false, left(sqlerrm, 300));
    end;
    delete from poll_requests where request_id = r.request_id;
  end loop;
end
$$;

-- The minute tick: ingest responses, then submit at most ONE live poll when
-- inside the Saturday window with a live-enabled, fixture-matched gameweek.
create or replace function live_tick()
returns void
language plpgsql security definer set search_path = public as
$$
declare
  today_uk date := (now() at time zone 'Europe/London')::date;
  time_uk time := (now() at time zone 'Europe/London')::time;
  win jsonb;
  gw record;
  req bigint;
begin
  perform process_poll_responses();

  select value into win from app_config where key = 'live_window';
  if win is null then return; end if;
  if time_uk < (win ->> 'start')::time or time_uk > (win ->> 'end')::time then return; end if;

  select g.* into gw
  from gameweeks g
  where g.gw_date = today_uk
    and g.live_enabled
    and g.status = 'closed'
    and exists (select 1 from picks p where p.gameweek_id = g.id and p.fixture_id is not null)
  limit 1;
  if gw is null then return; end if;

  -- in-flight guard: never stack requests
  if exists (select 1 from poll_requests where kind = 'live') then return; end if;

  req := net.http_get(
    url := format('https://api.football-data.org/v4/matches?dateFrom=%s&dateTo=%s', today_uk, today_uk + 1),
    headers := jsonb_build_object('X-Auth-Token', get_secret('FOOTBALL_DATA_TOKEN')),
    timeout_milliseconds := 8000
  );
  insert into poll_requests (request_id, kind, gameweek_id) values (req, 'live', gw.id);
end
$$;
revoke execute on function live_tick() from anon, authenticated;
revoke execute on function process_poll_responses() from anon, authenticated;

select cron.schedule('live-tick', '* * * * *', 'select public.live_tick()');
