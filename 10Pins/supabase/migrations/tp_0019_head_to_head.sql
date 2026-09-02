-- tp_0019 — head-to-head (feedback queue #3, groups-as-friends slice C4).
--
-- Partial index: profile_id is null for every guest seat (the majority of
-- historical rows before claim links existed), so indexing only the non-null
-- rows keeps it small while still covering game_players lookups by profile —
-- head_to_head below, player_stats, fetchRecentScores, and the friend branch
-- of can_see_game (tp_0006) all filter on `profile_id = <uuid>`.
create index tp_game_players_profile_idx on tenpins.game_players (profile_id) where profile_id is not null;

-- head_to_head(other): the caller's record against one other player, plus
-- their most recent shared games. security definer is safe here because the
-- query never leaves the set of games can_see_game already grants the caller
-- via its tagged-player branch (tp_0006: "gp.profile_id = auth.uid()") — a
-- "shared game" below is, by construction, one where a game_players row with
-- profile_id = auth.uid() exists, so nothing is exposed that the caller
-- couldn't already read row-by-row. `auth.uid()` is read from the JWT inside
-- the function; it is never a parameter, so a caller cannot ask for someone
-- else's head-to-head by substituting a different id.
create or replace function tenpins.head_to_head(other uuid)
returns jsonb
language sql stable security definer set search_path = tenpins
as $$
  with shared as (
    select
      g.id as game_id,
      g.played_at,
      g.verification_status,
      s.venue_id,
      mine.final_score as my_score,
      theirs.final_score as their_score
    from games g
    join game_players mine on mine.game_id = g.id
      and mine.profile_id = auth.uid() and mine.final_score is not null
    join game_players theirs on theirs.game_id = g.id
      and theirs.profile_id = other and theirs.final_score is not null
    left join sessions s on s.id = g.session_id
    where g.status = 'complete' and other <> auth.uid()
  ),
  agg as (
    select
      count(*)::int as games,
      count(*) filter (where my_score > their_score)::int as wins,
      count(*) filter (where my_score < their_score)::int as losses,
      count(*) filter (where my_score = their_score)::int as ties,
      round(avg(my_score), 1) as my_avg,
      round(avg(their_score), 1) as their_avg
    from shared
  ),
  recent as (
    select shared.*, v.name as venue_name
    from shared
    left join venues v on v.id = shared.venue_id
    order by shared.played_at desc
    limit 10
  ),
  meetings as (
    select jsonb_agg(jsonb_build_object(
      'game_id', recent.game_id,
      'played_at', recent.played_at,
      'verification_status', recent.verification_status,
      'venue_name', recent.venue_name,
      'my_score', recent.my_score,
      'their_score', recent.their_score
    ) order by recent.played_at desc) as meetings
    from recent
  )
  select jsonb_build_object(
    'games', agg.games,
    'wins', agg.wins,
    'losses', agg.losses,
    'ties', agg.ties,
    'my_avg', agg.my_avg,
    'their_avg', agg.their_avg,
    'meetings', coalesce(meetings.meetings, '[]'::jsonb)
  )
  from agg cross join meetings;
$$;

revoke execute on function tenpins.head_to_head(uuid) from anon, public;
grant execute on function tenpins.head_to_head(uuid) to authenticated;
