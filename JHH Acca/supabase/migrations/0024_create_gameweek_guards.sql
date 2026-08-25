-- create_gameweek robustness (review 2026-08-25): the old body did
-- `select ... into strict sid`, which raises a raw P0002 the admin sees verbatim
-- for any date outside a season (e.g. after 2027-05-22, when the seeded calendar
-- runs out), and silently assumed a Saturday (window math is p_date - 2).
create or replace function public.create_gameweek(p_date date, p_season uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare sid uuid; gid uuid;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  if extract(isodow from p_date) <> 6 then
    raise exception 'Gameweeks start on a Saturday — % is a %', p_date, to_char(p_date, 'FMDay');
  end if;
  if p_season is not null then
    sid := p_season;
  else
    select id into sid from seasons
     where kind <> 'test' and p_date between start_date and end_date
     order by start_date limit 1;
    if sid is null then
      raise exception 'No season covers % — add or extend a season first', p_date;
    end if;
  end if;
  insert into gameweeks (season_id, gw_date, window_opens, window_closes)
  values (sid, p_date, uk_ts(p_date - 2, '18:00'), uk_ts(p_date, '23:59'))
  returning id into gid;
  return gid;
end
$function$;
