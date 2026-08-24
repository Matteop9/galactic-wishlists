-- The refund trigger function only ever runs as the sightings AFTER DELETE trigger; triggers
-- fire regardless of the caller's EXECUTE privilege, so close the direct-RPC surface.
revoke execute on function public.refund_ticket_on_sighting_delete() from public, anon, authenticated;
