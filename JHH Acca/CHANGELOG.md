# Changelog — The Acca (JHH Acca)

## v0.4.0 — 2026-08-10

- **Lower-league badges**: `scripts/fetch-badges.ts` resolves every club without a football-data.org crest against TheSportsDB (conservative matching: Soccer-only, exact > alternate > substring, alias table for nicknames like Stockport→Stockport County, Hearts→Heart of Midlothian; rate-limit-aware and resumable) and generates `src/lib/badges.ts`. `crestUrl()` now falls back football-data → TheSportsDB `/small` (64px) → initials chip. Rerun the script when a brand-new club appears.
- **International breaks** (migration `0018`): `gameweeks.is_international_break` flag; admin toggles it per week (🌍 BREAK button), which also flips `live_enabled` off/on — `live_tick()` already gates on that, so the Saturday poller stays silent. Break weeks show a 🌍 INT'L BREAK chip on This Week / Gameweeks / detail; Enter Pick shows a break banner and suggests **sports** (with emoji badges — ⚽🏈🥊🐎…) instead of clubs, while normal weeks no longer suggest sport categories. The four historical break weeks (2025-09-06, 2025-10-11, 2025-11-15, 2026-03-28) were back-tagged by their sport picks.

## v0.3.0 — 2026-08-10

Phase 2 polish pass (full request list tracked in `docs/phase-2.md`):

- **Standings** (renamed from Table/Leaderboards): sortable columns (P/W/Score/S/M, toggle asc/desc), plus a **GW history diverging bar chart** — one row per settled gameweek, bar pulls left (VDL) or right (JHP) by that week's margin, scaled to the range, linked through to the gameweek, load-more paged.
- **Team picker**: Enter Pick inputs are now search comboboxes over every team ever picked (usage counts, club badges), free text still allowed for new teams. Badges (`crests.football-data.org`, ~110 clubs mapped in `src/lib/teams.ts`) also show on acca cards, gameweek detail and pick history; unmapped clubs fall back to initials chips.
- **Team-name canonicalisation** (migration `0017`): 29 variants fixed in `picks` (e.g. Athletico→Atletico Madrid, Middlesborough→Middlesbrough, Villareal→Villarreal, Palmero→Palermo, Spurs→Tottenham, Leipzig→RB Leipzig, Hull City→Hull, Notts Forest→Nottingham Forest) + whitespace trim. Text-only — odds/results untouched; all-time totals still reconcile (VDL 656.4740 / JHP 599.2911). `picks_stamp` trigger disabled during the update so historical `submitted_at/by` survive. Seed CSV intentionally keeps original spellings.
- **Feedback table** (`feedback`, RLS: own insert, all read, admin status updates, audited): submit from You → Settings, review with new/planned/done/dismissed statuses in Admin → Feedback Queue.
- **Changelog on the front page**: What's New panel on This Week, driven by `src/lib/changelog.ts`.
- **Adjustments made visible**: listed on the gameweek page and in Admin (with remove). Heads-up: adjustments on test-season gameweeks only ever appear in the sandbox tab, never in real standings — by design.
- **Names wear team colours** everywhere (standings, cards, form grid, admin, pick entry, profiles); `--color-vdl` shifted from amber to a clear yellow (#f6c437) per "blue and yellow".
- **Picks page**: prominent "group chat first" notice.
- **JHP Test Weekend pairs** (Team 4: Dom+George, 5: Harry+Matt, 6: Sandy+Will) added to the same 15 Aug sandbox gameweek — 2/2 pair sweeps double for them too.
- **Load more**: profile pick history no longer stops at 15.
- Routes: `/standings` is canonical; `/table` kept for old bookmarks.

## v0.2.0 — 2026-08-10

Username + password auth (replaces magic links entirely — no email, no Supabase redirect-URL config needed):
- First-time flow: pick your name from the unclaimed list → choose username + password → enter the shared **group code** (default `ACCA2627`, editable on Admin) → in.
- Auth users created server-side (`register_player` RPC, bcrypt via pgcrypto, synthetic `@players.jhh-acca.app` emails); registration guards verified (wrong code / taken username / short password / claimed name all rejected). Registrations are audited with IP + user agent like everything else.
- Admin → Accounts: see usernames, edit the group code, **reset password**, **unlink** (frees the name to re-register) — full recovery without email.
- End-to-end verified: register → auto sign-in → full data access; sign-out/sign-in round trip.

## v0.1.0 — 2026-08-10

First full build, live at https://jhh-acca.vercel.app.

### Database (Supabase, 15 migrations)
- Complete domain model: players, seasons (league/special/test), gameweeks, picks, adjustments, disputes, claim tokens, fixtures, audit log, LLM config/usage.
- **Seed import validated to the penny**: all 1,287 historical picks across 108 gameweeks; the validation gate proves the scoring layer reproduces the workbook exactly (George 119.7279, VDL 656.4740, JHP 599.2911, per-row effective odds = sheet odds on every row, including the 18 doubled rows and the two pre-rule 6/6 weeks).
- Scoring in SQL: `leaderboard()`, `team_leaderboard()`, `season_leaderboard()`, `form_grid()`; generalised sweep double (6/6 for league, 2/2 for Test Weekend pairs), gated on season `double_rule` and never on a season final; stored odds never mutated.
- Test season isolation: sandbox picks structurally excluded from all real stats (verified by rollback test).
- RLS: reads need a claimed player; teammate pick entry while the window is open; `result`/`locked` un-writable via the API (settlement via `settle_pick` RPC); audit log immutable; policies wrapped for InitPlan performance.
- Full audit trail: every write on mutable tables records actor, before/after, client IP and user agent.
- Gameweek windows Thu 18:00 → Fri 20:00 UK computed per-row (BST/GMT-proof), 5-minute cron sweeper, auto N/A no-picks at team average odds on close.
- Live scores layer entirely in Postgres: pg_net poller (1 req/min, Sat 14:00–19:30 UK window), Vault-stored API tokens, fixtures ingest verified against the real football-data.org API (20 fixtures for 15 Aug). LLM pick→fixture matching via OpenRouter with confidence threshold + admin queue; usage logged to `llm_usage`.

### App (Vite + React + TS + Tailwind v4)
- "Friday Night Slip" design system: dark theme, Saira Condensed / Archivo / Spline Sans Mono, team colours, method badges, ×2 gold chip (market odds never mutated in display).
- Pages: This Week (acca cards, countdown/live banner), Leaderboards (season pills, All Time by score-per-match, tug bar, form grid, custom range, Test Weekend sandbox tab, provisional live table toggle), Gameweeks + detail (sweep banner, settle toggles with FT suggestions, dispute raise/resolve, admin match queue), Enter Pick (teammate entry, odds stepper, window enforcement), Player profile (stat tiles, method split, history), Admin (claim links, disputes, GW skip/create, adjustments, LLM usage tracking, test checklist, audit view), Rules.
- Magic-link auth + one-time claim links; unclaimed accounts see nothing.

### Seeded for Test Weekend (Sat 15 Aug)
- Test season with pairs: Matteo+Henry / Fraser+Ausy / Tom+Luke; window Thu 13 Aug 18:00 → Fri 14 Aug 20:00 UK; 2/2 pair sweep doubles (verified).
- Season 7 (22 Aug – 19 Dec) and Season 8 (2 Jan – 22 May) gameweek calendars pre-created; final Saturdays exempt from doubling.
