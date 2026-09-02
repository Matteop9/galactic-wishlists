-- Friends could see a game's feed event (can_see_feed_event) but not the game
-- row underneath it, so their feed cards rendered empty. Extend can_see_game
-- with the same friends-with-a-tagged-participant branch — it cascades to
-- game_players and frames via can_see_game_player.

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
