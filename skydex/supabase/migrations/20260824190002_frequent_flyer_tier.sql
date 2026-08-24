-- Frequent Flyer premium tier (one-off lifetime upgrade; FREE for 2026 signups = "Founding Flyers").
-- Benefits are enforced in the ticket RPCs (2x daily grant, higher caps) and the UI (star, no ads).
alter table public.profiles
  add column frequent_flyer boolean not null default false,
  add column frequent_flyer_since timestamptz,
  add column frequent_flyer_source text check (frequent_flyer_source in ('founder','purchase','admin')),
  add column frequent_flyer_txn text;

-- Founding Flyers: everyone who signed up before the cutoff gets Frequent Flyer included, forever.
-- (claim_daily_tickets also grants this lazily, covering signups through 2026-12-31.)
update public.profiles
   set frequent_flyer = true,
       frequent_flyer_since = now(),
       frequent_flyer_source = 'founder'
 where created_at < timestamptz '2027-01-01T00:00:00Z';

-- Thread frequent_flyer through the public feed views so the star can render next to handles.
-- create or replace view can only APPEND columns, so it goes last.
create or replace view public.feed_sightings as
 select s.id,
    s.created_at,
    s.captured_at,
    s.callsign,
    s.registration,
    s.aircraft_type,
    s.airline,
    s.altitude_m,
    s.rarity,
    s.verified,
    s.photo_path,
    s.user_id,
    p.handle,
    s.origin,
    s.destination,
    p.avatar_seed,
    p.is_admin,
    s.flight_no,
    s.painted_as,
    s.operating_as,
    s.eta,
    s.gspeed_kt,
    s.vspeed_fpm,
    coalesce(rc.n, 0) as reaction_count,
    p.frequent_flyer
   from sightings s
     join profiles p on p.id = s.user_id
     left join lateral ( select count(*)::integer as n
           from reactions r
          where r.sighting_id = s.id and r.emoji = '🛫'::text) rc on true
  where s.verified = true and (s.review_status is null or s.review_status = 'cleared'::text);

create or replace view public.all_sightings as
 select s.id,
    s.created_at,
    s.captured_at,
    s.callsign,
    s.registration,
    s.aircraft_type,
    s.airline,
    s.altitude_m,
    s.rarity,
    s.verified,
    s.photo_path,
    s.user_id,
    p.handle,
    s.origin,
    s.destination,
    p.avatar_seed,
    p.is_admin,
    s.flight_no,
    s.painted_as,
    s.operating_as,
    s.eta,
    s.gspeed_kt,
    s.vspeed_fpm,
    coalesce(rc.n, 0) as reaction_count,
    p.frequent_flyer
   from sightings s
     join profiles p on p.id = s.user_id
     left join lateral ( select count(*)::integer as n
           from reactions r
          where r.sighting_id = s.id and r.emoji = '🛫'::text) rc on true;

create or replace view public.shared_sightings as
 select s.id,
    s.created_at,
    s.captured_at,
    s.callsign,
    s.registration,
    s.aircraft_type,
    s.airline,
    s.altitude_m,
    s.rarity,
    s.verified,
    s.photo_path,
    s.user_id,
    p.handle,
    s.origin,
    s.destination,
    p.avatar_seed,
    p.is_admin,
    s.flight_no,
    s.painted_as,
    s.operating_as,
    s.eta,
    s.gspeed_kt,
    s.vspeed_fpm,
    p.frequent_flyer
   from sightings s
     join profiles p on p.id = s.user_id
  where s.review_status is null or s.review_status = 'cleared'::text;

-- leaderboard(): the RETURNS TABLE shape gains frequent_flyer, so drop + recreate.
drop function public.leaderboard(text, text);

create function public.leaderboard(p_metric text, p_window text default 'all'::text)
 returns table(user_id uuid, handle text, avatar_seed text, is_admin boolean, frequent_flyer boolean, value bigint, rank bigint)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  since timestamptz := case p_window
    when 'today' then date_trunc('day', now())
    when 'week'  then date_trunc('week', now())
    when 'month' then date_trunc('month', now())
    else '-infinity'::timestamptz
  end;
