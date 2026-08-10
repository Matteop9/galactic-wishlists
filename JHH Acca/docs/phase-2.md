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

## Shipped in v0.4.0 (2026-08-10)

- [x] Club badges for lower-league sides — TheSportsDB fallback resolved via `scripts/fetch-badges.ts` → `src/lib/badges.ts`; anything still unmatched keeps the initials chip
- [x] International-break weeks — admin toggle per gameweek (sets `is_international_break`, turns live off), 🌍 chip everywhere, Enter Pick suggests sports with emoji instead of clubs; 4 historical break weeks back-tagged

## Shipped in v0.5.0 (2026-08-10)

All from the in-app feedback queue.

- [x] Standings period picker is a dropdown, not a horizontal scroll strip — defaults to this season
- [x] International-break weeks can be counted or left out, from a second dropdown
      (migration `0019` — `p_exclude_breaks` on `leaderboard()`/`team_leaderboard()`;
      the GW-margin chart and form grid follow the same setting client-side)
- [x] Gameweeks list shows a per-week summary — `9/12 · VDL +2.01` on settled weeks
- [x] Form grid look-back window — 5 / 10 / 20 gameweeks

## Backlog / deferred

- [ ] **BTTS both teams + tick/cross showing the actual result** (feedback, deferred from v0.5.0
      pending a decision). Notes from the v0.5.0 investigation:
      - New BTTS picks already capture both teams (Enter Pick requires it). The gap is history:
        130 of 219 BTTS picks have no `second_team` — the workbook never recorded it.
        **Decision: leave them**, no backfill.
      - The scoreline half is nearly free — `v_live_pick_status` already exposes
        `home_team/away_team/home_score/away_score/fixture_status` and `LivePickChip` already
        renders `2–1 FT`. It's hidden only because `GameweekDetail.tsx` gates the chip on
        `gw.status === 'closed'`, so it vanishes the moment a week is settled.
      - Caveat: needs `picks.fixture_id` set. **0 picks are matched today** — this only starts
        producing scorelines from Test Weekend onward, and only for competitions on the
        football-data free tier.
- [ ] Screenshot ingestion (deferred from v0.1 checklist)
- [ ] Announcement graphic (deferred from v0.1 checklist)
- [ ] Feedback-driven items — see Admin → Feedback Queue

## Conventions

- User-facing changelog: `src/lib/changelog.ts` (shown on This Week). Technical log: `CHANGELOG.md`.
- Every new phase-2 request: add it here, ship it, move it to the shipped list with the version.
