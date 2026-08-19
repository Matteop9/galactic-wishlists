# Changelog — Milky Bay

## 0.3.0 — 2026-08-19

Emblem grammar: honours emblems redesigned from the shared design canvas (`JHH Acca/docs/Emblem Grammar.dc.html`).

- **Repetition retired** (`Honours.tsx`): one crown mark whose tier = seasons won and one spoon mark whose tier = last-place finishes, instead of a glyph per honour. Both lineages run the register sequence FLANK → BASE (chevrons; spoons point DOWN — demotion stripes) → CREST (rays / stink lines) → FRAME (ring; the spoon's breaks open at the base) → PLINTH (banner; the spoon's arrives torn). Tier 9+ = one more chevron per tier, unbounded. A 2-crown + half player went from 3 glyphs to 2; width worst case drops ~25%.
- **Designed halves**: half crown and half spoon are now a left-half-solid path + full outline at 55% opacity (per-mark `<defs>` gradients gone — also kills the duplicate-gradient-id risk when several halves rendered on one page).
- **The poo is drawn** (new `--color-poo #b1794f`): single evenodd path, eyes punched through the fill so the ground supplies the second tone; themeable, OS-consistent. The half state is a designed mark — **the Pat** (flattened, one eye) — replacing the emoji clipped via `overflow:hidden`. Same hover position (7px, absolute, top-0 inside the line box).
- **Sizing normalised**: all marks render at `height = size` (spoons no longer size+2), bottom-aligned, gap 0.3 × size. Crown path unchanged (same silhouette, recentred coordinates).

## 0.2.2 — 2026-08-19

- **Admin dropdown writes were no-ops**: the gameweek status, mini-league and
  feedback-status `<select>`s read `e.target.value` INSIDE the react-query
  `mutationFn`. By the time the mutation ran (a microtask later), React had
  re-rendered and snapped the controlled select back to its prop value, so the
  PATCH wrote the row's OLD value — a 200 that changed nothing (confirmed in
  the audit trail: every update had old = new). Fix: capture the value
  synchronously in the onChange handler before calling `mutate`. Rule going
  forward: never read from a React event object inside a deferred closure.

## 0.2.1 — 2026-08-19

- **💩 clipping fix**: names use `truncate` (overflow hidden), which cut off
  the poo floating above the text box. It now sits at `top-0` INSIDE the line
  box, resting on the letter's head with a slight overlap — verified fully
  inside the clip area with rows still 46px.
- **All Time includes history**: the score column folds in the recorded 24/25
  and 25/26 season totals (Harry 151.08 leads all-time); Win%, Avg and Miss
  stay picks-era (26/27 onwards) with a note saying so.
- **Custom range tab** on Standings: two date inputs → `leaderboard(range)`;
  26/27 onwards only (noted).
- **Gameweeks grouped**: "This season so far" (current + settled, newest
  first) above "Upcoming" (also descending).

## 0.2.0 — 2026-08-19

- **Season is 26/27** (renamed from 25/26 — the agreement doc was a year
  behind; dates unchanged).
- **First-class mini leagues** (migration `mb_0013`): `mini_leagues` table +
  `gameweeks.mini_league_id` + `mini_leaderboard(p_mini)` RPC. Admin creates
  mini leagues and assigns/unassigns gameweeks per row in Admin → Gameweeks;
  Standings → Mini tab shows the selected mini league's table. The agreement's
  "Jersey Weekend Mini League" is seeded with the first 6 gameweeks.
- **Past seasons imported** (`season_history`, user-supplied): full 24/25 and
  25/26 final tables shown in a new Standings → History tab. Honours updated:
  Tim gains the 25/26 crown (74.53), Luke the 25/26 spoon (62.12), and Sandy's
  22/23 spoon becomes a **half_wooden_spoon** (half season) — new award kind
  with a half-filled spoon emblem.
- **Admin-editable rules** (migration `mb_0014`): rules live in
  `rules_sections` (audited table — every edit records old/new wording, actor,
  IP, UA). Admin → Rules edits sections in place; the Rules page renders from
  the table, with History generated from honours + season_history.
