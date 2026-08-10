-- Admin-facing wrapper so the match queue can ingest pending HTTP responses
-- on demand instead of waiting for the next cron tick.
create or replace function ingest_responses()
returns void
language plpgsql security definer set search_path = public as
$$
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  perform process_poll_responses();
end
$$;
grant execute on function ingest_responses() to authenticated;
