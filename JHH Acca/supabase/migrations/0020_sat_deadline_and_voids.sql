-- 0020 — Saturday-midnight entry deadline + void picks (invalid / postponed / no pick)
--
-- 1. The APP entry window now runs Thursday 18:00 -> Saturday 23:59 UK. The
--    group-chat deadline stays Friday 8 PM (rules §1) — picks are made there
--    and transcribed into the app later, so the app must not lock first.
-- 2. picks.void_reason ('invalid' | 'postponed') records WHY a pick scored 0
--    (rules §6: invalid picks, and matches postponed after the deadline, score
--    0). Settlement stays 0/1; void_reason is set through settle_pick only.
-- 3. "No pick" can now be recorded from Enter Pick (method 'N/A'); at window
--    close insert_no_picks finalises those rows to the sheet convention
--    (odds = team average that week, result 0, locked).
-- 4. tick_gameweeks sweeps no-picks for up to 48h after close even if the
--    week was settled early — settlement (Sat evening) can now precede the
--    window close (Sat midnight), which the old open->closed hook missed.
-- Also restores security_invoker on v_pick_scores (dropped accidentally by
-- 0019's create-or-replace, which omitted the WITH clause).

-- 1) void reason on picks -----------------------------------------------------

alter table picks add column void_reason text
  check (void_reason in ('invalid', 'postponed'));

-- 2) expose it on v_pick_scores (appended last so create-or-replace is legal
--    and v_team_week_scores, which selects named columns, is untouched)

create or replace view v_pick_scores with (security_invoker = on) as
select p.id,
       p.player_id,
       pl.name,
       pl.acca_team,
       coalesce(m.team_name, pl.acca_team) as team_name,
       p.gameweek_id,
       g.gw_date,
       g.season_id,
       s.kind as season_kind,
       p.method,
       p.team,
       p.second_team,
       p.odds,
       p.result,
       p.fixture_id,
       p.fixture_side,
       p.locked,
       p.submitted_at,
       p.submitted_by,
       tw.is_full_sweep and s.double_rule and not g.is_season_final as doubled,
       p.odds * case
                  when tw.is_full_sweep and s.double_rule and not g.is_season_final then 2
                  else 1
                end::numeric as effective_odds,
       case
         when p.result is null then null::integer
         when tw.is_full_sweep then 2
         when p.result = 1 then 1
         when p.method = 'N/A' then -2
         else -1
       end as form_value,
       g.is_international_break,
       p.void_reason
from picks p
  join players pl on pl.id = p.player_id
  join gameweeks g on g.id = p.gameweek_id
  join seasons s on s.id = g.season_id
  left join season_team_members m on m.season_id = g.season_id and m.player_id = p.player_id
  join v_team_weeks tw on tw.gameweek_id = p.gameweek_id
                      and tw.team_name = coalesce(m.team_name, pl.acca_team);

-- 3) settle_pick(p_pick, p_result, p_void_reason) -----------------------------
-- Dropped and recreated (not overloaded) so only one definition exists.
-- A void reason forces result 0: rules §6, void picks score 0.

drop function if exists settle_pick(uuid, smallint);

create function settle_pick(p_pick uuid, p_result smallint, p_void_reason text default null)
returns void
language plpgsql security definer set search_path = public as
$$
declare gw uuid;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  if p_result is not null and p_result not in (0, 1) then
    raise exception 'Result must be 0, 1 or null';
  end if;
  if p_void_reason is not null then
    if p_void_reason not in ('invalid', 'postponed') then
      raise exception 'Void reason must be invalid or postponed';
    end if;
    if p_result is distinct from 0::smallint then
      raise exception 'Void picks score 0 — settle with result 0';
    end if;
  end if;
  update picks set result = p_result, void_reason = p_void_reason
   where id = p_pick returning gameweek_id into gw;
  if gw is null then raise exception 'Pick not found'; end if;
  if not exists (select 1 from picks where gameweek_id = gw and result is null) then
    update gameweeks set status = 'settled' where id = gw and status in ('open', 'closed');
  else
    update gameweeks set status = 'closed' where id = gw and status = 'settled';
  end if;
end
$$;