- **Feedback queue** (migration `mb_0015`): submit from You → Feedback & ideas;
  admins triage (new/planned/done/dismissed) in Admin → Feedback. Audited.
- **💩 of shame**: players who have never won a season (no crown, no half
  crown — currently Sandy and Liam) get a tiny poo hovering over the first
  letter of their name, absolutely positioned so table rows don't grow.

## 0.1.1 — 2026-08-19

- **Full season calendar** (migration `mb_0012`): 34 gameweeks — the played
  Aug 15 opener plus every real Premier League 26/27 weekend (Sat 22 Aug 2026
  → Sat 29 May 2027), sourced from football-data.org. Eight blank weekends
  skipped (international breaks / FA Cup / winter break: 26 Sep, 3 Oct,
  14 Nov, 9 Jan, 13 Feb, 6 Mar, 27 Mar, 3 Apr). Season `end_date` extended to
  2027-05-31 — PL matchday 38 is Sun 30 May, later than the agreement's
  guessed 24 May. PL dates beyond ~matchday 9 are placeholder Saturdays; if a
  whole round ever moves weekends, adjust via Admin (create / skip).
- **Anyone can enter anyone's picks** (migration `mb_0011`, group decision):
  the own-picks-only policy is replaced — any linked member can enter/edit any
  member's picks while the window is open (admins any time). `submitted_by`
  still stamps who transcribed it, and the Enter Picks player picker now shows
  for everyone.

## 0.1.0 — 2026-08-19

First release. "Milky Bay": weekly two-acca tracker for the Milky Bay Betting
Syndicate (Harry, Luke, Tim, Sandy, Liam), built on The Acca's architecture.

**Infrastructure**
- Same Supabase project as The Acca, fully isolated in the `milkybay` Postgres
  schema (migrations `mb_0001`–`mb_0010`). PostgREST exposure via in-database
  config (`pgrst.db_schemas`).
- **Shared logins**: auth.users is project-scoped, so one account works in
  both apps (same `@players.jhh-acca.app` alias domain). New `link_player` RPC
  lets an existing Acca user claim their Milky Bay name with the group code.
- Shared-auth guard both ways: `admin_unlink_player` (both schemas — JHH
  migration `0022`) only deletes the auth user when the *other* app no longer
  references it.
- Window sweeper on pg_cron (`mb-gw-tick`, every 5 min): opens/closes entry
  windows, sweeps −1 no-pick rows for 48h after close.
- RLS: reads need a claimed player; picks are own-row while the window is
  open (admins any time — they transcribe from the chat); `result`/`void`/
  `locked` un-writable via the API; full audit trail with IP + UA.

**Rules engine (v_pick_scores)**
- Two picks per player per week: W acca (min 1.50) + Random acca (min 1.70,
  game + free-text bet-builder). Fractional odds accepted ("4/5" → 1.80,
  original kept for display).
- Win = decimal odds capped at 2.50. Sole loser of an acca = −1 × odds,
  uncapped (group-confirmed). No pick = −1 per missed acca. Voids score 0
  with no knock-ons and don't count toward the sole-loser test.
- A loss stays unscored until the whole acca settles (sole-loser is
  undecidable mid-settlement); wins/no-picks/voids score immediately.
- Mini league = the same leaderboard over the season's first 6 gameweeks.

**App**
- This Week (both acca cards + week points), Standings (Season / Mini League /
  All Time), Gameweeks + detail, player profiles with pick history, the
  Season 25/26 agreement as a Rules page, full Admin (gameweeks, settle
  W/L/PP/INV, accounts with both-apps warnings, adjustments, join code, audit).
- Honours: crown per season won, half-crown for the 22/23 half season, wooden
  spoon per last place — seeded history (22/23 Luke½/Sandy🥄, 23/24 Tim/Liam🥄,
  24/25 Harry/Luke🥄) shown next to names everywhere.
- Week 1 (Sat 15 Aug) seeded from the real results and validated against
  hand-computed scores: Tim 4.10 · Harry 3.36 · Sandy 1.72 · Liam 1.61 ·
  Luke 0.00 (migration `mb_0009` gate).
