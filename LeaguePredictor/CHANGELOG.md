# Changelog — Spot On

## v0.3.0 — 2026-08-24

- **Everyone's picks, side by side.** The grid page is now two tabbed views, and the new
  default finally answers "who did everyone go for?": rows are predicted positions, one
  column per player, each cell that player's team for the slot (crest + code, tinted by
  how close the call is right now). A ⚽ row shows everyone's top-scorer pick (lit up
  while it's the live leader), and each competition gets a one-line consensus — "Title
  calls" and "Spoon". The original v0.2.2 grid lives on the second tab ("vs the actual
  table").
- **Who to cheer for** (`/leagues/[id]/fixtures`): every fixture in the next 10 days,
  grouped by day in UK time, with your stake on each team (▲ n to climb / ▼ n to drop /
  ● spot on, from your prediction vs the live table) and a verdict per match — cheer
  for/against, "a draw suits you" when both need to drop, torn-with-a-lean when both
  need to climb, or happy either way. Post-lock, "The room" line shows which way every
  league member is pulling. In-play matches get a LIVE score badge. The logic is a pure
  module (`src/lib/rooting.ts`), unit-tested.
- New cached `getFixtures` (1 h TTL, 10-day window). Filtering is a deny-list of dead
  states plus a `score.winner` check, because football-data returns junk datetime
  strings as `status` for some competitions (the Championship does) — an allow-list
  silently blanked the whole ELC section.
- League page: the post-lock header now links both views ("Everyone's picks" + "Who to
  cheer for"), and the lock time renders in UK time regardless of server timezone.
- Dev tooling: `scripts/dev-session.mjs` mints a 1 h local session; `scripts/smoke.mjs`
  runs an authed smoke test over the four league pages against `next dev`.

## v0.2.4 — 2026-08-24

- **Fixed: every git push emailed a failed spot-on deploy.** The Vercel project was
  git-connected to the monorepo without a Root Directory, so any push (SkyDex, Milky
  Bay, anything) tried to build spot-on from the repo root and died in seconds on
  "Couldn't find any pages or app directory" — one error email per push, and prod was
  pinned to the last CLI deploy. Root Directory is now `LeaguePredictor`, and
  `vercel.json` gains an `ignoreCommand` so pushes that don't touch this folder skip
  the build entirely (no build, no email).
- **Deploys now ride `git push`** — which is what the phone-fix workflow needs. Note
  that with a Root Directory set, `vercel deploy --prod` from the subfolder no longer
  works (the CLI upload nests the folder twice); commit + push instead.
- This commit also lands v0.2.3 below into git — it had been deployed from a working
  tree on 17 Aug but never committed, so git-triggered deploys would have silently
  reverted the standings fix.

## v0.2.3 — 2026-08-17

- **Fixed: standings frozen after the season's first game** (Championship).
  football-data.org caches `/competitions/{id}/standings` separately from the
  `?season=` variant, and the bare copy went stale — it served the Championship's
  matchday-1 Friday result only (2 games played) while the season-pinned URL had
  the full table (22). `getStandings` now always pins the season, falling back to
  the bare URL only if that season 404s (pre-season gap). Competitions carry a
  `calendarYearSeason` flag so Brazil's Jan–Dec season resolves to the right year.

## v0.2.2 — 2026-08-14

- **The grid** (`/leagues/[id]/table`): post-lock view with the actual league table
  down the side and one column per player — each cell is where that player predicted
  the team to finish, coloured by distance (green spot-on, amber 1–4 off, red 5+).
  Sticky position/team columns, players who haven't submitted are omitted, and the
  page keeps the pre-lock secrecy rule. Linked from the league page header once
  predictions lock

## v0.2.1 — 2026-08-14

- **Editable deadline**: league creators can now move the prediction deadline from the
  league page (pre-lock only). New `updateDeadlineAction` server action guards
  creator-only + not-yet-locked, then updates `lockAt` via `updateDoc` on the league
  meta doc. The form resolves the `datetime-local` value to an instant in the
  browser's timezone client-side (the create-league form parses it in server TZ =
  UTC), and shows the current deadline in UK time
- One-off `scripts/set-deadline-1830.mjs`: sets a league's `lockAt` to 18:30
  Europe/London on its current deadline date, straight against the Blob store
  (needs `BLOB_READ_WRITE_TOKEN` from `vercel env pull`)

## v0.2.0 — 2026-08-07

Design system v2 integrated (ClaudeDesign/ — brand kit, share cards, and 5 new assets):

- **OG share cards** ported to `next/og` per the share-card spec: `/api/og/join/[code]`
  renders the league invite card (name, competition chip, avatar-initial stack, +n
  overflow) and `/api/og/default` the generic card; invite pages now render publicly
  with sign-in CTAs so WhatsApp/iMessage/Slack unfurls get the card instead of a
  redirect to the login page
- **Season states** on the league page: locked-but-not-kicked-off shows the countdown
  "waiting" illustration with links to everyone's picks (no more placeholder-data
  leaderboard); season complete crowns the winner with the inverted-podium illustration
- Hero floodlight background on the landing page, ambient 22px dot grid under app
  pages, "no leagues yet" illustration with the kit's copy
- Brand-kit corrections: wordmark is Archivo 800 uppercase with a hairspace,
  diff chips now go amber 1–4 and red 5+ (was 4+)

## v0.1.1 — 2026-08-07

Claude Design system integrated (from `Spot on design system.zip`):

- Palette swapped to the branded tokens: near-black `#0B0F12` bg, neutral surfaces,
  electric lime `#C6FA3F` primary/celebration colour, teal accent, and the semantic
  spot-on/close/way-off trio with dedicated chip backgrounds; light-theme tokens
  included behind `[data-theme="light"]` (no toggle yet)
- Type: Archivo (display) + IBM Plex Sans (UI) + IBM Plex Mono for every score,
  position and diff number
- Target-motif brand mark in the header and landing hero; SVG favicon + app icon
  replace the scaffold defaults

## v0.1.0 — 2026-08-07

First release, live at https://spot-on-liart.vercel.app

**The game** (digitised from the House Picks Excel): predict the complete final league
table before the season starts, plus a top scorer per competition. 1 point per position
off, per team; −5 per competition for calling the top scorer; lowest total wins.

- Accounts: username + password (bcrypt + JWT cookie), no email required
- Leagues: create with a per-league pick of competitions (9 domestic leagues from
  football-data.org free tier; PL + Championship pre-ticked) and a prediction deadline
- Invites: 6-char code / shareable `/join/[code]` link, with login-redirect preserved
- Prediction editor: drag-and-drop (dnd-kit) + ▲▼ nudge buttons, squad-sourced top
  scorer combobox with free-text fallback, explicit save + 3s debounce autosave
- Privacy: everyone's picks hidden until the deadline, then frozen and public
- Live leaderboard: joint ranks on ties, per-competition breakdown, picks-vs-actual
  detail pages with diff chips (● spot on / N off)
- Scoring engine: pure + unit-tested (Vitest, 14 tests), including a golden test that
  reproduces last season's Excel totals exactly (Will 197, Dom 211, Luke 218, Matteo 219)
- Storage: Vercel Blob private store, versioned-JSON-document pattern (writes create new
  timestamped blobs; reads resolve latest; old versions pruned)
- football-data.org calls cached in the store (standings 15 min, scorers 1 h, teams 7 d)
  — never called per page view, safe within the 10 req/min free tier
- DESIGN_BRIEF.md written for Claude Design (logo, palette, fonts, backgrounds, OG
  templates); app ships on a placeholder dark theme wired entirely through CSS variables
