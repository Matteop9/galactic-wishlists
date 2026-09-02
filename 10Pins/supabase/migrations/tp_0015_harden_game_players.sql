-- tp_0015 — you can only put real people in your own game.
--
-- COUNCIL_REVIEW_TODO item 1, and it was live: `game_players_insert` checked
-- only `owns_game(game_id)`, never `profile_id`. Since `profiles_select` is
-- `using (true)`, any signed-in user — the public demo account included —
-- could list every profile, create their own game, and insert a row carrying
-- someone else's `profile_id` with a score of 0. `player_stats` aggregates it
-- and `game_players_delete` requires `owns_game`, so the victim could not
-- remove it. Measured before this migration: one insert by an unrelated
-- account moved the victim's average from 181.0 to 150.8.
--
-- The rule: in your own game you may enter yourself, a guest (no profile at
-- all), or someone you actually bowl with — an accepted friend, or a member
-- of a group you're also in.
--
-- Note the check is on the *relationship*, not on the game's group. Scoping
-- it to the game's own group would break real flows: a live session or a
-- match day can be created with no group at all, and the line-up picker
-- offers group members before the group is committed to the session row.

create or replace function tenpins.can_tag(p_target uuid)
returns boolean
language sql stable security definer set search_path = tenpins
as $$
  select
    -- an accepted friendship, either direction
    exists (
      select 1 from friendships f
      where f.status = 'accepted'
        and ((f.requester = auth.uid() and f.addressee = p_target)
          or (f.requester = p_target and f.addressee = auth.uid()))
    )
    -- or you're both in the same group
    or exists (
      select 1
      from group_members mine
      join group_members theirs on theirs.group_id = mine.group_id
      where mine.profile_id = auth.uid()
        and theirs.profile_id = p_target
    );
$$;

revoke execute on function tenpins.can_tag(uuid) from anon, public;
grant execute on function tenpins.can_tag(uuid) to authenticated;

-- Both INSERT and UPDATE: hardening the insert alone would leave the hole
-- open via an update of a row that was legitimate when it was created.
drop policy game_players_insert on tenpins.game_players;
create policy game_players_insert on tenpins.game_players for insert to authenticated
  with check (
    tenpins.owns_game(game_id)
    and (
      profile_id is null
      or profile_id = auth.uid()
      or tenpins.can_tag(profile_id)
    )
  );

drop policy game_players_update on tenpins.game_players;
create policy game_players_update on tenpins.game_players for update to authenticated
  using (tenpins.owns_game(game_id))
  with check (
    tenpins.owns_game(game_id)
    and (
      profile_id is null
      or profile_id = auth.uid()
      or tenpins.can_tag(profile_id)
    )
  );

-- COUNCIL_REVIEW_TODO item 3: `friendships_update` is scoped to the addressee
-- but restricts no columns, so the addressee could rewrite `requester` and
-- forge an accepted friendship with anyone — and with it, feed visibility.
-- The endpoints of a friendship are fixed at request time; only `status` moves.
create or replace function tenpins.freeze_friendship_endpoints()
returns trigger
language plpgsql
as $$
begin
  if new.requester is distinct from old.requester
     or new.addressee is distinct from old.addressee then
    raise exception 'a friendship cannot change who it is between';
  end if;
  return new;
end;
$$;

create trigger friendships_freeze_endpoints
  before update on tenpins.friendships
  for each row execute function tenpins.freeze_friendship_endpoints();
