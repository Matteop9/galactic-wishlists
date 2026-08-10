-- Gameweek window sweeper. Runs every 5 minutes; DST-proof because each row
-- carries its own UTC instants (computed from UK wall-clock at creation).
-- Idempotent and self-healing: a late tick still closes the window and
-- inserts the no-picks, and RLS checks the timestamps - not the status -
-- so lag can never let a pick through.

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

  for gw in
    update gameweeks set status = 'closed'
     where status = 'open'
       and now() >= window_closes
     returning id
  loop
    perform insert_no_picks(gw.id);
  end loop;
end
$$;

select cron.schedule('gw-tick', '*/5 * * * *', 'select public.tick_gameweeks()');
