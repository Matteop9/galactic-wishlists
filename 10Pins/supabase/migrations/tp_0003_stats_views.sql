-- Personal stats views (spec §9) — security_invoker so the caller's RLS applies.
-- frame_scored_games uses the cached per-player counters, which are only set
-- for frame-scored games (photo/live/manual); quick adds leave them null.

create view tenpins.player_stats with (security_invoker = true) as
select
  gp.profile_id,
  count(*)::int as games,
  round(avg(gp.final_score), 1) as average,
  max(gp.final_score) as high_game,
  count(*) filter (where gp.strikes is not null)::int as frame_scored_games,
  coalesce(sum(gp.strikes), 0)::int as strikes,
  coalesce(sum(gp.spares), 0)::int as spares,
  coalesce(sum(gp.opens), 0)::int as opens
from tenpins.game_players gp
join tenpins.games g on g.id = gp.game_id and g.status = 'complete'
where gp.profile_id is not null and gp.final_score is not null
group by gp.profile_id;

create view tenpins.player_venue_stats with (security_invoker = true) as
select
  gp.profile_id,
  v.id as venue_id,
  v.name as venue_name,
  count(*)::int as games,
  round(avg(gp.final_score), 1) as average
from tenpins.game_players gp
join tenpins.games g on g.id = gp.game_id and g.status = 'complete'
join tenpins.sessions s on s.id = g.session_id
join tenpins.venues v on v.id = s.venue_id
where gp.profile_id is not null and gp.final_score is not null
group by gp.profile_id, v.id, v.name;
