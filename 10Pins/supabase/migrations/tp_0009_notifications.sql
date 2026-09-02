-- In-app notifications: a bell, not push. Rows are written ONLY by triggers
-- (no insert policy — client writes are impossible to spoof); the client
-- renders copy from type + actor + target so wording lives in one place.

create table tenpins.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references tenpins.profiles on delete cascade not null,  -- recipient
  type text not null check (type in
    ('comment','reaction','friend_request','friend_accepted','match_day_added','match_day_result')),
  actor_id uuid references tenpins.profiles,
  feed_event_id uuid references tenpins.feed_events on delete cascade,
  match_day_id uuid references tenpins.match_days on delete cascade,
  read_at timestamptz,
  created_at timestamptz default now()
);

create index tp_notifications_recipient_idx on tenpins.notifications (profile_id, created_at desc);

alter table tenpins.notifications enable row level security;

create policy notifications_select on tenpins.notifications for select to authenticated
  using (profile_id = auth.uid());
create policy notifications_update on tenpins.notifications for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy notifications_delete on tenpins.notifications for delete to authenticated
  using (profile_id = auth.uid());

-- Trigger functions (security definer, owner writes past RLS) ---------------

-- Comments + reactions: notify the game's creator and every tagged player,
-- deduped, never the actor. Session-type events notify the session creator.
create or replace function tenpins.notify_feed_engagement()
returns trigger
language plpgsql security definer set search_path = tenpins
as $$
declare
  actor uuid := auth.uid();
  kind text := case tg_table_name when 'comments' then 'comment' else 'reaction' end;
begin
  insert into notifications (profile_id, type, actor_id, feed_event_id)
  select distinct recipient, kind, actor, new.feed_event_id
  from (
    select g.created_by as recipient
    from feed_events fe
    join games g on g.id = fe.game_id
    where fe.id = new.feed_event_id
    union
    select gp.profile_id
    from feed_events fe
    join game_players gp on gp.game_id = fe.game_id
    where fe.id = new.feed_event_id and gp.profile_id is not null
    union
    select s.created_by
    from feed_events fe
    join sessions s on s.id = fe.session_id
    where fe.id = new.feed_event_id and fe.game_id is null
  ) audience
  where recipient is not null and recipient <> actor;
  return new;
end;
$$;

create trigger notify_on_comment
  after insert on tenpins.comments
  for each row execute function tenpins.notify_feed_engagement();

create trigger notify_on_reaction
  after insert on tenpins.reactions
  for each row execute function tenpins.notify_feed_engagement();

-- Friend requests + acceptances
create or replace function tenpins.notify_friendship()
returns trigger
language plpgsql security definer set search_path = tenpins
as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    insert into notifications (profile_id, type, actor_id)
    values (new.addressee, 'friend_request', new.requester);
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'accepted' then
    insert into notifications (profile_id, type, actor_id)
    values (new.requester, 'friend_accepted', new.addressee);
  end if;
  return new;
end;
$$;

create trigger notify_on_friendship
  after insert or update on tenpins.friendships
  for each row execute function tenpins.notify_friendship();

-- Added to a match day (profiles only; the organiser isn't told about themselves)
create or replace function tenpins.notify_match_day_added()
returns trigger
language plpgsql security definer set search_path = tenpins
as $$
declare
  organiser uuid;
begin
  select created_by into organiser from match_days where id = new.match_day_id;
  if new.profile_id is not null and new.profile_id <> organiser then
    insert into notifications (profile_id, type, actor_id, match_day_id)
    values (new.profile_id, 'match_day_added', organiser, new.match_day_id);
  end if;
  return new;
end;
$$;

create trigger notify_on_match_day_added
  after insert on tenpins.match_day_players
  for each row execute function tenpins.notify_match_day_added();

-- Match day finished → tell every member player except whoever finished it
create or replace function tenpins.notify_match_day_result()
returns trigger
language plpgsql security definer set search_path = tenpins
as $$
declare
  actor uuid := auth.uid();
begin
  if old.status <> 'finished' and new.status = 'finished' then
    insert into notifications (profile_id, type, actor_id, match_day_id)
    select distinct mdp.profile_id, 'match_day_result', actor, new.id
    from match_day_players mdp
    where mdp.match_day_id = new.id
      and mdp.profile_id is not null
      and mdp.profile_id <> actor;
  end if;
  return new;
end;
$$;

create trigger notify_on_match_day_result
  after update on tenpins.match_days
  for each row execute function tenpins.notify_match_day_result();
