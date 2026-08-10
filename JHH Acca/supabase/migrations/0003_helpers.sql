-- Security-definer helpers. All set search_path to prevent hijacking.

create or replace function current_player_id()
returns uuid
language sql stable security definer set search_path = public as
$$ select id from players where auth_user_id = auth.uid() $$;

create or replace function is_player()
returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from players where auth_user_id = auth.uid()) $$;

create or replace function is_admin()
returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce((select is_admin from players where auth_user_id = auth.uid()), false) $$;

-- UK-local wall-clock -> UTC instant. Postgres's tz database handles BST/GMT,
-- so Fri 20:00 London is always Fri 20:00 London whatever the season.
create or replace function uk_ts(d date, t time)
returns timestamptz
language sql stable as
$$ select (d + t) at time zone 'Europe/London' $$;

-- Window check by TIMESTAMP, not status: a late cron sweep must never let a
-- pick through after Friday 20:00.
create or replace function window_open(p_gw uuid)
returns boolean
language sql stable security definer set search_path = public as
$$
  select exists (
    select 1 from gameweeks g
    where g.id = p_gw
      and g.status in ('scheduled', 'open')
      and now() >= g.window_opens
      and now() < g.window_closes
  )
$$;

-- Who takes part in a gameweek, and on which team. Seasons with
-- season_team_members rows (test/special) use that mapping; league seasons
-- fall back to every player under their acca_team.
create or replace function gw_participants(p_gw uuid)
returns table (player_id uuid, team_name text)
language sql stable security definer set search_path = public as
$$
  with s as (select season_id from gameweeks where id = p_gw)
  select m.player_id, m.team_name
  from season_team_members m join s on m.season_id = s.season_id
  union all
  select p.id, p.acca_team
  from players p
  where not exists (
    select 1 from season_team_members m2 join s on m2.season_id = s.season_id
  )
$$;

-- Can the caller write picks for target_player in this gameweek?
-- True iff they share a team under the gameweek's season mapping.
create or replace function same_team(target_player uuid, p_gw uuid)
returns boolean
language sql stable security definer set search_path = public as
$$
  select exists (
    select 1
    from gw_participants(p_gw) a
    join gw_participants(p_gw) b on b.team_name = a.team_name
    where a.player_id = current_player_id()
      and b.player_id = target_player
  )
$$;

create or replace function claim_player(claim_token uuid)
returns uuid
language plpgsql security definer set search_path = public as
$$
declare pid uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if exists (select 1 from players where auth_user_id = auth.uid()) then
    raise exception 'This login is already linked to a player';
  end if;
  update claim_tokens set claimed_at = now()
   where token = claim_token and claimed_at is null
   returning player_id into pid;
  if pid is null then
    raise exception 'Invalid or already-used claim link';
  end if;
  update players set auth_user_id = auth.uid()
   where id = pid and auth_user_id is null;
  if not found then
    raise exception 'Player already claimed';
  end if;
  return pid;
end
$$;

-- Settlement goes through this RPC (column grants make picks.result
-- un-writable via PostgREST). p_result null un-settles a mistake.
create or replace function settle_pick(p_pick uuid, p_result smallint)
returns void
language plpgsql security definer set search_path = public as
$$
declare gw uuid;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  if p_result is not null and p_result not in (0, 1) then
    raise exception 'Result must be 0, 1 or null';
  end if;
  update picks set result = p_result where id = p_pick returning gameweek_id into gw;
  if gw is null then raise exception 'Pick not found'; end if;
  if not exists (select 1 from picks where gameweek_id = gw and result is null) then
    update gameweeks set status = 'settled' where id = gw and status in ('open', 'closed');
  else
    update gameweeks set status = 'closed' where id = gw and status = 'settled';
  end if;
end
$$;

create or replace function lock_pick(p_pick uuid, p_locked boolean)
returns void
language plpgsql security definer set search_path = public as
$$
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  update picks set locked = p_locked where id = p_pick;
  if not found then raise exception 'Pick not found'; end if;
