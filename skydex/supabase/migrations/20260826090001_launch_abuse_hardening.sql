-- V4 v1.0 launch hardening: storage bucket constraints, report length cap,
-- per-user insert throttles for feedback/reports, security-advisor cleanup.

-- 1) sightings bucket: enforce image mime types + 8 MB at the storage API layer,
--    so a direct anon-key upload can't host non-image content or oversized files
--    (the /api/sightings magic-byte check only covers the server path).
update storage.buckets
set allowed_mime_types = array['image/jpeg','image/png','image/webp'],
    file_size_limit = 8388608
where id = 'sightings';

-- 2) Upload path must also look like an image: keep the own-folder pinning,
--    add an extension allowlist (server uploads use uuid.jpg/png/webp).
drop policy if exists sightings_photo_insert_own on storage.objects;
create policy sightings_photo_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'sightings'
    and (storage.foldername(name))[1] = (auth.uid())::text
    and name ~* '\.(jpe?g|png|webp)$'
  );

-- 3) reports.reason server-side length cap (the client prompt was unbounded;
--    current max in the table is 20 chars, so no backfill needed).
alter table public.reports
  add constraint reports_reason_len check (reason is null or char_length(reason) <= 500);

-- 4) Per-user insert throttles, enforced in the DB so the direct anon-key path
--    is covered too (feedback/reports are client inserts pinned by RLS but were
--    otherwise unthrottled). SECURITY DEFINER so the count sees all own rows
--    regardless of RLS; EXECUTE revoked like the ticket trigger fns.
create or replace function public.throttle_feedback() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.feedback
      where user_id = new.user_id
        and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too much feedback in the last hour — please try again later.';
  end if;
  return new;
end $$;
revoke execute on function public.throttle_feedback() from public, anon, authenticated;
drop trigger if exists feedback_throttle on public.feedback;
create trigger feedback_throttle before insert on public.feedback
  for each row execute function public.throttle_feedback();

create or replace function public.throttle_reports() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.reports
      where reporter_id = new.reporter_id
        and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Too many reports in the last hour — please try again later.';
  end if;
  return new;
end $$;
revoke execute on function public.throttle_reports() from public, anon, authenticated;
drop trigger if exists reports_throttle on public.reports;
create trigger reports_throttle before insert on public.reports
  for each row execute function public.throttle_reports();

-- 5) Security-advisor cleanup: pin search_path on the three flagged functions;
--    stop API roles invoking the auth signup trigger fn directly (trigger firing
--    does not require EXECUTE, only creation did — standard linter remediation).
alter function public.epoch_seconds(timestamptz) set search_path = public;
alter function public.rarity_rank(text) set search_path = public;
alter function public.rarity_floor(text) set search_path = public;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.review_unvote(uuid) from anon;
