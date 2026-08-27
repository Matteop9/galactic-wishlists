-- User blocking (App Review guideline 1.2): blocks table, per-viewer visibility
-- filters, two-way comment-insert guard. Visibility is ONE-way — the blocker
-- stops seeing the blocked user's sightings/comments (filtering the reverse
-- direction would leak block status). Commenting is blocked BOTH ways.

-- 1) The table. FKs to profiles(id) (same target as comments.user_id) so
--    PostgREST can embed profiles(...) for the Settings list, and so account
--    deletion stays pure cascade (auth.users -> profiles -> blocks) with no
--    delete-account Edge Function change.
create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_no_self check (blocker_id <> blocked_id)
);
comment on table public.blocks is
  'User blocks (App Review 1.2). Blocker stops seeing the blocked user''s sightings/comments; neither can comment on the other''s sightings.';

alter table public.blocks enable row level security;
create policy blocks_read_own on public.blocks
  for select using (auth.uid() = blocker_id);
create policy blocks_insert_own on public.blocks
  for insert with check (auth.uid() = blocker_id);
create policy blocks_delete_own on public.blocks
  for delete using (auth.uid() = blocker_id);

-- 2) Shared predicate: has the CURRENT viewer blocked this author?
--    SECURITY DEFINER so it works identically inside the definer feed view and
--    the comments RLS policy regardless of blocks RLS; STABLE (auth.uid() is
--    fixed per query); anonymous viewers -> auth.uid() null -> false.
create or replace function public.viewer_blocked(p_author uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocks
    where blocker_id = auth.uid() and blocked_id = p_author
  );
$$;
grant execute on function public.viewer_blocked(uuid) to anon, authenticated;

-- 3) Feed view: every sighting list (/feed, profiles, books, load-more) reads
--    this view, so one WHERE clause filters them all. Column list copied
--    verbatim from the live definition (identical to frequent_flyer_tier);
--    all_sightings (admin/dev) and shared_sightings (/s/[id]) stay unfiltered.
create or replace view public.feed_sightings as
 select s.id, s.created_at, s.captured_at, s.callsign, s.registration,
        s.aircraft_type, s.airline, s.altitude_m, s.rarity, s.verified,
        s.photo_path, s.user_id, p.handle, s.origin, s.destination,
        p.avatar_seed, p.is_admin, s.flight_no, s.painted_as, s.operating_as,
        s.eta, s.gspeed_kt, s.vspeed_fpm,
        coalesce(rc.n, 0) as reaction_count, p.frequent_flyer
   from sightings s
   join profiles p on p.id = s.user_id
   left join lateral (select count(*)::integer as n
                        from reactions r
                       where r.sighting_id = s.id and r.emoji = '🛫'::text) rc on true
  where s.verified = true
    and (s.review_status is null or s.review_status = 'cleared'::text)
    and not public.viewer_blocked(s.user_id);

-- 4) Comments: RESTRICTIVE select policy — ANDs with the existing permissive
--    comments_select_all, so blocked authors' comments (and their share of the
--    feed's comment counts) disappear for the blocker only. Anonymous viewers
--    and the author's own rows are unaffected (nobody blocks themself).
create policy comments_hide_blocked on public.comments
  as restrictive for select
  using (not public.viewer_blocked(user_id));

-- 5) Two-way comment-insert guard, throttle_reports() pattern: SECURITY DEFINER
--    (needs the sighting owner + both block directions regardless of RLS),
--    EXECUTE revoked, covers the direct anon-key insert path too. Generic error
--    text so block status isn't confirmed outright.
create or replace function public.block_comment_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.sightings s
    join public.blocks b
      on (b.blocker_id = s.user_id and b.blocked_id = new.user_id)
      or (b.blocker_id = new.user_id and b.blocked_id = s.user_id)
    where s.id = new.sighting_id
  ) then
    raise exception 'You can''t comment on this sighting.';
  end if;
  return new;
end $$;
revoke execute on function public.block_comment_insert() from public, anon, authenticated;
drop trigger if exists comments_block_guard on public.comments;
create trigger comments_block_guard before insert on public.comments
  for each row execute function public.block_comment_insert();

-- 6) Insert throttle, same shape as throttle_reports (blocks are client-visible
--    RLS inserts; the cap keeps the direct anon-key path from spamming rows).
create or replace function public.throttle_blocks() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.blocks
      where blocker_id = new.blocker_id
        and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'Too many blocks in the last hour — please try again later.';
  end if;
  return new;
end $$;
revoke execute on function public.throttle_blocks() from public, anon, authenticated;
drop trigger if exists blocks_throttle on public.blocks;
create trigger blocks_throttle before insert on public.blocks
  for each row execute function public.throttle_blocks();