end
$$;

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
  values (sid, p_date, uk_ts(p_date - 2, '18:00'), uk_ts(p_date - 1, '20:00'))
  returning id into gid;
  return gid;
end
$$;

create or replace function set_gameweek_status(p_gw uuid, p_status text)
returns void
language plpgsql security definer set search_path = public as
$$
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  if p_status not in ('scheduled', 'open', 'closed', 'settled', 'skipped') then
    raise exception 'Bad status %', p_status;
  end if;
  update gameweeks set status = p_status where id = p_gw;
  if not found then raise exception 'Gameweek not found'; end if;
end
$$;

-- Auto no-picks on window close: N/A at the team's average pick odds that
-- week (sheet convention - affects Average Odds stats, never Score).
create or replace function insert_no_picks(p_gw uuid)
returns void
language plpgsql security definer set search_path = public as
$$
begin
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

-- Fixture matching (manual or LLM-assisted). fixture null = "no live option".
create or replace function match_pick(p_pick uuid, p_fixture bigint, p_side text, p_confidence numeric default 1.0)
returns void
language plpgsql security definer set search_path = public as
$$
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  if p_side is not null and p_side not in ('HOME', 'AWAY') then
    raise exception 'Side must be HOME, AWAY or null';
  end if;
  update picks
     set fixture_id = p_fixture, fixture_side = p_side,
         match_confidence = case when p_fixture is null then null else p_confidence end
   where id = p_pick;
  if not found then raise exception 'Pick not found'; end if;
end
$$;

-- Upholding does NOT auto-edit the pick: the admin fixes it separately so
-- every ledger change is an explicit, audited write.
create or replace function resolve_dispute(p_dispute uuid, p_status text, p_note text)
returns void
language plpgsql security definer set search_path = public as
$$
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  if p_status not in ('upheld', 'rejected') then
    raise exception 'Status must be upheld or rejected';
  end if;
  update disputes
     set status = p_status, resolution_note = p_note,
         resolved_by = current_player_id(), resolved_at = now()
   where id = p_dispute and status = 'open';
  if not found then raise exception 'Dispute not found or already resolved'; end if;
end
$$;

-- Generic audit trigger: full before/after, actor, and client IP/user-agent
-- from PostgREST's forwarded request headers. System writes (cron) log nulls.
create or replace function audit()
returns trigger
language plpgsql security definer set search_path = public as
$$
declare
  hdrs jsonb;
  v_ip text;
  v_ua text;
  rid text;
begin
  begin
    hdrs := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    hdrs := null;
  end;
  if hdrs is not null then
    v_ip := nullif(trim(split_part(hdrs ->> 'x-forwarded-for', ',', 1)), '');
    v_ua := hdrs ->> 'user-agent';
  end if;
  rid := coalesce(
    case when tg_op = 'DELETE' then to_jsonb(old) ->> 'id' else to_jsonb(new) ->> 'id' end,
    case when tg_op = 'DELETE' then to_jsonb(old) ->> 'token' else to_jsonb(new) ->> 'token' end
  );
  insert into audit_log (action, table_name, row_id, old_row, new_row,
                         actor_auth, actor_player, ip, user_agent)
  values (
    tg_op, tg_table_name, rid,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end,
    auth.uid(), current_player_id(), v_ip, v_ua
  );
  return coalesce(new, old);
end
$$;

-- Stamp who entered/edited a pick and when the odds were locked in. Only
-- fires when the substance changes, so settlement doesn't overwrite the
-- odds-lock timestamp.
create or replace function stamp_pick()
returns trigger
language plpgsql security definer set search_path = public as
$$
begin
  if tg_op = 'INSERT'
     or (new.method, new.team, new.second_team, new.odds)
        is distinct from (old.method, old.team, old.second_team, old.odds) then
    new.submitted_at := now();
    new.submitted_by := coalesce(current_player_id(), new.submitted_by);
  end if;
  return new;
end
$$;
