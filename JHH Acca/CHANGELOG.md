# Changelog — The Acca (JHH Acca)

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
