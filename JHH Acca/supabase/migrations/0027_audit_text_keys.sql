-- audit() derived row_id from an `id` column, falling back to `token`
-- (claim_tokens). team_badges (0025) is keyed by `team`, so its audit rows
-- landed with a null row_id. Add `team` as a third fallback: every table that
-- has an `id` still short-circuits on it first (picks.team is a club name, but
-- picks has an id), so nothing else changes.
-- NB: create or replace keeps the ACL, but 0023's revokes are re-issued below
-- so this can never quietly hand EXECUTE back to PUBLIC.
create or replace function audit()
returns trigger
language plpgsql security definer set search_path = public as
$$
declare
  hdrs jsonb;
  v_ip text;
  v_ua text;
  rid text;
begin
  begin
    hdrs := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    hdrs := null;
  end;
  if hdrs is not null then
    v_ip := nullif(trim(split_part(hdrs ->> 'x-forwarded-for', ',', 1)), '');
    v_ua := hdrs ->> 'user-agent';
  end if;
  rid := coalesce(
    case when tg_op = 'DELETE' then to_jsonb(old) ->> 'id' else to_jsonb(new) ->> 'id' end,
    case when tg_op = 'DELETE' then to_jsonb(old) ->> 'token' else to_jsonb(new) ->> 'token' end,
    case when tg_op = 'DELETE' then to_jsonb(old) ->> 'team' else to_jsonb(new) ->> 'team' end
  );
  insert into audit_log (action, table_name, row_id, old_row, new_row,
                         actor_auth, actor_player, ip, user_agent)
  values (
    tg_op, tg_table_name, rid,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end,
    auth.uid(), current_player_id(), v_ip, v_ua
  );
  return coalesce(new, old);
end
$$;
revoke execute on function audit() from public;
revoke execute on function audit() from anon, authenticated;
