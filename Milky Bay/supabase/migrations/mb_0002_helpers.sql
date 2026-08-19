-- Helpers — clones of the JHH patterns (0003/0020) with search_path bound to
-- milkybay. Every security-definer function MUST set search_path = milkybay,
-- or its bare table references would resolve to public.* and silently
-- authorize against the other league's players.

create or replace function milkybay.current_player_id()
returns uuid
language sql stable security definer set search_path = milkybay as
$$ select id from players where auth_user_id = auth.uid() $$;

create or replace function milkybay.is_player()
returns boolean
language sql stable security definer set search_path = milkybay as
$$ select exists (select 1 from players where auth_user_id = auth.uid()) $$;

create or replace function milkybay.is_admin()
returns boolean
language sql stable security definer set search_path = milkybay as
$$ select coalesce((select is_admin from players where auth_user_id = auth.uid()), false) $$;

create or replace function milkybay.uk_ts(d date, t time)
returns timestamptz
language sql stable as
$$ select (d + t) at time zone 'Europe/London' $$;

-- Window check by TIMESTAMP, not status (a late cron sweep must never let a
-- pick through). The real deadline (Thu 20:00) is enforced socially in the
-- group chat; the app window is the generous transcription window.
create or replace function milkybay.window_open(p_gw uuid)
returns boolean
language sql stable security definer set search_path = milkybay as
$$
  select exists (
    select 1 from gameweeks g
    where g.id = p_gw
      and g.status in ('scheduled', 'open')
      and now() >= g.window_opens
      and now() < g.window_closes
  )
$$;

-- Settlement RPC (picks.result is un-writable via PostgREST). A void reason
-- forces result 0: rules §9, void picks score 0 with no knock-ons.
create or replace function milkybay.settle_pick(p_pick uuid, p_result smallint, p_void_reason text default null)
returns void
language plpgsql security definer set search_path = milkybay as
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

create or replace function milkybay.lock_pick(p_pick uuid, p_locked boolean)
returns void
language plpgsql security definer set search_path = milkybay as
$$
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  update picks set locked = p_locked where id = p_pick;
  if not found then raise exception 'Pick not found'; end if;
end
$$;

create or replace function milkybay.set_gameweek_status(p_gw uuid, p_status text)
returns void
language plpgsql security definer set search_path = milkybay as
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

-- gw_date is the Saturday. Window opens Wednesday noon (bets open Wed 6pm in
-- the chat) and closes Saturday midnight — transcription window, not the
-- betting deadline.
create or replace function milkybay.create_gameweek(p_date date, p_season uuid default null)
returns uuid
language plpgsql security definer set search_path = milkybay as
$$
declare sid uuid; gid uuid;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  if p_season is not null then
    sid := p_season;
  else
    select id into strict sid from seasons
     where p_date between start_date and end_date;
  end if;
  insert into gameweeks (season_id, gw_date, window_opens, window_closes)
  values (sid, p_date, uk_ts(p_date - 3, '12:00'), uk_ts(p_date, '23:59'))
  returning id into gid;
  return gid;
end
$$;

-- No pick = a -1 marker per missed acca (rules §1). Non-playing rows (admin
-- accounts) are exempt.
create or replace function milkybay.insert_no_picks(p_gw uuid)
returns void
language sql security definer set search_path = milkybay as
$$
  insert into picks (gameweek_id, player_id, acca_kind, selection, odds, result, is_no_pick, locked)
  select p_gw, pl.id, k.kind, 'No pick', 1.0, 0, true, true
  from players pl
  cross join (values ('W'), ('random')) k(kind)
  where pl.plays
    and not exists (
      select 1 from picks x
      where x.gameweek_id = p_gw and x.player_id = pl.id and x.acca_kind = k.kind
    )
  on conflict do nothing
$$;

-- Window sweeper (JHH 0020 pattern): opens/closes windows, then sweeps
-- no-picks for 48h after close so an early settle can't skip them.
create or replace function milkybay.tick_gameweeks()
returns void
language plpgsql security definer set search_path = milkybay as
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

-- Audit trigger — identical to JHH's, writing to milkybay.audit_log with the
-- milkybay player as actor.
create or replace function milkybay.audit()
returns trigger
language plpgsql security definer set search_path = milkybay as
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
  rid := case when tg_op = 'DELETE' then to_jsonb(old) ->> 'id' else to_jsonb(new) ->> 'id' end;
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

-- Stamp who entered/edited a pick; only when the substance changes, so
-- settlement doesn't overwrite the odds-lock timestamp.
create or replace function milkybay.stamp_pick()
returns trigger
language plpgsql security definer set search_path = milkybay as
$$
begin
  if tg_op = 'INSERT'
     or (new.game, new.selection, new.odds)
        is distinct from (old.game, old.selection, old.odds) then
    new.submitted_at := now();
    new.submitted_by := coalesce(current_player_id(), new.submitted_by);
  end if;
  return new;
end
$$;