grant execute on function settle_pick(uuid, smallint, text) to authenticated, service_role;
revoke execute on function settle_pick(uuid, smallint, text) from anon;

-- 4) new gameweeks close Saturday 23:59 UK ------------------------------------

create or replace function create_gameweek(p_date date, p_season uuid default null)
returns uuid
language plpgsql security definer set search_path = public as
$$
declare sid uuid; gid uuid;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  if p_season is not null then
    sid := p_season;
  else
    select id into strict sid from seasons
     where kind <> 'test' and p_date between start_date and end_date;
  end if;
  insert into gameweeks (season_id, gw_date, window_opens, window_closes)
  values (sid, p_date, uk_ts(p_date - 2, '18:00'), uk_ts(p_date, '23:59'))
  returning id into gid;
  return gid;
end
$$;

-- 5) insert_no_picks also finalises manually-recorded no-picks ----------------
-- A player can now mark "no pick" from the app (method 'N/A', placeholder
-- odds, unsettled). At close those rows get the sheet convention applied:
-- odds = team average that week, result 0, locked.

create or replace function insert_no_picks(p_gw uuid)
returns void
language plpgsql security definer set search_path = public as
$$
begin
  update picks pk
     set odds = sub.o, result = 0, locked = true
    from (
      select gp.player_id, coalesce(team_avg.v, gw_avg.v, 1.50) as o
      from gw_participants(p_gw) gp
      left join lateral (
        select round(avg(pk2.odds), 2) as v
        from picks pk2
        join gw_participants(p_gw) gp2 on gp2.player_id = pk2.player_id
        where pk2.gameweek_id = p_gw and pk2.method <> 'N/A'
          and gp2.team_name = gp.team_name
      ) team_avg on true
      left join lateral (
        select round(avg(pk2.odds), 2) as v
        from picks pk2
        where pk2.gameweek_id = p_gw and pk2.method <> 'N/A'
      ) gw_avg on true
    ) sub
   where pk.gameweek_id = p_gw and pk.player_id = sub.player_id
     and pk.method = 'N/A' and pk.result is null;

  insert into picks (gameweek_id, player_id, method, team, second_team, odds, result, locked)
  select p_gw, gp.player_id, 'N/A', 'N/A', null,
         coalesce(team_avg.v, gw_avg.v, 1.50), 0, true
  from gw_participants(p_gw) gp
  left join lateral (
    select round(avg(pk.odds), 2) as v
    from picks pk
    join gw_participants(p_gw) gp2 on gp2.player_id = pk.player_id
    where pk.gameweek_id = p_gw and pk.method <> 'N/A'
      and gp2.team_name = gp.team_name
  ) team_avg on true
  left join lateral (
    select round(avg(pk.odds), 2) as v
    from picks pk
    where pk.gameweek_id = p_gw and pk.method <> 'N/A'
  ) gw_avg on true
  where not exists (
    select 1 from picks x where x.gameweek_id = p_gw and x.player_id = gp.player_id
  )
  on conflict (gameweek_id, player_id) do nothing;
end
$$;

-- 6) tick_gameweeks: sweep for 48h after close, even if settled early ---------

create or replace function tick_gameweeks()
returns void
language plpgsql security definer set search_path = public as
$$
declare gw record;
begin
  update gameweeks set status = 'open'
   where status = 'scheduled'
     and now() >= window_opens
     and now() < window_closes;

  update gameweeks set status = 'closed'
   where status = 'open'
     and now() >= window_closes;

  -- insert_no_picks is idempotent; re-running inside the 48h grace window is
  -- cheap and covers weeks the admin settled before the window closed.
  for gw in
    select id from gameweeks
    where now() >= window_closes
      and now() < window_closes + interval '48 hours'
      and status in ('closed', 'settled')
  loop
    perform insert_no_picks(gw.id);
  end loop;
end
$$;

-- 7) move every not-yet-open window to the new Saturday close -----------------

update gameweeks set window_closes = uk_ts(gw_date, '23:59')
 where status = 'scheduled';

-- 8) live_tick: the gameweek is now still 'open' during Saturday matches ------
-- Only the status test changes; gw_date = today keeps it Saturday-only.

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
    and g.status in ('open', 'closed')
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

