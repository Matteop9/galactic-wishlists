-- tp_0018 — leaderboard periods (feedback queue #3, groups-as-friends slice C3).
--
-- `group_leaderboard(gid)` only ever ranked the group's season window. This
-- adds a period argument — 'season' (unchanged default), '30d' (rolling last
-- 30 days) and 'all' (no window) — plus a second ranking by high game so the
-- UI's metric toggle (average / high game) needs no extra round trip.
--
-- The old single-arg signature is DROPPED, not overloaded: the return shape
-- changes (two new columns), and PostgREST resolves `rpc/group_leaderboard`
-- by name — two overloads with different signatures and no matching
-- Accept-Profile-scoped disambiguation would make it a PGRST203 (300
-- ambiguous) error on every call, not a clean fallback. One signature, one
-- call, `p_period` defaults to 'season' so existing callers compile unchanged
-- until the client passes it explicitly.
drop function if exists tenpins.group_leaderboard(uuid);

create or replace function tenpins.group_leaderboard(gid uuid, p_period text default 'season')
returns table (
  profile_id uuid,
  display_name text,
  avatar_url text,
  games int,
  average numeric,
  high_game int,
  rank int,
  prev_rank int,
  rank_high int,
  prev_rank_high int
)
language plpgsql stable security definer set search_path = tenpins
as $$
begin
  if not tenpins.is_group_member(gid) then
    raise exception 'NOT_A_MEMBER';
  end if;

  if p_period not in ('season', '30d', 'all') then
    raise exception 'BAD_PERIOD';
  end if;

  return query
  with grp as (
    select * from groups g where g.id = gid
  ),
  scores as (
    select gp.profile_id as pid, gp.final_score, ga.played_at
    from game_players gp
    join games ga on ga.id = gp.game_id and ga.status = 'complete'
    join sessions s on s.id = ga.session_id and s.group_id = gid
    cross join grp
    where gp.profile_id is not null and gp.final_score is not null
      and (not grp.verified_only_leaderboard or ga.verification_status = 'verified')
      and (
        (p_period = 'season' and (grp.season_starts is null or ga.played_at >= grp.season_starts)
                              and (grp.season_ends is null or ga.played_at < grp.season_ends + 1))
        or (p_period = '30d' and ga.played_at >= now() - interval '30 days')
        or (p_period = 'all')
      )
  ),
  now_ranked as (
    select
      sc.pid,
      count(*)::int as games,
      round(avg(sc.final_score), 1) as average,
      max(sc.final_score) as high_game,
      rank() over (order by avg(sc.final_score) desc)::int as rnk,
      rank() over (order by max(sc.final_score) desc, avg(sc.final_score) desc)::int as rnk_high
    from scores sc
    group by sc.pid
  ),
  prev_ranked as (
    select
      sc.pid,
      rank() over (order by avg(sc.final_score) desc)::int as rnk,
      rank() over (order by max(sc.final_score) desc, avg(sc.final_score) desc)::int as rnk_high
    from scores sc
    where sc.played_at <= now() - interval '7 days'
    group by sc.pid
  )
  select
    nr.pid, p.display_name, p.avatar_url, nr.games, nr.average, nr.high_game,
    nr.rnk, pr.rnk, nr.rnk_high, pr.rnk_high
  from now_ranked nr
  join profiles p on p.id = nr.pid
  left join prev_ranked pr on pr.pid = nr.pid
  order by nr.rnk, p.display_name;
end;
$$;

-- Authenticated users call this via /rest/v1/rpc/ (Accept-Profile: tenpins); anon cannot.
revoke execute on function tenpins.group_leaderboard(uuid, text) from anon, public;
grant execute on function tenpins.group_leaderboard(uuid, text) to authenticated;
