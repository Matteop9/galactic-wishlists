-- Milestone 5a: social RPCs — invite preview, join, leaderboard with 7-day
-- movement (computed on the fly, no snapshot table), guest claim.

-- Pre-join invite preview: name, avatar cluster, top-3 — no membership required,
-- no write. Deliberately returns only what the landing page shows (spec §5).
create or replace function tenpins.group_invite_preview(code text)
returns jsonb
language plpgsql stable security definer set search_path = tenpins
as $$
declare
  grp groups%rowtype;
  result jsonb;
begin
  select * into grp from groups where invite_code = code;
  if not found then
    raise exception 'INVALID_INVITE_CODE';
  end if;

  select jsonb_build_object(
    'group_id', grp.id,
    'name', grp.name,
    'season_name', grp.season_name,
    'member_count', (select count(*) from group_members gm where gm.group_id = grp.id),
    'avatars', coalesce((
      select jsonb_agg(sub.avatar_url)
      from (
        select p.avatar_url
        from group_members gm
        join profiles p on p.id = gm.profile_id
        where gm.group_id = grp.id
        order by gm.joined_at
        limit 6
      ) sub
    ), '[]'::jsonb),
    'top3', coalesce((
      select jsonb_agg(jsonb_build_object(
        'display_name', sub.display_name,
        'average', sub.average,
        'games', sub.games
      ))
      from (
        select p.display_name, round(avg(gp.final_score), 1) as average, count(*)::int as games
        from game_players gp
        join games ga on ga.id = gp.game_id and ga.status = 'complete'
        join sessions s on s.id = ga.session_id and s.group_id = grp.id
        join profiles p on p.id = gp.profile_id
        where gp.final_score is not null
          and (grp.season_starts is null or ga.played_at >= grp.season_starts)
          and (grp.season_ends is null or ga.played_at < grp.season_ends + 1)
          and (not grp.verified_only_leaderboard or ga.verification_status = 'verified')
        group by p.id, p.display_name
        order by average desc
        limit 3
      ) sub
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

-- Join by invite code; idempotent (re-joining is a no-op). Returns the group id.
create or replace function tenpins.join_group(code text)
returns uuid
language plpgsql security definer set search_path = tenpins
as $$
declare
  gid uuid;
begin
  select id into gid from groups where invite_code = code;
  if not found then
    raise exception 'INVALID_INVITE_CODE';
  end if;

  insert into group_members (group_id, profile_id, role)
  values (gid, auth.uid(), 'member')
  on conflict do nothing;

  return gid;
end;
$$;

-- Season + verified-only aware leaderboard. Movement is computed on the fly:
-- prev_rank re-runs the same ranking over games played up to 7 days ago
-- (null prev_rank = new entry this week). Members-only.
create or replace function tenpins.group_leaderboard(gid uuid)
returns table (
  profile_id uuid,
  display_name text,
  avatar_url text,
  games int,
  average numeric,
  high_game int,
  rank int,
  prev_rank int
)
language plpgsql stable security definer set search_path = tenpins
as $$
begin
  if not tenpins.is_group_member(gid) then
    raise exception 'NOT_A_MEMBER';
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
      and (grp.season_starts is null or ga.played_at >= grp.season_starts)
      and (grp.season_ends is null or ga.played_at < grp.season_ends + 1)
      and (not grp.verified_only_leaderboard or ga.verification_status = 'verified')
  ),
  now_ranked as (
    select
      sc.pid,
      count(*)::int as games,
      round(avg(sc.final_score), 1) as average,
      max(sc.final_score) as high_game,
      rank() over (order by avg(sc.final_score) desc)::int as rnk
    from scores sc
    group by sc.pid
  ),
  prev_ranked as (
    select sc.pid, rank() over (order by avg(sc.final_score) desc)::int as rnk
    from scores sc
    where sc.played_at <= now() - interval '7 days'
    group by sc.pid
  )
  select nr.pid, p.display_name, p.avatar_url, nr.games, nr.average, nr.high_game, nr.rnk, pr.rnk
  from now_ranked nr
  join profiles p on p.id = nr.pid
  left join prev_ranked pr on pr.pid = nr.pid
  order by nr.rnk, p.display_name;
end;
$$;

-- Claim guest games in one transaction: mark the claim used, retarget matching
-- guest game_players rows within the claim's group, add the claimer to the
-- group, and return the claimed games for the confirmation screen.
create or replace function tenpins.claim_guest_games(code text)
returns jsonb
language plpgsql security definer set search_path = tenpins
as $$
declare
  claim guest_claims%rowtype;
  grp_name text;
  games_json jsonb;
begin
  select * into claim from guest_claims
  where claim_code = code and claimed_by is null
  for update;
  if not found then
    raise exception 'INVALID_OR_USED_CLAIM_CODE';
  end if;

  update guest_claims
  set claimed_by = auth.uid(), claimed_at = now()
  where id = claim.id;

  with updated as (
    update game_players gp
    set profile_id = auth.uid(), guest_name = null
    from games ga, sessions s
    where gp.game_id = ga.id
      and ga.session_id = s.id
      and s.group_id = claim.group_id
      and gp.profile_id is null
      and lower(gp.guest_name) = lower(claim.guest_name)
    returning gp.game_id, gp.final_score
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'game_id', u.game_id,
    'played_at', ga.played_at,
    'venue_name', v.name,
    'final_score', u.final_score
  ) order by ga.played_at desc), '[]'::jsonb)
  into games_json
  from updated u
  join games ga on ga.id = u.game_id
  left join sessions s on s.id = ga.session_id
  left join venues v on v.id = s.venue_id;

  insert into group_members (group_id, profile_id, role)
  values (claim.group_id, auth.uid(), 'member')
  on conflict do nothing;

  select name into grp_name from groups where id = claim.group_id;

  return jsonb_build_object(
    'group_id', claim.group_id,
    'group_name', grp_name,
    'guest_name', claim.guest_name,
    'games', games_json
  );
end;
$$;

-- Authenticated users call these via /rest/v1/rpc/ (Accept-Profile: tenpins); anon cannot.
revoke execute on function tenpins.group_invite_preview(text) from anon, public;
revoke execute on function tenpins.join_group(text) from anon, public;
revoke execute on function tenpins.group_leaderboard(uuid) from anon, public;
revoke execute on function tenpins.claim_guest_games(text) from anon, public;
grant execute on function tenpins.group_invite_preview(text) to authenticated;
grant execute on function tenpins.join_group(text) to authenticated;
grant execute on function tenpins.group_leaderboard(uuid) to authenticated;
grant execute on function tenpins.claim_guest_games(text) to authenticated;
