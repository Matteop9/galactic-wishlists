-- Match days: teams for a day, best-of-N series, per-player handicaps.
-- A match day hangs 1:1 off a session; a leg = games.game_number within that
-- session. All series state (legs won, totals, winner) is DERIVED client-side
-- from frames/final scores — only match_days.status is stored.

create table tenpins.match_days (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references tenpins.sessions on delete cascade unique not null,
  group_id uuid references tenpins.groups not null,
  created_by uuid references tenpins.profiles not null,
  best_of int not null default 1 check (best_of in (1,3,5)),
  scoring_mode text not null default 'total_pins' check (scoring_mode in ('total_pins','points')),
  handicap_basis int not null,          -- snapshotted from group settings at creation
  handicap_pct int not null,
  status text not null default 'active' check (status in ('active','finished','abandoned')),
  created_at timestamptz default now()
);

create table tenpins.match_day_teams (
  id uuid primary key default gen_random_uuid(),
  match_day_id uuid references tenpins.match_days on delete cascade not null,
  name text not null,
  team_order int not null default 0
);

create table tenpins.match_day_players (
  id uuid primary key default gen_random_uuid(),
  match_day_id uuid references tenpins.match_days on delete cascade not null,
  team_id uuid references tenpins.match_day_teams on delete cascade not null,
  profile_id uuid references tenpins.profiles,
  guest_name text,
  pairing_order int not null default 0,   -- i-th player of each team meet in points mode
  handicap int not null default 0 check (handicap >= 0),
  check (profile_id is not null or guest_name is not null)
);

create unique index tp_mdp_profile_uidx
  on tenpins.match_day_players (match_day_id, profile_id) where profile_id is not null;
create unique index tp_mdp_guest_uidx
  on tenpins.match_day_players (match_day_id, lower(guest_name)) where guest_name is not null;
create index tp_match_days_group_idx on tenpins.match_days (group_id, created_at desc);
create index tp_mdt_match_day_idx on tenpins.match_day_teams (match_day_id);
create index tp_mdp_match_day_idx on tenpins.match_day_players (match_day_id);

-- RLS -----------------------------------------------------------------------
-- Helpers query match_days, never the table being policied, so
-- INSERT … RETURNING on teams/players is snapshot-safe.

create or replace function tenpins.can_see_match_day(mdid uuid)
returns boolean
language sql stable security definer set search_path = tenpins
as $$
  select exists (
    select 1 from match_days md
    where md.id = mdid
      and (md.created_by = auth.uid() or tenpins.is_group_member(md.group_id))
  );
$$;

create or replace function tenpins.owns_match_day(mdid uuid)
returns boolean
language sql stable security definer set search_path = tenpins
as $$
  select exists (
    select 1 from match_days md
    where md.id = mdid
      and (md.created_by = auth.uid() or tenpins.is_group_admin(md.group_id))
  );
$$;

alter table tenpins.match_days enable row level security;
alter table tenpins.match_day_teams enable row level security;
alter table tenpins.match_day_players enable row level security;

create policy match_days_select on tenpins.match_days for select to authenticated
  using (created_by = auth.uid() or tenpins.is_group_member(group_id));
create policy match_days_insert on tenpins.match_days for insert to authenticated
  with check (created_by = auth.uid() and tenpins.is_group_member(group_id));
create policy match_days_update on tenpins.match_days for update to authenticated
  using (created_by = auth.uid() or tenpins.is_group_admin(group_id))
  with check (created_by = auth.uid() or tenpins.is_group_admin(group_id));
create policy match_days_delete on tenpins.match_days for delete to authenticated
  using (created_by = auth.uid());

create policy match_day_teams_select on tenpins.match_day_teams for select to authenticated
  using (tenpins.can_see_match_day(match_day_id));
create policy match_day_teams_insert on tenpins.match_day_teams for insert to authenticated
  with check (tenpins.owns_match_day(match_day_id));
create policy match_day_teams_update on tenpins.match_day_teams for update to authenticated
  using (tenpins.owns_match_day(match_day_id)) with check (tenpins.owns_match_day(match_day_id));
create policy match_day_teams_delete on tenpins.match_day_teams for delete to authenticated
  using (tenpins.owns_match_day(match_day_id));

create policy match_day_players_select on tenpins.match_day_players for select to authenticated
  using (tenpins.can_see_match_day(match_day_id));
create policy match_day_players_insert on tenpins.match_day_players for insert to authenticated
  with check (tenpins.owns_match_day(match_day_id));
create policy match_day_players_update on tenpins.match_day_players for update to authenticated
  using (tenpins.owns_match_day(match_day_id)) with check (tenpins.owns_match_day(match_day_id));
create policy match_day_players_delete on tenpins.match_day_players for delete to authenticated
  using (tenpins.owns_match_day(match_day_id));

revoke execute on function tenpins.can_see_match_day(uuid) from anon, public;
revoke execute on function tenpins.owns_match_day(uuid) from anon, public;
grant execute on function tenpins.can_see_match_day(uuid) to authenticated;
grant execute on function tenpins.owns_match_day(uuid) to authenticated;

-- Guest claims now also retarget match-day rows so a claimed guest keeps
-- their team seat and handicap history.
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

  update match_day_players mdp
  set profile_id = auth.uid(), guest_name = null
  from match_days md
  where mdp.match_day_id = md.id
    and md.group_id = claim.group_id
    and mdp.profile_id is null
    and lower(mdp.guest_name) = lower(claim.guest_name);

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