begin
  if p_metric = 'spots' then
    return query
      select s.user_id, p.handle, p.avatar_seed, p.is_admin, p.frequent_flyer,
             count(*)::bigint as value,
             rank() over (order by count(*) desc) as rank
      from sightings s join profiles p on p.id = s.user_id
      where s.verified and s.captured_at >= since
      group by s.user_id, p.handle, p.avatar_seed, p.is_admin, p.frequent_flyer
      order by value desc limit 50;

  elsif p_metric = 'types' then
    return query
      select s.user_id, p.handle, p.avatar_seed, p.is_admin, p.frequent_flyer,
             count(distinct s.aircraft_type)::bigint as value,
             rank() over (order by count(distinct s.aircraft_type) desc) as rank
      from sightings s join profiles p on p.id = s.user_id
      where s.verified and s.captured_at >= since and s.aircraft_type is not null
      group by s.user_id, p.handle, p.avatar_seed, p.is_admin, p.frequent_flyer
      order by value desc limit 50;

  elsif p_metric = 'airlines' then
    return query
      select s.user_id, p.handle, p.avatar_seed, p.is_admin, p.frequent_flyer,
             count(distinct s.airline)::bigint as value,
             rank() over (order by count(distinct s.airline) desc) as rank
      from sightings s join profiles p on p.id = s.user_id
      where s.verified and s.captured_at >= since and s.airline is not null
      group by s.user_id, p.handle, p.avatar_seed, p.is_admin, p.frequent_flyer
      order by value desc limit 50;

  elsif p_metric = 'airports' then
    return query
      with ap as (
        select s.user_id, a.code
        from sightings s
        cross join lateral (values (s.origin), (s.destination)) as a(code)
        where s.verified and s.captured_at >= since and a.code is not null
      )
      select ap.user_id, p.handle, p.avatar_seed, p.is_admin, p.frequent_flyer,
             count(distinct ap.code)::bigint as value,
             rank() over (order by count(distinct ap.code) desc) as rank
      from ap join profiles p on p.id = ap.user_id
      group by ap.user_id, p.handle, p.avatar_seed, p.is_admin, p.frequent_flyer
      order by value desc limit 50;

  elsif p_metric = 'rarity' then
    return query
      with d as (
        select distinct s.user_id, s.aircraft_type
        from sightings s
        where s.verified and s.captured_at >= since and s.aircraft_type is not null
      ),
      w as (
        select d.user_id,
               sum(case coalesce(at.rarity, 'common')
                     when 'legendary' then 25 when 'epic' then 10
                     when 'rare' then 5 when 'uncommon' then 2 else 1 end)::bigint as value
        from d left join aircraft_types at on at.code = d.aircraft_type
        group by d.user_id
      )
      select w.user_id, p.handle, p.avatar_seed, p.is_admin, p.frequent_flyer, w.value,
             rank() over (order by w.value desc) as rank
      from w join profiles p on p.id = w.user_id
      order by value desc limit 50;
  end if;
end;
$function$;

grant execute on function public.leaderboard(text, text) to anon, authenticated;

-- Purchase path for 2027+ signups (Phase-5 RevenueCat webhook). Service-role ONLY:
-- a user-callable version would be a free-upgrade hole.
create or replace function public.grant_frequent_flyer(p_user uuid, p_txn text)
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_already boolean;
begin
  select frequent_flyer into v_already from profiles where id = p_user;
  if not found then
    return json_build_object('ok', false, 'error', 'No such user.');
  end if;
  if v_already then
    return json_build_object('ok', true, 'granted', false, 'already', true);
  end if;
  update profiles
     set frequent_flyer = true,
         frequent_flyer_since = now(),
         frequent_flyer_source = 'purchase',
         frequent_flyer_txn = p_txn
   where id = p_user;
  return json_build_object('ok', true, 'granted', true);
end;
$function$;

revoke execute on function public.grant_frequent_flyer(uuid, text) from public, anon, authenticated;
grant execute on function public.grant_frequent_flyer(uuid, text) to service_role;
