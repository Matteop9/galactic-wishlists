-- Live sessions (build spec §8) — one writer (the scorer's device), many
-- read-only spectators. Roll events travel over a Realtime broadcast channel
-- keyed on the session id; `frames` remains the durable record, so a spectator
-- joining or reconnecting just refetches and carries on.
--
-- Nothing new is needed to *hold* a live game: it is a `sessions` row with
-- status 'active' plus `games` rows with entry_type 'live', verification_status
-- 'live' and status 'in_progress' until the game ends. The stats views already
-- filter on games.status = 'complete', so an in-progress game never touches an
-- average. What is new is (a) a share/QR code for the session and (b) a way for
-- someone outside the group to watch it.

-- Join code: what the QR and share link encode (spec §8 "session id + join token").
alter table tenpins.sessions
  add column join_code text unique default encode(extensions.gen_random_bytes(4), 'hex');

-- Who has joined to watch. Doubles as the "who's joined" list on the waiting
-- screen; the live "N watching" count comes from Realtime presence, not here.
create table tenpins.session_viewers (
  session_id uuid references tenpins.sessions on delete cascade,
  profile_id uuid references tenpins.profiles on delete cascade,
  joined_at timestamptz default now(),
  primary key (session_id, profile_id)
);

create index tp_session_viewers_profile_idx on tenpins.session_viewers (profile_id);

-- Visibility ----------------------------------------------------------------

create or replace function tenpins.is_session_viewer(sid uuid)
returns boolean
language sql stable security definer set search_path = tenpins
as $$
  select exists (
    select 1 from session_viewers v
    where v.session_id = sid and v.profile_id = auth.uid()
  );
$$;

-- A spectator can see the session they joined…
drop policy sessions_select on tenpins.sessions;
create policy sessions_select on tenpins.sessions for select to authenticated
  using (
    created_by = auth.uid()
    or (group_id is not null and tenpins.is_group_member(group_id))
    or tenpins.is_session_viewer(id)
    or exists (
      select 1 from tenpins.games g
      where g.session_id = id and tenpins.can_see_game(g.id)
    )
  );

-- …and its games, which cascades to game_players and frames via
-- can_see_game_player (the tp_0006/0007 lesson: visibility must cascade all the
-- way down or the spectator gets a session with an empty scorecard).
create or replace function tenpins.can_see_game(gid uuid)
returns boolean
language sql stable security definer set search_path = tenpins
as $$
  select exists (
    select 1 from games g
    left join sessions s on s.id = g.session_id
    where g.id = gid and (
      g.created_by = auth.uid()
      or s.created_by = auth.uid()
      or (s.group_id is not null and tenpins.is_group_member(s.group_id))
      or (g.session_id is not null and tenpins.is_session_viewer(g.session_id))
      or exists (
        select 1 from game_players gp
        where gp.game_id = g.id and gp.profile_id = auth.uid()
      )
      or exists (
        select 1 from game_players gp
        join friendships f on f.status = 'accepted'
          and ((f.requester = auth.uid() and f.addressee = gp.profile_id)
            or (f.addressee = auth.uid() and f.requester = gp.profile_id))
        where gp.game_id = g.id and gp.profile_id is not null
      )
    )
  );
$$;

alter table tenpins.session_viewers enable row level security;

-- Readable by the viewer themselves and by the scorer (the waiting-room list).
create policy session_viewers_select on tenpins.session_viewers for select to authenticated
  using (
    profile_id = auth.uid()
    or exists (select 1 from tenpins.sessions s where s.id = session_id and s.created_by = auth.uid())
  );
-- No insert policy: joining goes through join_live_session below, so a viewer
-- row can only ever appear off a valid code.
create policy session_viewers_delete on tenpins.session_viewers for delete to authenticated
  using (profile_id = auth.uid());

-- Join flow -----------------------------------------------------------------

-- Landing-screen preview: enough to say "Matt is bowling live at Rowans with
-- Dave and Jen" before you commit to joining. Definer, because the caller
-- cannot see the session yet.
create or replace function tenpins.live_session_preview(code text)
returns jsonb
language sql stable security definer set search_path = tenpins
as $$
  select jsonb_build_object(
    'session_id', s.id,
    'status', s.status,
    'host', p.display_name,
    'group_name', gr.name,
    'venue', v.name,
    'players', coalesce((
      select jsonb_agg(coalesce(pp.display_name, gp.guest_name) order by gp.seat_order)
      from games g
      join game_players gp on gp.game_id = g.id
      left join profiles pp on pp.id = gp.profile_id
      where g.session_id = s.id
        and g.game_number = (select max(g2.game_number) from games g2 where g2.session_id = s.id)
    ), '[]'::jsonb)
  )
  from sessions s
  join profiles p on p.id = s.created_by
  left join groups gr on gr.id = s.group_id
  left join venues v on v.id = s.venue_id
  where s.join_code = lower(trim(code));
$$;

create or replace function tenpins.join_live_session(code text)
returns uuid
language plpgsql security definer set search_path = tenpins
as $$
declare
  sid uuid;
begin
  select id into sid from sessions where join_code = lower(trim(code));
  if sid is null then
    raise exception 'No live session with that code';
  end if;
  insert into session_viewers (session_id, profile_id)
  values (sid, auth.uid())
  on conflict (session_id, profile_id) do nothing;
  return sid;
end;
$$;

-- Notification: a live game starting is how the group finds out to watch.
alter table tenpins.notifications
  add column session_id uuid references tenpins.sessions on delete cascade;

alter table tenpins.notifications drop constraint notifications_type_check;
alter table tenpins.notifications add constraint notifications_type_check check (type in
  ('comment','reaction','friend_request','friend_accepted','match_day_added','match_day_result','live_started'));

-- Fires on the first live game of a session, not on the session row itself:
-- match days also open an 'active' session and must not notify here.
create or replace function tenpins.notify_live_started()
returns trigger
language plpgsql security definer set search_path = tenpins
as $$
declare
  s record;
begin
  if new.entry_type <> 'live' or new.game_number <> 1 then
    return new;
  end if;
  select id, group_id, created_by into s from sessions where id = new.session_id;
  if s.group_id is null then
    return new;
  end if;
  insert into notifications (profile_id, type, actor_id, session_id)
  select gm.profile_id, 'live_started', s.created_by, s.id
  from group_members gm
  where gm.group_id = s.group_id and gm.profile_id <> s.created_by;
  return new;
end;
$$;

create trigger notify_on_live_started
  after insert on tenpins.games
  for each row execute function tenpins.notify_live_started();

-- Grants: policy helpers stay callable by authenticated (policies run in the
-- caller's context); the two join RPCs are deliberately reachable over /rpc/.
revoke execute on function tenpins.is_session_viewer(uuid) from anon, public;
revoke execute on function tenpins.live_session_preview(text) from anon, public;
revoke execute on function tenpins.join_live_session(text) from anon, public;
grant execute on function tenpins.is_session_viewer(uuid) to authenticated;
grant execute on function tenpins.live_session_preview(text) to authenticated;
grant execute on function tenpins.join_live_session(text) to authenticated;

notify pgrst, 'reload schema';
