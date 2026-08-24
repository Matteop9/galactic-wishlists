-- Tickets economy RPCs. Server-authoritative: these are the ONLY write paths into ticket_ledger
-- (plus review_vote's inline award and the refund trigger, shipped in follow-up migrations).
-- Config constants here must stay in sync with skydex/lib/tickets.ts.
-- NOTE: ticket_status_for / ticket_status were created STABLE here and made VOLATILE in
-- 20260824190006_ticket_status_volatile.sql (stale-snapshot footgun when composed with writes).

-- Internal shared status builder. Not client-callable (EXECUTE revoked below);
-- SECURITY DEFINER functions owned by postgres can still call it.
create or replace function public.ticket_status_for(p_user uuid)
 returns json
 language plpgsql
 stable
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
  -- spots key on captured_at (shutter time), so an offline late upload counts to its real day
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

revoke execute on function public.ticket_status_for(uuid) from public, anon, authenticated;

-- Read-only status for the signed-in user (used by the capture gate + UI refreshes).
create or replace function public.ticket_status()
 returns json
 language plpgsql
 stable
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

-- Grant-on-read, called on app open: Founding-Flyer lazy grant + one-time welcome bonus +
-- daily top-up (at most once per UTC day), then returns the full status. No cron needed.
create or replace function public.claim_daily_tickets()
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  -- config: keep in sync with lib/tickets.ts
  c_welcome        int := 150;
  c_free_tickets   int := 8;
  c_rollover_cap   int := 50;
  c_ff_multiplier  int := 2;
  c_ff_rollover_cap int := 100;
  c_ff_cutoff timestamptz := timestamptz '2027-01-01T00:00:00Z';
  v_uid uuid := auth.uid();
  v_ff boolean;
  v_created timestamptz;
  v_balance int;
  v_daily int;
  v_cap int;
  v_amount int;
  v_granted int := 0;
begin
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'Not signed in.');
  end if;
  -- serialize this user's ledger writes (also used by spend_ticket / redeem_purchase)
  perform pg_advisory_xact_lock(hashtext('tickets:' || v_uid::text));

  select frequent_flyer, created_at into v_ff, v_created from profiles where id = v_uid;
  if not found then
    return json_build_object('ok', false, 'error', 'No profile yet.');
  end if;

  -- Founding Flyer: 2026 signups get Frequent Flyer included, forever.
  if not v_ff and v_created < c_ff_cutoff then
    update profiles
       set frequent_flyer = true, frequent_flyer_since = now(), frequent_flyer_source = 'founder'
     where id = v_uid;
    v_ff := true;
  end if;

  -- One-time welcome bonus (idempotent via ticket_ledger_one_welcome).
  insert into ticket_ledger (user_id, delta, reason)
  values (v_uid, c_welcome, 'welcome')
  on conflict do nothing;

  -- Daily grant: top the balance up toward the rollover cap, at most once per UTC day
  -- (idempotent via ticket_ledger_one_daily_grant). Zero-amount days insert nothing, so a
  -- user who spends below the cap later today can still collect on their next app open.
  v_daily := c_free_tickets * case when v_ff then c_ff_multiplier else 1 end;
  v_cap := case when v_ff then c_ff_rollover_cap else c_rollover_cap end;
  select coalesce(sum(delta), 0)::int into v_balance from ticket_ledger where user_id = v_uid;
  v_amount := greatest(0, least(v_daily, v_cap - v_balance));
  if v_amount > 0 then
    insert into ticket_ledger (user_id, delta, reason)
    values (v_uid, v_amount, 'daily_grant')
    on conflict do nothing;
    if found then
      v_granted := v_amount;
    end if;
  end if;

  return (public.ticket_status_for(v_uid)::jsonb || jsonb_build_object('granted', v_granted))::json;
end;
$function$;

-- Spend exactly one Ticket against a verified capture beyond the free daily spots.
-- Called server-side from /api/sightings; idempotent per sighting (offline retries can't double-charge).
create or replace function public.spend_ticket(p_sighting uuid)
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_balance int;
begin
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'Not signed in.');
  end if;
  if p_sighting is null then
    return json_build_object('ok', false, 'error', 'Missing sighting.');
  end if;
  if not exists (select 1 from sightings where id = p_sighting and user_id = v_uid) then
    return json_build_object('ok', false, 'error', 'Not your sighting.');
  end if;
  perform pg_advisory_xact_lock(hashtext('tickets:' || v_uid::text));
  select coalesce(sum(delta), 0)::int into v_balance from ticket_ledger where user_id = v_uid;
  if v_balance < 1 then
    return json_build_object('ok', false, 'error', 'No Tickets left.', 'balance', v_balance);
  end if;
  insert into ticket_ledger (user_id, delta, reason, ref)
  values (v_uid, -1, 'spend_capture', p_sighting::text)
  on conflict do nothing;
  if not found then
    -- this sighting was already paid for — no double charge
    return json_build_object('ok', true, 'balance', v_balance, 'already', true);
  end if;
  return json_build_object('ok', true, 'balance', v_balance - 1);
end;
$function$;

-- IAP credit path (Phase-5 RevenueCat webhook). Service-role ONLY: takes p_user because a
-- webhook has no auth.uid(), and a user-callable version would be a self-credit hole.
-- Idempotent on the store transaction id (ticket_ledger_purchase_txn).
create or replace function public.redeem_purchase(p_user uuid, p_txn text, p_qty int)
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_credited boolean := false;
  v_balance int;
begin
  if p_user is null or p_txn is null or length(trim(p_txn)) = 0 then
    return json_build_object('ok', false, 'error', 'Missing user or transaction id.');
  end if;
  if p_qty is null or p_qty < 1 or p_qty > 10000 then
    return json_build_object('ok', false, 'error', 'Invalid quantity.');
  end if;
  if not exists (select 1 from profiles where id = p_user) then
    return json_build_object('ok', false, 'error', 'No such user.');
  end if;
  perform pg_advisory_xact_lock(hashtext('tickets:' || p_user::text));
  insert into ticket_ledger (user_id, delta, reason, ref)
  values (p_user, p_qty, 'purchase', trim(p_txn))
  on conflict do nothing;
  v_credited := found;
  select coalesce(sum(delta), 0)::int into v_balance from ticket_ledger where user_id = p_user;
  return json_build_object('ok', true, 'credited', v_credited, 'balance', v_balance);
end;
$function$;

-- Grants: clients may read status, claim, and (via the capture route) spend; nothing else.
revoke execute on function public.ticket_status() from public, anon;
grant execute on function public.ticket_status() to authenticated;
revoke execute on function public.claim_daily_tickets() from public, anon;
grant execute on function public.claim_daily_tickets() to authenticated;
revoke execute on function public.spend_ticket(uuid) from public, anon;
grant execute on function public.spend_ticket(uuid) to authenticated;
revoke execute on function public.redeem_purchase(uuid, text, int) from public, anon, authenticated;
grant execute on function public.redeem_purchase(uuid, text, int) to service_role;
