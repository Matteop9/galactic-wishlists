-- App Store guideline 5.1.2: the user must explicitly agree, inside the app,
-- before their username / photos / stats are published — in particular before
-- their score reaches the global leaderboards.
--
--   public_consent_at  null  = hasn't agreed yet → kept off the leaderboards
--   leaderboard_opt_in false = agreed, but chose not to be ranked (Settings)
alter table public.profiles
  add column if not exists public_consent_at timestamptz,
  add column if not exists leaderboard_opt_in boolean not null default true;

comment on column public.profiles.public_consent_at is
  'When the user explicitly agreed, in-app, to their username, photos and sighting stats being published to the public feed and global leaderboards. Null = not agreed → excluded from leaderboard().';
comment on column public.profiles.leaderboard_opt_in is
  'User-controlled (Settings -> Public sharing). False removes them from the global leaderboards while keeping the rest of the app.';

-- leaderboard(): same signature and return shape, now gated on consent.
create or replace function public.leaderboard(p_metric text, p_window text default 'all'::text)
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
        and p.public_consent_at is not null and p.leaderboard_opt_in
      group by s.user_id, p.handle, p.avatar_seed, p.is_admin, p.frequent_flyer
      order by value desc limit 50;

  elsif p_metric = 'types' then
    return query
      select s.user_id, p.handle, p.avatar_seed, p.is_admin, p.frequent_flyer,
             count(distinct s.aircraft_type)::bigint as value,
             rank() over (order by count(distinct s.aircraft_type) desc) as rank
      from sightings s join profiles p on p.id = s.user_id
      where s.verified and s.captured_at >= since and s.aircraft_type is not null
        and p.public_consent_at is not null and p.leaderboard_opt_in
      group by s.user_id, p.handle, p.avatar_seed, p.is_admin, p.frequent_flyer
      order by value desc limit 50;

  elsif p_metric = 'airlines' then
    return query
      select s.user_id, p.handle, p.avatar_seed, p.is_admin, p.frequent_flyer,
             count(distinct s.airline)::bigint as value,
             rank() over (order by count(distinct s.airline) desc) as rank
      from sightings s join profiles p on p.id = s.user_id
      where s.verified and s.captured_at >= since and s.airline is not null
        and p.public_consent_at is not null and p.leaderboard_opt_in
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
      where p.public_consent_at is not null and p.leaderboard_opt_in
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
      where p.public_consent_at is not null and p.leaderboard_opt_in
      order by value desc limit 50;
  end if;
end;
$function$;

grant execute on function public.leaderboard(text, text) to anon, authenticated;
