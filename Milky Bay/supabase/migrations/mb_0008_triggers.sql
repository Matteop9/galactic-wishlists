-- Attach stamp + audit triggers AFTER the seed so seeded rows keep their
-- hand-set timestamps and the audit log starts clean (JHH 0009 pattern).

create trigger mb_picks_stamp before insert or update on milkybay.picks
  for each row execute function milkybay.stamp_pick();

create trigger mb_audit_picks after insert or update or delete on milkybay.picks
  for each row execute function milkybay.audit();
create trigger mb_audit_adjustments after insert or update or delete on milkybay.adjustments
  for each row execute function milkybay.audit();
create trigger mb_audit_players after insert or update or delete on milkybay.players
  for each row execute function milkybay.audit();
create trigger mb_audit_gameweeks after insert or update or delete on milkybay.gameweeks
  for each row execute function milkybay.audit();
create trigger mb_audit_seasons after insert or update or delete on milkybay.seasons
  for each row execute function milkybay.audit();
create trigger mb_audit_honours after insert or update or delete on milkybay.honours
  for each row execute function milkybay.audit();
