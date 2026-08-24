-- ticket_status(_for) were STABLE, which reads a stale snapshot when composed with writes in a
-- single statement. No performance benefit was in play — make them VOLATILE (the default) so
-- they always see current ledger state. Bodies unchanged from 20260824190003_ticket_rpcs.sql.
create or replace function public.ticket_status_for(p_user uuid)
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  -- config: keep in sync with lib/tickets.ts
  c_free_spots     int := 20;
  c_free_tickets   int := 8;
  c_rollover_cap   int := 50;
  c_ff_multiplier  int := 2;
  c_ff_rollover_cap int := 100;
  c_review_cap     int := 10;
  c_ff_review_cap  int := 20;
  v_ff boolean := false;
  v_balance int;
  v_spots int;
  v_captures int;
  v_welcome boolean;
  v_granted_today int;
  v_day_start timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
begin
  select frequent_flyer into v_ff from profiles where id = p_user;
  v_ff := coalesce(v_ff, false);
  select coalesce(sum(delta), 0)::int into v_balance from ticket_ledger where user_id = p_user;
  select count(*)::int into v_spots
    from sightings where user_id = p_user and verified and captured_at >= v_day_start;
  select count(*)::int into v_captures
    from sightings where user_id = p_user and captured_at >= v_day_start;
  select exists(select 1 from ticket_ledger where user_id = p_user and reason = 'welcome') into v_welcome;
  select coalesce(sum(delta), 0)::int into v_granted_today
    from ticket_ledger where user_id = p_user and reason = 'daily_grant' and created_at >= v_day_start;
  return json_build_object(
    'ok', true,
    'balance', v_balance,
    'spots_used_today', v_spots,
    'captures_today', v_captures,
    'welcome_granted', v_welcome,
    'granted_today', v_granted_today,
    'frequent_flyer', v_ff,
    'free_spots_per_day', c_free_spots,
    'free_tickets_per_day', c_free_tickets * case when v_ff then c_ff_multiplier else 1 end,
    'rollover_cap', case when v_ff then c_ff_rollover_cap else c_rollover_cap end,
    'review_cap', case when v_ff then c_ff_review_cap else c_review_cap end
  );
end;
$function$;

create or replace function public.ticket_status()
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'Not signed in.');
  end if;
  return public.ticket_status_for(v_uid);
end;
$function$;
