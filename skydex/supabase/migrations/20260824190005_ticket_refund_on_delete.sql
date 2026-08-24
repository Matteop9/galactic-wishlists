-- If a deleted sighting had a Ticket spent on it, refund exactly one Ticket (idempotent via
-- ticket_ledger_one_refund). Covers retake-and-delete, self-delete, and admin delete — no code
-- path can eat a paid Ticket.
create or replace function public.refund_ticket_on_sighting_delete()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  begin
    insert into ticket_ledger (user_id, delta, reason, ref)
    select old.user_id, 1, 'refund', old.id::text
    where exists (
      select 1 from ticket_ledger
       where user_id = old.user_id and reason = 'spend_capture' and ref = old.id::text
    )
    on conflict do nothing;
  exception
    when foreign_key_violation then
      -- account-deletion cascade: the auth.users row (and its whole ledger) is going away
      null;
  end;
  return old;
end;
$function$;

create trigger sightings_refund_ticket
after delete on public.sightings
for each row execute function public.refund_ticket_on_sighting_delete();
