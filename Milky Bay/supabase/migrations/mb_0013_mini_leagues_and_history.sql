-- Mini leagues become first-class (admin creates them and assigns gameweeks),
-- the current season is really 26/27, half-season wooden spoon exists, and
-- the last two seasons' final tables are imported (user-supplied 2026-08-19;
-- earlier seasons deliberately not recorded).
--
-- History resolution: the agreement doc (titled "25/26") listed history up to
-- 24/25; the user then supplied final tables for 24/25 (Harry 83.14 ... Luke
-- 62.05 — matching the agreement's winner/last) and 25/26 (Tim 74.53 ... Luke
-- 62.12). So: Tim has crowns for 23/24 AND 25/26; Luke spoons for 24/25 AND
-- 25/26 plus the 22/23 half-crown; Sandy's 22/23 spoon is a HALF spoon (half
-- season).

-- 1) current season is 26/27
update milkybay.seasons set name = '26/27' where name = '25/26';

-- 2) mini leagues
create table milkybay.mini_leagues (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references milkybay.seasons(id),
  name text not null,
  created_at timestamptz not null default now(),
  unique (season_id, name)
);
alter table milkybay.gameweeks add column mini_league_id uuid references milkybay.mini_leagues(id);

alter table milkybay.mini_leagues enable row level security;
grant select on milkybay.mini_leagues to authenticated;
grant insert, update, delete on milkybay.mini_leagues to authenticated;
grant all on milkybay.mini_leagues to service_role;
revoke all on milkybay.mini_leagues from anon;
create policy mb_read_mini_leagues on milkybay.mini_leagues for select to authenticated using (milkybay.is_player());
create policy mb_admin_write_mini_leagues on milkybay.mini_leagues for all to authenticated
  using (milkybay.is_admin()) with check (milkybay.is_admin());

create function milkybay.mini_leaderboard(p_mini uuid)
returns table (player_id uuid, name text, entries bigint, wins bigint, score numeric)
language sql stable set search_path = milkybay as
$$
  with pr as (
    select ps.* from v_pick_scores ps
    join gameweeks g on g.id = ps.gameweek_id
    where g.mini_league_id = p_mini and ps.points is not null
  ),
  adj as (
    select a.player_id, coalesce(sum(a.score), 0) as total
    from adjustments a join gameweeks g on g.id = a.gameweek_id
    where g.mini_league_id = p_mini and a.player_id is not null
    group by 1
  )
  select pl.id, pl.name,
         count(*) filter (where not pr.is_no_pick),
         count(*) filter (where pr.result = 1),
         coalesce(sum(pr.points), 0) + coalesce(max(a.total), 0)
  from pr
  join players pl on pl.id = pr.player_id
  left join adj a on a.player_id = pr.player_id
  group by pl.id, pl.name
$$;
grant execute on function milkybay.mini_leaderboard(uuid) to authenticated;

-- Seed the agreement's mini league: first 6 weekends, until Jersey weekend
insert into milkybay.mini_leagues (season_id, name)
select id, 'Jersey Weekend Mini League' from milkybay.seasons where name = '26/27';
update milkybay.gameweeks g
   set mini_league_id = (select id from milkybay.mini_leagues where name = 'Jersey Weekend Mini League')
 where g.gw_date in (select gw_date from milkybay.gameweeks order by gw_date limit 6);

-- 3) half-season wooden spoon (Sandy, 22/23)
alter table milkybay.honours drop constraint honours_award_check;
alter table milkybay.honours add constraint honours_award_check
  check (award in ('winner', 'half_season_winner', 'wooden_spoon', 'half_wooden_spoon'));

update milkybay.honours h set award = 'half_wooden_spoon'
from milkybay.players p
where h.player_id = p.id and p.name = 'Sandy' and h.season_label = '22/23';

-- 25/26 honours from the final table: Tim won, Luke last
insert into milkybay.honours (season_label, player_id, award, notes)
select '25/26', p.id, v.award, v.notes
from (values ('Tim', 'winner', 'Won with 74.53'), ('Luke', 'wooden_spoon', 'Last with 62.12'))
  as v(name, award, notes)
join milkybay.players p on p.name = v.name
on conflict (season_label, award) do nothing;

-- v_honours gains half_spoons (drop+create: column order changes)
drop view milkybay.v_honours;
create view milkybay.v_honours with (security_invoker = on) as
select player_id,
       count(*) filter (where award = 'winner') as crowns,
       count(*) filter (where award = 'half_season_winner') as half_crowns,
       count(*) filter (where award = 'wooden_spoon') as spoons,
       count(*) filter (where award = 'half_wooden_spoon') as half_spoons,
       array_agg(season_label || ' ' || award order by season_label) as detail
from milkybay.honours
group by 1;
grant select on milkybay.v_honours to authenticated;

-- 4) past-season final tables
create table milkybay.season_history (
  id uuid primary key default gen_random_uuid(),
  season_label text not null,
  player_id uuid not null references milkybay.players(id),
  position int not null,
  score numeric not null,
  unique (season_label, player_id)
);
alter table milkybay.season_history enable row level security;
grant select on milkybay.season_history to authenticated;
grant insert, update, delete on milkybay.season_history to authenticated;
grant all on milkybay.season_history to service_role;
revoke all on milkybay.season_history from anon;
create policy mb_read_season_history on milkybay.season_history for select to authenticated using (milkybay.is_player());
create policy mb_admin_write_season_history on milkybay.season_history for all to authenticated
  using (milkybay.is_admin()) with check (milkybay.is_admin());

insert into milkybay.season_history (season_label, player_id, position, score)
select v.label, p.id, v.pos, v.score
from (values
  ('25/26', 'Tim',   1, 74.53), ('25/26', 'Sandy', 2, 71.33), ('25/26', 'Liam', 3, 66.82),
  ('25/26', 'Harry', 4, 64.58), ('25/26', 'Luke',  5, 62.12),
  ('24/25', 'Harry', 1, 83.14), ('24/25', 'Sandy', 2, 68.32), ('24/25', 'Liam', 3, 67.80),
  ('24/25', 'Tim',   4, 63.88), ('24/25', 'Luke',  5, 62.05)
) as v(label, name, pos, score)
join milkybay.players p on p.name = v.name;

create trigger mb_audit_mini_leagues after insert or update or delete on milkybay.mini_leagues
  for each row execute function milkybay.audit();
create trigger mb_audit_season_history after insert or update or delete on milkybay.season_history
  for each row execute function milkybay.audit();
