-- Attach the stamp + audit triggers AFTER the seed import so historic rows
-- keep their timestamps and the audit log starts clean. From here on, every
-- write to these tables is recorded with actor, IP and user agent.

create trigger picks_stamp before insert or update on picks
  for each row execute function stamp_pick();

create trigger audit_picks after insert or update or delete on picks
  for each row execute function audit();
create trigger audit_disputes after insert or update or delete on disputes
  for each row execute function audit();
create trigger audit_adjustments after insert or update or delete on adjustments
  for each row execute function audit();
create trigger audit_players after insert or update or delete on players
  for each row execute function audit();
create trigger audit_gameweeks after insert or update or delete on gameweeks
  for each row execute function audit();
create trigger audit_stm after insert or update or delete on season_team_members
  for each row execute function audit();
create trigger audit_claim_tokens after insert or update or delete on claim_tokens
  for each row execute function audit();
create trigger audit_seasons after insert or update or delete on seasons
  for each row execute function audit();

-- fixtures deliberately not audited: the poller updates them every minute on
-- a live Saturday and none of it is user action.
