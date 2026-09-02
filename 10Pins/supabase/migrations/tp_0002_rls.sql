-- 10 Pins Row Level Security (build spec §5) — enabled on every table.
--
-- Gotcha carried over from the old project: a SELECT policy whose visibility
-- comes only from a security-definer function that re-queries the SAME table
-- breaks `INSERT … RETURNING` (statement snapshot) — always OR in a direct
-- owner-column check first. Helper functions here each query a table other
-- than the one being policied, or the direct check leads.

-- Security-definer helpers -------------------------------------------------

create or replace function tenpins.is_group_member(gid uuid)
returns boolean
language sql stable security definer set search_path = tenpins
as $$
  select exists (
    select 1 from group_members
    where group_id = gid and profile_id = auth.uid()
  );
$$;

create or replace function tenpins.is_group_admin(gid uuid)
returns boolean
language sql stable security definer set search_path = tenpins
as $$
  select exists (
    select 1 from group_members
    where group_id = gid and profile_id = auth.uid() and role = 'admin'
  );
$$;

-- Visible if member of the owning group, a participant, or the creator (incl. solo games)
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
      or exists (
        select 1 from game_players gp
        where gp.game_id = g.id and gp.profile_id = auth.uid()
      )
    )
  );
$$;

create or replace function tenpins.owns_game(gid uuid)
returns boolean
language sql stable security definer set search_path = tenpins
as $$
  select exists (select 1 from games where id = gid and created_by = auth.uid());
$$;

create or replace function tenpins.owns_game_player(gpid uuid)
returns boolean
language sql stable security definer set search_path = tenpins
as $$
  select exists (
    select 1 from game_players gp
    join games g on g.id = gp.game_id
    where gp.id = gpid and g.created_by = auth.uid()
  );
$$;

create or replace function tenpins.can_see_game_player(gpid uuid)
returns boolean
language sql stable security definer set search_path = tenpins
as $$
  select exists (
    select 1 from game_players gp
    where gp.id = gpid and tenpins.can_see_game(gp.game_id)
  );
$$;

-- Group member, or friends-with a tagged participant
create or replace function tenpins.can_see_feed_event(eid uuid)
returns boolean
language sql stable security definer set search_path = tenpins
as $$
  select exists (
    select 1 from feed_events fe
    where fe.id = eid and (
      (fe.group_id is not null and tenpins.is_group_member(fe.group_id))
      or (fe.game_id is not null and tenpins.can_see_game(fe.game_id))
      or (fe.game_id is not null and exists (
        select 1 from game_players gp
        join friendships f on f.status = 'accepted'
          and ((f.requester = auth.uid() and f.addressee = gp.profile_id)
            or (f.addressee = auth.uid() and f.requester = gp.profile_id))
        where gp.game_id = fe.game_id and gp.profile_id is not null
      ))
    )
  );
$$;

-- Enable RLS everywhere ----------------------------------------------------

alter table tenpins.profiles enable row level security;
alter table tenpins.friendships enable row level security;
alter table tenpins.groups enable row level security;
alter table tenpins.group_members enable row level security;
alter table tenpins.venues enable row level security;
alter table tenpins.sessions enable row level security;
alter table tenpins.games enable row level security;
alter table tenpins.game_players enable row level security;
alter table tenpins.frames enable row level security;
alter table tenpins.feed_events enable row level security;
alter table tenpins.reactions enable row level security;
alter table tenpins.comments enable row level security;
alter table tenpins.guest_claims enable row level security;
alter table tenpins.name_mappings enable row level security;

-- profiles: usernames are public within the app; only the owner writes
create policy profiles_select on tenpins.profiles for select to authenticated using (true);
create policy profiles_insert on tenpins.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update on tenpins.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- friendships: visible to either party; insert as requester; accept by addressee
create policy friendships_select on tenpins.friendships for select to authenticated
  using (requester = auth.uid() or addressee = auth.uid());
create policy friendships_insert on tenpins.friendships for insert to authenticated
  with check (requester = auth.uid() and status = 'pending');
create policy friendships_update on tenpins.friendships for update to authenticated
  using (addressee = auth.uid()) with check (addressee = auth.uid());
create policy friendships_delete on tenpins.friendships for delete to authenticated
  using (requester = auth.uid() or addressee = auth.uid());

-- groups: visible to members (creator too, so the row is readable before the member row lands)
create policy groups_select on tenpins.groups for select to authenticated
  using (created_by = auth.uid() or tenpins.is_group_member(id));
create policy groups_insert on tenpins.groups for insert to authenticated
  with check (created_by = auth.uid());
create policy groups_update on tenpins.groups for update to authenticated
  using (tenpins.is_group_admin(id));

-- group_members: visible to fellow members; creator bootstraps their own admin row;
-- other joins go through the invite RPC
create policy group_members_select on tenpins.group_members for select to authenticated
  using (profile_id = auth.uid() or tenpins.is_group_member(group_id));
create policy group_members_insert on tenpins.group_members for insert to authenticated
  with check (
    profile_id = auth.uid()
    and exists (select 1 from tenpins.groups g where g.id = group_id and g.created_by = auth.uid())
  );
create policy group_members_delete on tenpins.group_members for delete to authenticated
  using (profile_id = auth.uid() or tenpins.is_group_admin(group_id));

