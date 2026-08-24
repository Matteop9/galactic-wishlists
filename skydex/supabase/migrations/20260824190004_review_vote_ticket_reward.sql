-- Review-to-earn: reviewing a photo earns 1 Ticket, capped per UTC day (10, or 20 for
-- Frequent Flyers), at most once per sighting ever (ticket_ledger_one_review_reward, so an
-- unvote -> revote can't re-earn). Award is inlined here — the ONE write path for review
-- rewards; there is deliberately no client-callable award RPC.
-- Everything else is identical to the previous review_vote.
create or replace function public.review_vote(p_sighting uuid, p_can_see boolean)
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  -- config: keep in sync with lib/tickets.ts
  c_review_reward  int := 1;
  c_review_cap     int := 10;
  c_ff_review_cap  int := 20;
  v_uid uuid := auth.uid();
  v_standing int;
  v_today int;
  v_owner uuid;
  v_no int;
  v_yes int;
  v_flagged boolean := false;
  v_ff boolean := false;
  v_cap int;
  v_rewards_today int := 0;
  v_earned boolean := false;
  v_day_start timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
begin
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'Not signed in.');
  end if;

  select count(*) into v_standing from sightings where user_id = v_uid and verified;
  if v_standing < 5 then
    return json_build_object('ok', false, 'error', 'You need 5 verified sightings before you can review.');
  end if;

  select count(*) into v_today from photo_reviews
   where reviewer_id = v_uid and created_at > now() - interval '24 hours';
  if v_today >= 100 then
    return json_build_object('ok', false, 'error', 'Daily review limit reached — come back tomorrow.');
  end if;

  select user_id into v_owner from sightings
   where id = p_sighting and verified and photo_path is not null
     and review_status is null and user_id <> v_uid;
  if not found then
    -- no longer reviewable (deleted, already flagged, own photo) — move on
    return json_build_object('ok', true, 'skipped', true);
  end if;

  insert into photo_reviews (sighting_id, reviewer_id, can_see)
  values (p_sighting, v_uid, p_can_see)
  on conflict do nothing;
  if not found then
    return json_build_object('ok', true, 'skipped', true);
  end if;

  -- Review-to-earn award (serialized with the other ledger writers).
  perform pg_advisory_xact_lock(hashtext('tickets:' || v_uid::text));
  select coalesce(frequent_flyer, false) into v_ff from profiles where id = v_uid;
  v_cap := case when v_ff then c_ff_review_cap else c_review_cap end;
  select count(*)::int into v_rewards_today
    from ticket_ledger
   where user_id = v_uid and reason = 'review_reward' and created_at >= v_day_start;
  if v_rewards_today < v_cap then
    insert into ticket_ledger (user_id, delta, reason, ref)
    values (v_uid, c_review_reward, 'review_reward', p_sighting::text)
    on conflict do nothing;
    if found then
      v_earned := true;
      v_rewards_today := v_rewards_today + 1;
    end if;
  end if;

  -- Net-2 rule: honest "yes" votes offset a brigade of "no"s.
  select count(*) filter (where not can_see), count(*) filter (where can_see)
    into v_no, v_yes from photo_reviews where sighting_id = p_sighting;

  if v_no - v_yes >= 2 then
    update sightings set review_status = 'flagged', review_flagged_at = now()
     where id = p_sighting and review_status is null;
    if found then
      v_flagged := true;
      insert into photo_warnings (user_id, sighting_id) values (v_owner, p_sighting);
    end if;
  end if;

  return json_build_object(
    'ok', true,
    'flagged', v_flagged,
    'earned', v_earned,
    'tickets_today', v_rewards_today,
    'review_cap', v_cap
  );
end;
$function$;
