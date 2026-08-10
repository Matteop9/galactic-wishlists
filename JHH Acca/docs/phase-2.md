# Phase 2 — changes from the original build

Running list of everything requested after v0.1/v0.2 shipped. New requests land
here first (or in the in-app feedback queue), then get ticked off per release.

## Shipped in v0.3.0 (2026-08-10)

- [x] Changelog on the front page (What's New panel, latest release expanded)
- [x] Feedback stored in a table — submit from You → Settings, review/status in Admin
- [x] Standings (renamed from Table) with sortable columns
- [x] Full GW history as a diverging bar chart — bar pulls left (VDL yellow) or right (JHP blue) by the week's margin
- [x] Team entry dropdown: search every team ever picked, with club badges, manual entry still allowed
- [x] Team-name consistency sweep — 29 variants/misspellings canonicalised in the DB (migration 0017); Man City / Man United were already consistent
- [x] Picks page notice: pick must go in the group chat first
- [x] Player names in team colours everywhere (VDL yellow `--color-vdl`, JHP blue `--color-jhp`)
- [x] JHP Test Weekend pairs set up (Team 4: Dom+George, Team 5: Harry+Matt, Team 6: Sandy+Will)
- [x] Adjustments (bonus/minus) now visible on gameweek pages and removable in Admin
      — note: an adjustment on the Test Weekend GW only shows in the sandbox, never in real standings
- [x] Load more on pick history (profile) and GW history chart

## Backlog / deferred

- [ ] Screenshot ingestion (deferred from v0.1 checklist)
- [ ] Announcement graphic (deferred from v0.1 checklist)
- [ ] Club badges for lower-league sides (only clubs with football-data.org crest ids show badges; the rest fall back to initials chips)
- [ ] Feedback-driven items — see Admin → Feedback Queue

## Conventions

- User-facing changelog: `src/lib/changelog.ts` (shown on This Week). Technical log: `CHANGELOG.md`.
- Every new phase-2 request: add it here, ship it, move it to the shipped list with the version.