-- venues: shared reference data
create policy venues_select on tenpins.venues for select to authenticated using (true);
create policy venues_insert on tenpins.venues for insert to authenticated with check (true);

-- sessions: single writer = creator
create policy sessions_select on tenpins.sessions for select to authenticated
  using (created_by = auth.uid() or (group_id is not null and tenpins.is_group_member(group_id)));
create policy sessions_insert on tenpins.sessions for insert to authenticated
  with check (created_by = auth.uid());
create policy sessions_update on tenpins.sessions for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());

-- games: read via group/participant/creator; write by creator only (single-writer rule)
create policy games_select on tenpins.games for select to authenticated
  using (created_by = auth.uid() or tenpins.can_see_game(id));
create policy games_insert on tenpins.games for insert to authenticated with check (created_by = auth.uid());
create policy games_update on tenpins.games for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy games_delete on tenpins.games for delete to authenticated using (created_by = auth.uid());

-- game_players / frames: readable wherever the game is; written by the game's creator
create policy game_players_select on tenpins.game_players for select to authenticated
  using (tenpins.can_see_game(game_id));
create policy game_players_insert on tenpins.game_players for insert to authenticated
  with check (tenpins.owns_game(game_id));
create policy game_players_update on tenpins.game_players for update to authenticated
  using (tenpins.owns_game(game_id)) with check (tenpins.owns_game(game_id));
create policy game_players_delete on tenpins.game_players for delete to authenticated
  using (tenpins.owns_game(game_id));

create policy frames_select on tenpins.frames for select to authenticated
  using (tenpins.can_see_game_player(game_player_id));
create policy frames_insert on tenpins.frames for insert to authenticated
  with check (tenpins.owns_game_player(game_player_id));
create policy frames_update on tenpins.frames for update to authenticated
  using (tenpins.owns_game_player(game_player_id)) with check (tenpins.owns_game_player(game_player_id));
create policy frames_delete on tenpins.frames for delete to authenticated
  using (tenpins.owns_game_player(game_player_id));

-- feed_events: visibility incl. friends-of-participants; posted by the game/session creator
create policy feed_events_select on tenpins.feed_events for select to authenticated
  using (tenpins.can_see_feed_event(id));
create policy feed_events_insert on tenpins.feed_events for insert to authenticated
  with check (
    (game_id is not null and tenpins.owns_game(game_id))
    or (session_id is not null and exists (
      select 1 from tenpins.sessions s where s.id = session_id and s.created_by = auth.uid()
    ))
  );

-- reactions / comments: insert by anyone who can see the event; delete own only
create policy reactions_select on tenpins.reactions for select to authenticated
  using (tenpins.can_see_feed_event(feed_event_id));
create policy reactions_insert on tenpins.reactions for insert to authenticated
  with check (profile_id = auth.uid() and tenpins.can_see_feed_event(feed_event_id));
create policy reactions_delete on tenpins.reactions for delete to authenticated
  using (profile_id = auth.uid());

create policy comments_select on tenpins.comments for select to authenticated
  using (tenpins.can_see_feed_event(feed_event_id));
create policy comments_insert on tenpins.comments for insert to authenticated
  with check (profile_id = auth.uid() and tenpins.can_see_feed_event(feed_event_id));
create policy comments_delete on tenpins.comments for delete to authenticated
  using (profile_id = auth.uid());

-- guest_claims: group members create and see claim links; claiming is an RPC
create policy guest_claims_select on tenpins.guest_claims for select to authenticated
  using (tenpins.is_group_member(group_id));
create policy guest_claims_insert on tenpins.guest_claims for insert to authenticated
  with check (tenpins.is_group_member(group_id));

-- name_mappings: per-group, member-managed
create policy name_mappings_select on tenpins.name_mappings for select to authenticated
  using (tenpins.is_group_member(group_id));
create policy name_mappings_insert on tenpins.name_mappings for insert to authenticated
  with check (tenpins.is_group_member(group_id));
create policy name_mappings_update on tenpins.name_mappings for update to authenticated
  using (tenpins.is_group_member(group_id)) with check (tenpins.is_group_member(group_id));
create policy name_mappings_delete on tenpins.name_mappings for delete to authenticated
  using (tenpins.is_group_member(group_id));

-- Helpers are for policy evaluation only: authenticated keeps EXECUTE (policies
-- run them in the caller's context); anon/public cannot call them via /rest/v1/rpc/
revoke execute on function tenpins.is_group_member(uuid) from anon, public;
revoke execute on function tenpins.is_group_admin(uuid) from anon, public;
revoke execute on function tenpins.can_see_game(uuid) from anon, public;
revoke execute on function tenpins.owns_game(uuid) from anon, public;
revoke execute on function tenpins.owns_game_player(uuid) from anon, public;
revoke execute on function tenpins.can_see_game_player(uuid) from anon, public;
revoke execute on function tenpins.can_see_feed_event(uuid) from anon, public;
grant execute on function tenpins.is_group_member(uuid) to authenticated;
grant execute on function tenpins.is_group_admin(uuid) to authenticated;
grant execute on function tenpins.can_see_game(uuid) to authenticated;
grant execute on function tenpins.owns_game(uuid) to authenticated;
grant execute on function tenpins.owns_game_player(uuid) to authenticated;
grant execute on function tenpins.can_see_game_player(uuid) to authenticated;
grant execute on function tenpins.can_see_feed_event(uuid) to authenticated;
