-- International-break gameweeks (applied 2026-08-10 as `international_breaks`):
-- no club football, picks are sports/categories (NFL, Boxing, Horse Racing...).
-- Flag drives distinct presentation and sport suggestions in the app;
-- live_enabled=false silences the Saturday poller (live_tick already gates on
-- it) — the admin toggle sets both flags together.

alter table gameweeks add column is_international_break boolean not null default false;

-- Back-tag historical break weeks, identified by their sport-category picks
-- (matched 4 weeks: 2025-09-06, 2025-10-11, 2025-11-15, 2026-03-28).
update gameweeks set is_international_break = true
where id in (
  select distinct gameweek_id from picks
  where team in ('Football', 'Boxing', 'Cricket', 'Darts', 'F1', 'Nascar', 'NFL',
                 'Tennis', 'Horse Racing', 'Ice Hockey', 'Lacrosse',
                 'League of Legends', 'Volleyball', 'UFC')
     or second_team in ('Football', 'Boxing', 'Cricket', 'Darts', 'F1', 'Nascar', 'NFL',
                 'Tennis', 'Horse Racing', 'Ice Hockey', 'Lacrosse',
                 'League of Legends', 'Volleyball', 'UFC')
);
