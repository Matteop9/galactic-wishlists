-- Personalisable profile banner (feedback 25 Aug): one of four preset cover
-- themes, rendered client-side — no storage, no uploads, just a key.
alter table public.profiles
  add column cover_theme text not null default 'day'
  check (cover_theme in ('day','sunset','night','gold'));
