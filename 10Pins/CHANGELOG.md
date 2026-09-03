# Changelog — 10 Pins

> **Release routine (from v0.3.0 on):** every release gets a version bump, an entry in `src/lib/changelog.ts` (what changed, for players) and an entry here headed `## v<version> — <date> — <what shipped>` (how it was built). `npm run check:release` runs as `prebuild`, so a build fails if the three disagree. See `CLAUDE.md` § Releasing.

## v0.4.0 — 2026-09-02 — The Scoresheet redesign — LIVE

The whole app moves from the dark "phosphor" handoff to **The Scoresheet** (`Design/DESIGN.md`): a light-first paper identity built from the bowling scoresheet. Ruled hairlines, boxed numerals, right-aligned totals, grease-pencil red for hot (strikes, high games, destructive) and ballpoint blue for steady (spares, averages, links). Oswald for every number and heading, Source Sans 3 for words. Radius 0 on strips and tables, 2px on inputs and segmented controls, 6px on chips and buttons, 16px on sheet corners. No glow, no shadows, no gradients, no emoji, no all-caps labels.

**Tokens.** `src/index.css` now defines the palette as CSS variables on `:root` (light) with dark overrides under `prefers-color-scheme: dark` and `[data-theme="dark"]`, and maps them into Tailwind with `@theme inline` while switching the default palette, radii, shadows and fonts off (`--color-*: initial` and friends), so a class outside the design system does not exist. Utilities: `strip`/`strip-soft`, `label`/`optional`, `field`, `btn-primary|secondary(-sm)`, `btn-danger-text`, `chip`/`chip-active`, `num`, `press`, `fade-in`, `rise-in`, `sheet-up`, `settle`, `progress-line`. Tabular numerals are set on `body`. Everything animated in the old system that looped or decorated (skeleton shimmer, live dot, scan sweep, stamp, glow pulses) is gone; skeletons are static card-toned blocks.

**Theme.** `src/lib/theme.ts` (`useTheme`, `THEME_OPTIONS`, `tenpins.theme`): light by default, dark follows the system, and Profile pins either. `index.html` applies the stored choice before first paint. Both `theme-color` metas are set per scheme; the PWA manifest and icons are redrawn in paper and ink (`public/icons/*`, generated with PIL from the frame-cell motif).

**Primitives.** `Strip.tsx` is the frame-grid box everything sits in (`Strip`, `StripHeader`, `StripRow`, `StripTitle`, `StatTile`, `StatCell`, `EmptyFrames`). `Scorecard` is rebuilt as one strip per player: header row (name, meta, total; `tone` colours the total) over a ten-frame grid with two ball cells top-right (three in the 10th) and the cumulative beneath; X red, / blue, pins ink, a miss is a dash. Live marks the frame at the line with `--card` and a 2px ink rule; editing shades unreconciled frames the same way. New: `PageHeader`, `Sheet`, `CountUp`, `AvatarStack`; `Icon` grows to a 40-glyph Lucide-style set. `ChipRow` renders chips or, with `fill`, a segmented control. `EmptyState` is the dashed strip with the actions inside it. `VerificationBadge` is plain faded text ("Scanned from photo", "Scored live", "Unverified"). `MobileTabBar` is the five-slot bar with the ink add disc, hides on scroll-down, and becomes a 220px left rail from 1024px; the add sheet lists the five entry routes in a strip.

**Reactions.** One reaction, "Nice one". `feed.ts` writes a fixed emoji value into the existing `reactions.emoji` column and counts every row (whatever emoji older rows carry) as a nice one; removing deletes all of yours on the event. `ReactionBar` is a single chip; feed footers read "3 nice ones · 2 comments".

**Screens.** Every feature screen was rewritten against `Design/IMPLEMENTATION.md`, behaviour untouched: feed (posts are strips with a footer line, two columns on tablet), game page, groups list and group page (the leaderboard is a ruled table with the own-row marker), stats (three tiles, the average graph, recent games), player page (head-to-head numerals), profile (settings list, theme row), sign-in, first run, friends, invites and claims, quick add (96px score entry), manual entry, scan capture (the one deliberately dark screen: a camera view), review, live setup/scorer/spectator/join, match day setup/live/leg entry, notifications, what's new, and the `/gallery` component sheet.

**Copy.** Sentence case everywhere, British English, no em dashes or exclamation marks in anything a player reads; "PERFECT GAME" and the share card's caps pills are gone. Banned phrases removed ("Nothing here yet", "takes ten seconds", "lands here").

**Left for later.** The feed query still returns no frames, so feed posts are header-only strips until `fetchFeed` selects `game_players.frames`. Leaderboard "last game" column (tablet) and a minimum-games rule are not modelled in the data, so they are not shown.

Verified: `npm run check:release` passes, `tsc --noEmit` clean, 280 tests green, the codebase-wide sweep for old tokens (`bg-panel`, `text-phosphor`, `rounded-card`, `label-caps`, `font-mono`, `uppercase`, glow and shadow classes) and for em dashes, exclamation marks, symbol glyphs and banned phrases in user-visible strings returns nothing. `/gallery` (now carrying the tab bar and rail) screenshotted at 390 wide in light and dark and at 1024 wide in light; the sign-in screen at 390. Screens behind sign-in with live data (live scorer, match day, scan) were converted against the same components and type-check, but were not screenshotted.

Deployed to https://10pins.vercel.app via `npm run deploy` (dpl_8V3BqwPjicZBTZ2amn7tKaB6aKn2).

## v0.3.0 — 2026-09-02 — What's new, in the app — LIVE

The app shipped eleven releases without ever telling anyone. This adds the player-facing half of the changelog, and a gate so the next one can't skip it.

**In the app.** `src/lib/changelog.ts` is the single list of releases — version, date, one-line title, two to five plain items — with `APP_VERSION` derived from its newest entry, so the version and the notes can't drift apart. Pure module in the shape of `feedFilter.ts`: no React, storage helpers take a `Storage | null` and swallow blocked-storage exceptions.

- **On the feed.** A dismissible card under the live/scan banners (both of those are jobs to do; a release note is something to read) and above the group filter, so it costs one card, once. It shows the newest unseen release, up to three items, and a count of anything older that's still unread.
- **The full history.** `/whats-new`: every release, newest first, dated, with the running version in the header. Opening it counts as reading the notes and marks the version seen, exactly as dismissing the card does.
- **Always reachable.** A "What's new" row on Profile carrying `v<version>` — the card is dismissible by design, so there has to be a way back, and this is the only place the running version is stated.
- **Seen-marking.** `tenpins.changelog.seen` holds the last version acknowledged. A brand-new account is marked seen the moment `FirstRun` creates the profile, so it never opens to a changelog for a release that predates it; a *missing* key therefore means "had the app before this page existed", and gets exactly the newest release rather than the whole back catalogue.
- No glow anywhere on either surface — a changelog is information, not a celebration, so it stays outside the amber budget apart from the one text link. Gallery section 18 renders the card from the live release list, so it reviews unauthenticated.

**The gate.** `scripts/check-release.mjs`, wired as `prebuild`, so it runs on `npm run build`, on `npm run deploy` (which builds) and on any Vercel build. It fails the build unless `package.json`'s version, the newest entry in `src/lib/changelog.ts` and the top `## ` heading of this file all name the same version, and it enforces the list's shape: `x.y.z` versions that descend strictly, ISO dates that never go forwards as you read down, a title and at least one item each, and no emoji or exclamation marks (the de-vibe rules from 2 Sept). `SKIP_RELEASE_CHECK=1` exists for a rebuild that genuinely isn't a release. The same invariants are asserted in `changelog.test.ts`, so a bad entry also fails the test run.

Versions below 0.3.0 in the in-app list were labelled retroactively; their dates are the real ship dates from the entries below. The five entries there cover milestone 8 through the 2 Sept feedback-queue triage — earlier milestones stay repo-only, as there were no users to tell.

Verified: `npm run check:release` passes, `tsc --noEmit` clean, 280 tests green, prod build clean; both surfaces screenshotted at 375px.

Deployed to https://10pins.vercel.app via `npm run deploy` (dpl_6oXaQXhZma3RKjFViUYUiGWAmG1P) — the live bundle carries the release list, the `tenpins.changelog.seen` key and 0.3.0.


## 2026-09-02 — Feedback queue triage: sign-in fix, the "vibe coded" pass, groups as a group of friends — LIVE

Three items landed in the in-app feedback queue on 2 Sept (all from the owner). This release closes all three.

### 1. "Currently taking me to localhost after sign in" — bug, done

Not app code: GoTrue only honours `redirectTo` when it matches the project's redirect allowlist and otherwise falls back to the **Site URL**, which was still the dev default (`vite.config.ts` pins the dev port to it for exactly that reason). Fixed in the Supabase dashboard by the owner (Site URL → `https://10pins.vercel.app`, wildcard redirect entries). The Acca and Milky Bay share the project but use no redirect flows, so nothing else moved. Code hardening shipped alongside: `SignIn` now redirects to origin + path + search (no stale hash), resets its "Opening Google…" state on `pageshow`/`visibilitychange` (review item 26), and the client uses the **PKCE flow** (review item 31) so a misdirected redirect fails loudly instead of handing tokens to another origin. Dead `VITE_DEMO_*` lines removed from `.env.local`.

### 2. "It all looks too vibe coded — the emojis, the colours, the text" — idea, done

Audited `src/` against the design handoff and the commonly cited tells. Verdict: palette (zero Tailwind palette classes, five on-token accents), typography and copy (zero exclamation marks, zero slop phrases, sentence case throughout) were already on-spec. What did hold, and what changed:
- **Emoji and glyphs as icons.** New `src/components/Icon.tsx` extends the four hand-drawn tab icons (same 24-viewBox / 1.8 stroke) with bell, comment, chevrons, arrows, x, plus, image. The 🔔 bell, 💬 comment count, 🏆 winner, and every ‹ › ↑ ↓ × ⌃ ⌄ glyph button are gone; match-day winners are stated in words. The four reaction emoji and the `✓ VERIFIED` motif are untouched by design. No icon library added — a second icon family next to the accepted tab icons would have been worse than eleven one-line paths.
- **Amber budget.** Rule now written into `index.css`: per screen, glow = one primary CTA ∪ verified stamp ∪ current frame ∪ celebration ∪ wordmark. De-glowed the live and offline-scan banners, leg pips, review dot, the scan sheet row (and deleted its "Fastest" pill), the done-screen card, the NOW BOWLING pill; the celebration toast lost its blur.
- **Tokens.** `--color-rule`, `--shadow-glow-amber-sm`, and a real radius scale (`--radius-cell/chip/control/card/sheet`) in `@theme`; `btn-primary`/`btn-secondary` utilities so 18 drifting CTAs share one definition; `live-dot` replaces stock `animate-pulse` and is covered by the reduced-motion block; `glow-amber-text`. Every off-token hex and the one invented gradient are gone (left deliberately: JoinQr's QR colours and the share card's inline colours the rasteriser needs).
- **Radii: 11 values → 5.** Cards are 12px everywhere; sheets 16; controls 10; chips 8; cells 4. `disabled:opacity-*` (19 sites) → token colours.
- **Copy trim** (11 lines): "Nice scan…", "say something nice (or not)", "nobody's bragging tonight", "The reader had a moment", "Were you the guest?" and friends replaced with plain statements; "{who} did something" → "New activity from {who}". 18 page titles are now real `<h1>`s. `label-caps` pulled off four non-label uses (kind tags, "N watching", "tap to carry on").

### 3. "Groups should be more like a group of friends…" — idea, done

- **Match day from the "+" sheet.** Fifth option, route `/matchday/new`: pick a group (preselected when you have one; hidden for anonymous visitors), then the existing setup. `match_days.group_id` stays NOT NULL — teams, handicaps and four RLS policies hang off the group.
- **Feed filter.** Chip row on Home — All plus one chip per group — filtering `feed_events.group_id` (already indexed). Choice persists in `localStorage` (`tenpins.feed.group`); a stale group id falls back to All once the group list has loaded, and the first fetch already uses the stored filter. No "Friends" chip: RLS doesn't say *why* an event is visible.
- **Leaderboard period + metric.** `tp_0018`: `group_leaderboard(gid, p_period default 'season')` — 'season' / '30d' / 'all', ranked by average with a parallel high-game ranking, movement still "vs a week ago" inside the chosen window. The old single-arg signature is dropped (return shape changed; two overloads would make PostgREST ambiguous). Group page gets Period and Rank-by segmented controls; season is now one period among three. Verified live as a member (all three periods, `BAD_PERIOD`, `NOT_A_MEMBER`, exactly one function in `pg_proc`).
- **Player page + head-to-head.** `tp_0019`: partial index on `game_players(profile_id)` and `head_to_head(other)` — a definer RPC that only ever sees games where the caller also holds a seat (so it exposes nothing `can_see_game` didn't already), returning W–L–T, both averages and the last ten meetings. New `/players/:id`: avatar, friend/group-mate context, Add friend / Accept, the record ("7–3 · 1 tie", "You've won 3 of the last 4"), meetings with scores and verification, and their stats over the games you can see. Probed live as the demo account vs @pinpal: RPC 4 games 2–1–1, identical to a hand count. **Player names are now tappable** on feed cards, leaderboard rows, members, game detail and Friends (guests stay plain; your own name goes to Profile); the feed card stops propagation on click and Enter so a name tap never also opens the game.
- Shared primitives: `ChipRow`, `Avatar` (three local copies removed), `PlayerLink`, `StatBits` (Tile/FormGraph out of Stats), `PlayerSkeleton`. Pure libs `feedFilter.ts`, `leaderboard.ts`, `players.ts` — 43 new tests. Gallery sections 12–17 (icons, banners, ChipRow, Avatar, player skeleton, head-to-head) so all of it reviews unauthenticated.

Verified: `tsc --noEmit` clean, 260 tests green, prod build clean; grep gates zero for emoji-in-chrome, glyph icons, off-token hex, stock Tailwind tells and off-scale radii. Built by six scoped Sonnet agents on disjoint file sets, reviewed and integrated by the lead.


## 2026-09-02 — Fix: anonymous-visitor hygiene + the last review leftovers — LIVE

The rest of the from-scratch review, closed out. Most of it is about what an anonymous demo visitor is allowed to be.

**`tp_0017_anon_hygiene.sql`** (applied to the Acca project's `tenpins` schema):
- **Anonymous visitors see only the people they bowl with.** `profiles_select` was `using (true)`, so a demo visitor — no Google account, no friction — could list every real user's name, handle and avatar. It now reads `not is_anonymous() or id = auth.uid() or can_tag(id)`: real accounts are unchanged (the Friends search needs the open read, and that is a product call in the review doc), anonymous ones see themselves and their group mates. Probed as a demo-group member with an `is_anonymous: true` claim: 3 of 4 profiles visible, the real account hidden; same member with a normal claim: all 4.
- **Anonymous visitors can't reach outside the demo.** No friend requests (each one was a notification to a real person with no rate limit), no groups, no match days, no feedback. All four INSERT policies gain `and not tenpins.is_anonymous()`, where the helper reads the `is_anonymous` JWT claim. Probed: friend request and group create as anonymous → `42501`; the same friend request with a real claim → allowed. Games, live sessions, comments and reactions in the demo group still work, because that is the demo.
- **Anonymous visitors expire.** `purge_anonymous_users(interval default '7 days')` runs nightly at 04:20 via pg_cron (`tp-purge-anon`). It is not a bare `delete from auth.users`: most FKs to `profiles` are deliberately NO ACTION, so that would fail the moment a visitor had entered a game. The function walks each visitor's footprint in dependency order — their comments, reactions, friendships, mappings and match-day seats go; **a seat in someone else's game becomes a guest seat** so the other players' card survives; then their games, sessions, group memberships and any groups they own; then the auth user, which cascades the profile and everything that cascades from it. Each visitor is its own sub-transaction, so one that won't delete is logged and skipped rather than blocking the rest. Execute is revoked from every client role. Dry run on the live database: 0 purged (there are no anonymous users yet — the setting is still off).
- `freeze_friendship_endpoints` now pins `search_path`, clearing the advisor warning tp_0015 introduced.

**Repo:** `!.env.example` added to `.gitignore` (the `.env.*` rule had swallowed the template, so the repo had none); the obsolete `interest-cohort` token dropped from the Permissions-Policy header; the live scorer no longer celebrates a turkey twice (the roll ladder already did, so the end-of-game moment filters it — scanned games keep it, they have no ladder); a stray scratchpad file with a mangled Windows path deleted from the project root.

Verified: `tsc --noEmit` clean, 217 tests green, prod build clean; policies, cron job and function grants confirmed by SQL on the live project as above.

Deployed to https://10pins.vercel.app via `npm run deploy` (dpl_26EbSUAkJXsopadyv1SYFLeBmCGm).

## 2026-09-02 — Fix: review follow-ups (demo button, share card, sign-out caches) — LIVE

A from-scratch review of milestone 8 against the live database and the deployed origin found five things worth fixing before anyone else did.

- **The demo button was dead in production.** "Anonymous sign-ins" is still off on the Supabase project (the auth settings endpoint reports `anonymous_users: false`, and there are zero anonymous users), yet `SignIn` defaulted the button to visible and only hid it after a failed tap — so every visitor saw a button that errored the first time they pressed it. It now starts hidden and asks GoTrue’s public `/auth/v1/settings` endpoint whether anonymous sign-ins are enabled, appearing only on a yes. The moment the setting is switched on in the dashboard the button shows up, with no redeploy. ⚠️ Until then there is deliberately no demo.
- **The share card could brag about the wrong player.** `feed_events.highlights` is the union across every bowler in a live game, and the card passed it straight through — so Dave’s card could carry Matt’s NEW PB pill. Game detail now pins the feed highlights to the card only when the winner is the only profile player on the sheet; the live scorer’s card uses the per-profile split that `finishLiveGame` already returns, so it is exact.
- **The unverified stinger said something false every time it appeared.** "totals only, unverified" — but the card is only offered for frame-scored games, so a totals-only card can never exist. Now "scored frame by frame, unverified".
- **Sign-out left the previous account behind.** The service worker’s `supabase-rest` cache keys on URL and ignores the Authorization header, and react-query’s `['feed']` key has no user in it — so on a shared device the next account could be served the last one’s rows when offline or on a slow connection. `SIGNED_OUT` now clears the query cache and deletes the REST cache.
- **A failed font embed was cached for the whole session.** One rejected `getFontEmbedCSS` became a permanent empty string, so every later card rendered in fallback faces. A failure is now retried on the next card; only a success is cached.

Left as documented rather than fixed: anonymous-user cleanup (no pg_cron job yet; `profiles.id` cascades from `auth.users`, so a weekly delete of anonymous users older than seven days is the shape), a `search_path` on `freeze_friendship_endpoints`, `.env.example` being swallowed by the `.env.*` ignore rule, and the obsolete `interest-cohort` token in the Permissions-Policy header.

Verified: `tsc --noEmit` clean, 217 unit tests green (the stinger test updated), prod build clean. On the deployed origin: the new bundle contains the settings probe, the new stinger string and the cache deletion, and the old stinger string is gone.

Deployed to https://10pins.vercel.app via `npm run deploy` (dpl_5UADMoQCpf5hehKLWHYTNqL7Ze4N).

## 2026-09-02 — Milestone 8: celebrations, share card, PWA — and the security debt — LIVE

The last milestone in the build spec (§11: "Polish: celebrations, share card, skeletons/empty states, PWA manifest/SW, copy pass"), with the still-live items from the project's own review doc folded in. **10 Pins is now feature-complete against the spec.**

### The security debt, because it was real

Today's delete-game bug turned out to be **item 4 of `COUNCIL_REVIEW_TODO.md`, written in July** — it sat there until a user reported it. So the rest of that list was re-checked against the *current* schema rather than trusted. Three items were still live, and they are fixed here:

- **`tp_0015` — anyone could poison anyone's stats (CRITICAL).** `game_players_insert` checked only `owns_game()`, never `profile_id`, and `profiles_select` is `using (true)` — so any signed-in user, the public demo account included, could list every profile, create a game and insert rows carrying someone else's id. **Measured before the fix: one insert by an unrelated account moved the victim's average from 181.0 to 150.8.** Now both INSERT *and* UPDATE (hardening one alone leaves the other open) require the target to be you, a guest, an accepted friend, or a group mate — `tenpins.can_tag()`. The check is on the relationship rather than the game's group, because a live session or match day can legitimately have no group at all. Probed after: stranger insert and stranger update both rejected `42501`, while self, guest, group mate and a real four-player live line-up all still write.
- **`tp_0016` — the demo shipped working credentials.** "Try the demo" signed in with `VITE_DEMO_EMAIL`/`PASSWORD`, and `VITE_` vars are inlined into the deployed bundle. It now uses anonymous sign-in plus a `join_demo()` RPC that gives each visitor a profile and a seat in the demo group, so the app isn't empty. **The demo email went from 1 occurrence in `dist/` to 0.** ⚠️ **Needs "Anonymous sign-ins" enabled on the Supabase project** — until then the button hides itself rather than failing.
- **`tp_0015` — a friendship could be re-pointed.** `friendships_update` restricted the row but not the columns, so the addressee could rewrite `requester` and forge an accepted friendship (and the feed visibility that comes with it). Frozen by trigger.

Also: **the project is now in git** (110 files, secret-scanned first) — it had never been committed, so there was no rollback point for the whole codebase, which is not where you want to be while shipping a service worker. Plus a React `ErrorBoundary` (which caught a real crash within minutes of being added), scorecard rows keyed by seat rather than name (a monitor photo can return two players called MATT), and `env(safe-area-inset-bottom)` on the tab bar — `viewport-fit=cover` has been set all along, so it sat under the iPhone home indicator.

### Celebrations

An escalating ladder — strike → double → turkey → four-bagger → PB / club / perfect game — capped at 1200ms and always skippable. The decisions are pure (`src/lib/celebrate.ts`, 24 tests): the loudest tier wins, so a 300 game is **one** moment rather than five stacked toasts, and a quieter celebration can never interrupt a louder one.

"Never blocks scoring" is structural rather than a promise: **a per-roll celebration never rises above tier 2**, and tier 2 is a `pointer-events-none` strip at the *top* of the screen — the keypad is at the bottom. Tier 3 is a full-screen moment and can only fire at the end of a game, where the keypad is already unmounted. Under reduced motion it downgrades to a static pill, because killing the animation on a full-screen overlay leaves a scrim that blinks in and out — worse than no celebration.

Spares deliberately don't celebrate: they are a third of all frames, and celebrating them would turn the ladder into wallpaper and spend the amber that §12 reserves for earned states. There is no sweep on the banner either — the signature motif is allowed in exactly five places and this is not one of them.

Fired from three places: per roll in the live scorer (before any network work, so it lands at keypad speed; an undo clears it), at end of game from `finishLiveGame`'s new per-profile highlight map, and on the scan success screen 360ms after the verified stamp lands. **Game detail now shows the highlights a game earned at all** — it never read them before.

### Share card

A branded 1080×1350 render: wordmark, group, winner and score in phosphor, highlight pills, the full scorecard, the frozen sweep line and the verification stamp.

Rendered from the app's **own components** (`html-to-image`, dynamically imported so its ~40KB never touches the initial bundle) rather than hand-drawn on a canvas — the card *is* the scorecard at a larger size, and a hand-drawn grid would fork the one component every other screen uses and then drift from it. `src/lib/shareCopy.ts` is pure and tested (12 cases): winner selection, ties preferring you, margin phrasing, and the rule that **an unverified score never brags**.

Three things the build turned up: `index.html` loaded the Google Fonts stylesheet **without `crossorigin`**, so script could not read its `@font-face` rules and the card would have silently rasterised in fallback faces (proved fixed by an A/B — 92,389 lit pixels with fonts embedded vs 80,652 without); the rasteriser **hangs forever if the page stops painting**, so tapping Share and switching apps never returned — now it times out and the sheet offers a retry; and the sheet renders the PNG *before* the share tap and previews the actual raster, because Safari drops the user activation across an `await` and because you should see what you are about to send.

### Empty states, QR codes, PWA, copy

- **`EmptyState`** with three tones — page, inline, quiet — because flattening them would make quiet corners shout. Nine screens converted, and the ones with an obvious next move now offer the **control** rather than describing it (Home told you to "tap ＋" without giving you anything to press). Plus the state the design asks for and never had: a **just-created group** shows the invite instead of an empty leaderboard.
- **QR codes** on the group invite and the live share panel — dark-on-light inside a white plate, because a QR in phosphor on ink looks on-brand and scans badly.
- **PWA:** manifest, five icons **generated from the real wordmark** (the boxed amber `10`, drawn with the actual Oxanium glyphs), and a service worker with `registerType: 'prompt'` — **never `autoUpdate`**, because an automatic reload mid-game would take the live scorer's in-memory undo history with it.
  - Caching is an **allowlist by pathname**, deliberately: fonts cache hard, `/rest/v1/` is network-first, and everything else on Supabase is structurally uncacheable — a replayed `/auth/v1/` token refresh means a broken session, a cached `/functions/v1/` scan result would be a disaster, and a cached signed storage URL is a dead link. Verified on prod: **zero Supabase responses in any cache.**
  - ⚠️ `vercel.json`'s SPA rewrite would have swallowed `/sw.js` and `/manifest.webmanifest`, serving HTML with a 200 and failing registration with a confusing MIME error. It now excludes anything with a file extension — safe because no route parameter can contain a dot (codes are hex, ids are UUIDs). Security headers added in the same file.
- **Copy pass:** `Post` → `Post comment`, `Done` → `Save frame`, the route name "Game detail" replaced with "The game", the lowercase `delete` link sentence-cased, and typographic apostrophes normalised across 55 files (safe because letter-apostrophe-letter cannot occur in code — it would be a syntax error inside single quotes).
- **`deleteGame` now removes the photo from storage too** — found while checking the bucket after the prod regression test. The FK cascade takes the DB rows, but nothing in Postgres knows about the bucket, so every deleted scan was leaving its photo behind forever.

### Verified

217 unit tests green (36 new), `tsc --noEmit` and the production build clean. On prod after deploying: `/manifest.webmanifest` serves as `application/manifest+json` (not the HTML shell), the service worker is **active** with the precache populated, all four security headers present, deep links still resolve to the app, and no Supabase response is cached. A full scan end-to-end from the deployed origin — which is the path `tp_0015` was most likely to break, since it writes `game_players` rows for other people — read both players frame-perfect, resolved them with zero taps from the remembered name mapping, and saved `verified` with 20 frame rows.

Deployed to https://10pins.vercel.app via `npm run deploy` (dpl_AiYq1RBWUnrWpKJuZU7emWJ4s8ra).

**Still open:** the query-error / empty-data conflation (review item 12's other half), and 16 lower-priority items on that list. The verified-drop warning is implemented where an edit can actually cost a badge today — the scan review screen; the saved-game version arrives with post-hoc frame editing, which does not exist yet.

## 2026-09-02 — Milestone 7: the capture pipeline — LIVE

**Photograph the lane monitor and the game scores itself.** The hero flow the whole app was designed around (spec §6, design §5.3) is in: camera → processing → review → confirmed, plus the offline path, the error states and verification.

**`extract-scorecard` Edge Function** (deployed to the Acca project, `verify_jwt` on). It authenticates the caller, checks the daily cap, downloads the photo with the service role, asks the vision model for strict JSON, normalises the roll notation to what `frames` stores, logs the call, and returns. That is all it does — **it deliberately does not score or reconcile**, even though spec §6.3 puts `badFrames` in the response, because that would mean a second copy of the scoring engine bundled into Deno, and two engines that can disagree is the one bug this app can't afford. The client computes amber frames and verification from the extraction with the same `reconciles()` that scores live and manual games.
- **No new secret to manage:** the model key is the `OPENROUTER_API_KEY` already in this project's Vault (The Acca's), read per call through the service-role-only `public.get_secret`. The key never touches the repo or the client.
- **Model is swappable without a redeploy** — `tenpins.vision_config` holds the model id, max tokens and the daily cap (`anthropic/claude-sonnet-5`, 4000, 30/day). Measured cost is **~$0.009 a scan**, logged per call with tokens in `scan_events`.

**Migration `tp_0014_capture.sql`:** private `scorecards` storage bucket (8 MB, images only) with owner-folder insert/select/delete policies — nobody can read anyone else's photo, and the function reads with the service role; `scan_events` (service-role writes, read-your-own, so the cap can't be dodged by deleting history) + the `scans_today` definer helper; `vision_config` (service-role only).

**The flow.**
- **Camera** — corner brackets, "Fill the frame with the scoreboard", "Wait for the score grid, not the adverts", shutter and gallery fallback. Photos are capped at 1600px and re-encoded before upload.
- **Processing** — the signature motif finally gets its home: the amber scan line sweeping the pinned photo on the 1600ms loop, with the reader's actual order of work as the status line. New `scan-line` and `stamp-in` utilities, both in the one `prefers-reduced-motion` block.
- **Review** — photo pinned and collapsible above the extracted card; player chips mapping monitor names to profiles or guests; **amber frames are the only friction**. Tapping one opens a spot editor (`SpotFrameEditor`) that asks the engine which keys are legal rather than re-deriving the rules, and every later total re-derives as you type. A clean card collapses to "Looks right? · Everything adds up" and one tap. `Scorecard` gained an optional `onFrameTap` so the same card component does photo review, per design §6.1.
- **Name matching** — remembered mapping for the group wins, then exact name, first name, initials; **it refuses to guess between two people with the same first name** (a wrong confident guess costs more than an unmatched chip). Corrections are written to `name_mappings` and applied on the next scan.
- **Confirm** — writes `entry_type: 'photo'`, the photo path, the raw extraction (so verification can be re-derived later) and the derived status, then the feed event with highlights. **Verification (spec §7):** `verified` only when every printed total the model could read recomputes exactly; still amber, or nothing readable to check against, is `unverified`. A card that isn't a finished game saves as `in_progress` and stays out of averages.
- **Offline is a queue, not a failure** — the photo goes to IndexedDB with everything needed to finish, and the shell drains the queue on mount, on `online` and on focus. A processed scan waits at "ready" (a scan still needs a human before it lands on the board), surfaced as an amber banner on Home and a queue list on Profile with retry and discard.
- **Errors** — unreadable / cap reached / reader down / photo missing each get the design's plain explanation and one recovery action; the cap screen correctly offers no "take it again".
- **Abandoned photos clean themselves up.** Retake, Back, "Not now" and queue-discard all delete the upload — found while checking the bucket mid-build, when six orphans had accumulated.

**Also fixed: the scorecard was shaving 3-digit totals.** A 3-digit total is 23px of mono at 11px and the frame cell is 22px at 375px wide, so every score over 99 was clipped a pixel — visible on every screen, and unacceptable on the one screen whose whole job is proving the numbers match the monitor. Totals now render at 10px (16.5px in a 22.3px cell, measured).

Verified end to end against live Supabase, at mobile width, with real model calls: a synthetic monitor rendered from the app's own engine read back **frame-perfect** (MATT 174 / DAVE 154, every roll and every running total); a deliberately misread roll (monitor printing "7 1" where the game was "8 –") turned 7 frames amber, the spot editor fixed it in two taps, the card recomputed to "Everything adds up", and the game saved as `verified` with 10 frame rows and 5/2/3 strikes/spares/opens; a second scan resolved **both** players with zero taps (one from the remembered correction, one by first name); a non-scorecard photo produced the unreadable screen; the cap (temporarily set to the used count, then restored to 30) produced the cap screen; and the offline path queued a scan, drained it on `online` without visiting Profile, and resumed it from IndexedDB into review. 181 unit tests green (25 new for `capture` and the queue), `tsc --noEmit` clean, prod build clean, Supabase security advisor showing nothing new beyond the intentional "`vision_config` has RLS enabled but no policies".

Deployed to https://10pins.vercel.app via `npm run deploy` (dpl_31WEoMJpQENd87CYmH8hJFV8aiWp) and smoke-tested on prod: a full scan from the deployed origin reached the function, came back clean and reviewable, and discarding it removed the photo (0 orphans in the bucket afterwards).

**Left for later, deliberately:** attaching a photo to an existing live/manual game to upgrade it to `verified` (spec §7's other half — the capture flow itself is the milestone), and the group picker not remembering the last group you scanned into.

## 2026-09-02 — Fix: "Delete game" did nothing (feedback #1) — LIVE

**The first item in the feedback queue was real.** Deleting a game raised `23503 feed_events_game_id_fkey` every single time, because `feed_events.game_id` was created with the default `NO ACTION` referential action — and every normally-entered game has a feed event, so *no* game was ever deletable. `game_players` (and `frames` beneath it) already cascaded; the feed event alone held the row. The client then swallowed the thrown error — the delete mutation had no `onError` — so the confirm row simply sat there and the button looked dead.

**Two halves to the fix.**
- **`tp_0012_delete_game_cascade.sql`** — `feed_events.game_id` is now `on delete cascade`. Cascading is right rather than nulling the column: a feed event with no game is not a post anyone can open, and comments / reactions / notifications already cascade from `feed_events`, so the whole conversation goes with the game it was about. Referential actions run as the table owner, so this needs no delete policy on `feed_events` — the client still cannot delete someone else's feed event directly.
- **The dead button can't happen again** — `GameDetail` now renders "That didn't delete — check your signal and try again." on `remove.isError`, and the same for the comment `delete` link, which was silently swallowing failures too. Every other write path in the app already surfaced its errors; these two were the exceptions.

**Also found while diagnosing:** `sessions` and `groups` had **no DELETE policy at all**, so every best-effort rollback in the client (`createGroup`, `createLiveSession`, `createMatchDay`, the games insert helpers) was deleting 0 rows and leaving an orphan row behind after a failed create. **`tp_0013_rollback_delete_policies.sql`** adds owner-scoped (`created_by = auth.uid()`) delete policies to both. No UI exposes either as a button, and the non-cascading child FKs (`feed_events` / `guest_claims` / `match_days` / `sessions` → `groups`) still guard a group that has actually been used.

Verified end to end in the browser against live Supabase: probed the constraint in SQL first (`BLOCKED: 23503` before, `SUCCESS` with zero children left after, both rolled back), then quick-added a game, reacted to it and commented on it, deleted it — landed back on Home, the card was gone from the feed, and the game, its player row, its feed event, the comment, the reaction and the notification were all gone from the database with no orphans anywhere. Then simulated a failing DELETE by patching `window.fetch` and confirmed the new error line renders in signal red instead of nothing. Both test games removed afterwards. 156 unit tests green, `tsc --noEmit` clean.

Deployed to https://10pins.vercel.app via `npm run deploy` (dpl_CYqcqmcrH4R4XvB8kRAhEfRX2Xby) — this deploy also carried the skeletons + motion pass, which had been built but never shipped. Prod smoke test on the demo account: quick-added a game, deleted it, landed back on Home, and the game plus its feed event were gone from the database. Feedback item marked **Done** with a note back to the author.

## 2026-09-02 — Skeletons + motion pass (milestone 8, part 1) — LIVE

Spec §8 asked for skeleton states and the handoff already defined the motion values; both are now real. Every one of the 20 `isPending` branches was a centred grey "Loading…" line — all replaced.

**Foundation.** `src/index.css` gains `skeleton` (well-grey with a faint glass sweep on the same 1600ms loop as the capture scan line — never amber, §12), `refetch-line`, `rise-in`, `fade-in` / `fade-in-base`, `sheet-up` and `press`, plus one `prefers-reduced-motion` block that kills every animation and the press transform (verified in the compiled CSS). `src/components/Skeleton.tsx` holds the primitives (`Bar`, `Circle`, `Panel`, `SkeletonScreen`, `RefetchLine`) and the per-screen skeletons; each mirrors its real layout box-for-box so nothing jumps when data lands, and the grey furniture is `aria-hidden` behind one `role="status"` live region with an sr-only label ("Loading your stats"). Nested cases take `bare` so a screen reader never hears two loading messages.

**Timing, so skeletons never flash.** `src/lib/skeleton.ts` is a pure `skeletonStep(pending, state, now)` — show only after 140ms of waiting, then hold for at least 300ms — with `useSkeleton` in `src/lib/useSkeleton.ts` as a thin timer wrapper. 7 new unit tests (no DOM needed, matching how everything else here is tested). A warm cache renders nothing for those 140ms rather than a strobe.

**Screens.** Feed (cards with mono score blocks), Stats (tiles, form graph, dashed frame-level well, venue rows), group leaderboard, group page + settings, groups list, friends, notifications, game detail and leg entry (ten frame boxes per player), match day (series pips + legs), join previews (`/join/:code`, `/live/join/:code`), live scorer + spectator (NOW BOWLING panel over the card), and the Profile feedback list. Where content is already on screen and only refetching, the content stays and a hairline glass line appears instead (Home, Notifications).

**Motion.** Boot Splash fades in at 240ms; each route cross-fades at 120ms (keyed on the path, tab bar outside so it never flickers); feed cards, leaderboard rows, group cards, notification rows and queue rows fade + rise 8px on a 40ms stagger capped at 6; the Add sheet rises 12px with a fading backdrop; every navigating card and row gets the 80ms 0.98 press. The existing `settle` flash stays the way changed numbers announce themselves — no count-ups. Celebrations stay parked for milestone 8 proper, where capture and verified states can drive the escalation ladder.

**Gallery section 08** now renders every skeleton side by side at `/gallery`, so the states are reviewable without throttling anything.

Verified in the browser with Supabase reads throttled to 2.5s: Stats, Groups and the group page each showed the right skeleton with the heading held in place, then the real rows landed in the same boxes (staggered rise caught mid-flight in a screenshot), one live region per screen, no console errors. 156 unit tests green, `tsc --noEmit` clean, prod build clean.

## 2026-09-02 — Feedback queue on Profile — LIVE

**Profile now has a Feedback section.** Pick a kind (Bug / Idea / Other), write it, send — and the item stays on your Profile with a status pill you can watch move: **New → Planned → Done → Parked**. An admin note comes back under the item, so a request and what happened to it live in one place instead of in a chat thread. Authors can withdraw an item while it's still `New`.

**Triage lives on the same page.** An app admin also sees a collapsible "Queue · everyone" (with an amber "N new" count) — every item with its author, the four status buttons, a note-back field and delete. `src/features/settings/FeedbackSection.tsx` + `src/lib/feedback.ts`; no new route, no new tab.

**Migration `tp_0011_feedback.sql`** (applied to the Acca project's `tenpins` schema):
- `app_admins` — app-level admin, distinct from group admin. RLS on with **no policies for `authenticated`** and all privileges revoked, so admin cannot be granted from the client; membership is service-role only. Grant with `insert into tenpins.app_admins (profile_id) values ('<uuid>');` — `matteo` is currently the only row.
- `is_app_admin()` — security-definer helper, `execute` revoked from anon/public, so policies (and the client's `is_app_admin` rpc) read admin status without any table access to `app_admins`.
- `feedback` — kind/message/status/admin_note, `message` checked non-blank and ≤2000 chars, `updated_at` touched by trigger. Column-level grants split the writes: authors may insert `(profile_id, kind, message)` only, and `authenticated` may update only `(status, admin_note)` — so **nobody, admin included, can rewrite what someone actually said**. Reads are your own rows or everything for an admin; delete is your own untriaged item, or anything for an admin.

Verified in the browser against live Supabase (demo account, temporarily made an app admin for the test, then revoked): submit → `NEW` pill + queue count, set `Planned` → both views update, note saved → appears under the author's item, Withdraw correctly disappears once triaged. RLS probed in SQL as a non-admin player: sees 0 rows of someone else's feedback, `update` touches 0 rows, spoofed insert as another profile rejected by policy, self-promotion to `app_admins` rejected by grants, blank message rejected by constraint, own insert accepted and visible. Test rows deleted afterwards. 149 unit tests still green; `tsc --noEmit` clean. Supabase security advisor reports nothing new beyond the intentional INFO "`app_admins` has RLS enabled but no policies".

Deployed to https://10pins.vercel.app via `npm run deploy` (dpl_6k43bjvoyEGKdaN9zq6zDibwDP7N). Prod smoke test on the demo account: the Feedback section renders and, with @testbowler no longer an app admin, the "Queue · everyone" block is correctly absent — admin gating holds in production.

## 2026-09-01 — Milestone 6: live session (Realtime scorer + spectator) — LIVE

Deployed to https://10pins.vercel.app via `npm run deploy` (local prebuilt upload, as always). Smoke-tested on prod: deep-linked `/live/new` renders, Supabase env baked correctly, `live_started` notifications render with the new copy, and a real session on the deployed origin reported **Synced** — the Realtime channel subscribes fine from `10pins.vercel.app`.

**Score live is real.** ＋ → *Score live* opens session setup (venue, optional group, line-up in bowling order from group members, friends and guests, reorderable), then hands one phone the game.

**Scorer.** Full multi-player scorecard with the current frame outlined amber, NOW BOWLING pill, current-bowler strip, always-visible Undo and the context-aware keypad. Turn order rotates automatically: everyone bowls frame N in seat order, a bowler mid-frame stays at the line until it resolves, finished players are skipped (`nextUp` in `src/lib/liveState.ts`). Recording dot, "N watching" (Realtime presence) and a Share panel with the join code and share link.

**Spectator.** `/live/:id/watch` — read-only, arm's-length type: a big NOW BOWLING panel with the live total, the scorecard, standings, SYNCED/Reconnecting chip and the join code. `/live/join/:code` previews who is bowling (host, venue, group, line-up) before you commit, via the definer RPC `live_session_preview`; joining goes through `join_live_session`, which is the only way a `session_viewers` row can appear.

**Transport (spec §8).** Broadcast on `live:{sessionId}` carries roll events at keypad speed; `frames` stays the durable record, refetched on every (re)subscribe plus a 20s spectator poll, so a spectator can never drift. No Postgres replication config needed.

**Offline is normal, not failure.** Every tap scores locally → mirrors the whole game to `localStorage` (`live-session:{sessionId}`) → queues a frame upsert → broadcasts. Losing signal shows "Offline — scoring locally (N to sync)" and scoring carries on; the queue drains on reconnect, on the `online` event and on a 15s retry, one row at a time so partial progress is kept. Relaunching mid-game resumes from the snapshot — the local copy wins when it belongs to the same game, because this device is the only writer. Home shows a "Your game is still going · Resume" banner for the scorer and "X is bowling live · Watch" for everyone else.

**End of game.** Once every player is complete the game saves itself: final scores + strikes/spares/opens cached, all cumulatives rewritten (bonus balls settle earlier frames), game marked complete, feed event posted with highlights. Then LIVE-SCORED final card → "Next game — same players" (clones the line-up at game_number + 1) or "End session" (an in-progress game is abandoned, not deleted — kept for the session, excluded from averages).

**Migration `tp_0010_live_sessions.sql`:** `sessions.join_code`, `session_viewers` (+ `is_session_viewer` helper, viewer branches in `sessions_select` and `can_see_game` so visibility cascades to game_players/frames), the two join RPCs, and a `live_started` notification trigger that fires on the first live game of a session (not on the session row — match days open 'active' sessions too) and tells the group.

Two bugs caught by browser testing and fixed: (1) "Next game" instantly finished the fresh game — the auto-finish effect read the previous game's completed state during the re-hydration window, now gated on the loaded game matching the hydrated one; (2) the localStorage snapshot kept a stale pending queue after a successful drain, so a reload re-flushed writes that had already landed.

Verified end-to-end against live Supabase in two browser tabs: setup → rotation → per-roll frame writes → undo (propagated to the DB) → simulated offline (REST rejected: scoring continued, queue held, drained on reconnect) → relaunch mid-game with 2 unflushed rolls (resumed and caught up) → auto-finish (300/290 cached, TURKEY highlight, LIVE-SCORED in the feed) → next game → spectator join by code, live broadcast under ~300ms, presence count → end session (game abandoned, session event written). 149 unit tests green (29 new for `liveState`), engine coverage still 100%.

## 2026-09-01 — Milestone 5: groups, friends, feed, Match Days, notifications (+ database move)

**Database moved into the JHH Acca Supabase project.** The standalone `10pins` project (txqtdogymumvfvdoksow) was auto-paused and could not be restored (free tier allows 2 active projects; skydex + The Acca hold both slots). 10 Pins now lives in the **`tenpins` schema of the Acca project** (`zcincgkhsocirtyxbvnw`, eu-west-1) — the Milky Bay pattern: full isolation in one schema, shared auth (`auth.users` is project-scoped, so Acca/Milky Bay/10 Pins accounts coexist), PostgREST exposure via the in-database `pgrst.db_schemas` role setting (now `public, graphql_public, milkybay, tenpins` — if "Exposed schemas" is ever edited in the dashboard, `alter role authenticator reset pgrst.db_schemas` first). Old migrations were replaced by the `tp_00xx` set; the client pins `db: { schema: 'tenpins' }`; only demo/test data existed, recreated fresh. Demo + e2e accounts recreated (`matteo+10pinstest/…2/…3@continuum.je`).

**Groups (5a):** create groups, join via invite code, `/join/:code` landing with pre-join preview RPC (name, avatars, top-3), group page with season-scoped leaderboard (avg/high/games + 7-day movement computed on the fly — no snapshot table), verified-only toggle, admin settings (season name/dates, handicap basis/pct), member management.

**Feed (5b):** Home is now the real feed — group games and friends' games, highlight pills, reactions (🔥👏💀🎳, optimistic toggle) and comment threads (on game detail, ≤500 chars server-enforced). Game saves can attach to a group (picker on quick add + manual entry) which routes them to the group feed and leaderboard. Two RLS gaps found by cross-account testing and fixed: friends could see a feed event but not the game/session under it (tp_0006/tp_0007 extend `can_see_game` + `sessions_select` with the friends branch).

**Friends + guest claims (5c):** username/display-name search, request/accept/unfriend; guest claim links created from the group page — the one-use `/claim/:code` flow transfers every matching guest game (and match-day seat), joins the claimer to the group, and returns the claimed games for the confirmation screen.

**Match Days (5d/5e) — the new headline feature:** organiser splits the group (members + guests) into 2+ teams for a day, picks best-of-1/3/5 and a scoring mode: **total pins** (team totals incl. handicap) or **points** (head-to-head pairings by order + a team-total point per team pair, round-robin for 3+ teams, ties split ½). **Handicaps auto-calculate** as pct% of (basis − average) (defaults 90%/200, editable per group, snapshotted onto the match day, per-player override at setup). Legs are scored **frame-by-frame** (full engine + FrameEditor per player, player-switcher chips) or via a totals fallback; one game row holds every player's line. All series state (leg winners, legs won, clinch/drawn detection) is **derived client-side** from stored games by pure, unit-tested functions (`src/lib/matchday.ts`, 15 tests; `handicap.ts`, 6 tests) — nothing cached. Live view shows the series pips, per-leg scratch/+HCP breakdowns and pairing points; organiser finishes the day. Leg = `games.game_number` within the match day's session, so every leg game also feeds stats and the feed.

**Notifications (5f):** in-app bell (Home header, unread badge, 30s/focus refetch) + notifications screen with mark-all-read. Rows are written **only by Postgres triggers** (no insert policy — unspoofable): comments/reactions → game creator + tagged players (never the actor), friend request/accept, added-to-match-day, match-day result to all member players.

Verified end-to-end in the browser across three accounts: invite→join, cross-account feed + reactions + comments (incl. 501-char and spoofed-insert rejections), friend visibility, guest claim (single-use enforced), a full best-of-3 match day (frame-by-frame 300s + totals legs, handicap-flipped leg, clinch, finish), and all six notification types to the right recipients. 120 unit tests green, engine coverage still 100%.

Google sign-in now needs the provider enabled on the **Acca** Supabase project (plus `http://localhost:3000` and `https://10pins.vercel.app` in its auth redirect allowlist) — the old project's setup no longer applies.

## 2026-07-10 — Demo deployment to Vercel

- LIVE at https://10pins.vercel.app (Vercel project `matteop9s-projects/10pins`, deployed via CLI from the local folder, same pattern as LMS).
- "Try the demo" button on the sign-in screen: enabled only when the build sets `VITE_DEMO_LOGIN=1`; signs into the throwaway demo account (@testbowler with the milestone-4 test games). Demo credentials live in `.env.local`, not in source (repo remote is public) — they are necessarily visible in the deployed bundle, which is acceptable: they only guard the demo account and RLS isolates everything else.
- `vercel.json` SPA rewrite so deep links (`/stats`, `/games/:id`, `/gallery`) serve the app shell.
- **Deploy path is local-build + prebuilt upload** (`npm run deploy`). Reason: the Vercel project/team policy forces CLI-added env vars to "Sensitive" (runtime-only); a remote build then sees empty strings for every `VITE_` var — the first deploy shipped with a dead demo button AND an empty Supabase URL. Remote env vars were removed entirely; the local build reads `.env.local`. If remote builds are ever wanted, add the env vars as non-sensitive in the dashboard.
- Verified live: demo sign-in → Home with demo games, deep-linked /stats renders live data.
- Google sign-in on prod still needs the provider enabled in Supabase plus `https://10pins.vercel.app` added to the auth redirect allowlist.

## 2026-07-07 — Milestone 4: manual entry + quick add end-to-end

- App shell: bottom tab bar (Home · Groups · ＋ · Stats · Profile) with the elevated phosphor Add FAB and the 3-option sheet (Scan scoreboard and Score live marked "Soon"; manual frame entry added as a fourth quiet option until capture exists).
- Quick add: big score entry, date (defaults today), optional venue (datalist of known venues, created on demand), optional guest players with scores, UNVERIFIED tag at the point of entry, footnote per design copy.
- Manual entry: full-game FrameEditor flow with live scorecard, settle ripple, Undo, save on completion. Frames stored per spec (`["9","/"]` jsonb), cumulative cache, strikes/spares/opens cached on game_players.
- Every game creates a session (venue holder) → game → game_players (+frames) → feed_event with computed highlights (`lib/highlights.ts`: FIRST_GAME/PB/threshold clubs/turkey incl. 10th-frame runs — 10 new tests).
- Game detail: full scorecard from stored frames, badge, date/venue/entry label, totals-only player rows, per-player mini-stats, owner delete with confirm.
- Stats: headline tiles (average/high/games/form arrow), SVG form graph, frame-level block in dashed well with the mandatory "Based on N frame-scored games" footnote (quick adds excluded), by-venue list, empty state. Backed by new `player_stats` + `player_venue_stats` security-invoker views.
- Home: recent-games list with badges linking to game detail.
- **RLS fix found by E2E testing:** `games_select` relying solely on `can_see_game()` broke `INSERT … RETURNING` (the security-definer function can't see a row inserted in the same statement — snapshot visibility). Policy now short-circuits on `created_by = auth.uid()`. Migration applied + local file updated.
- Verified end-to-end in the browser against live Supabase with a dev test user (`matteo+10pinstest@continuum.je`): first-run profile → quick add (142 + guest Dave 168, venue) → manual 300 (12 strikes) → stats (avg 221, high 300, 100% strikes on 1 frame-scored game) → DB rows and highlights confirmed by SQL.

## 2026-07-06 — Milestone 2: scaffold, Supabase migrations, auth, first-run profile

- Vite 6 + React 18 + TypeScript + Tailwind v4 scaffold; design tokens from the handoff README as `@theme` variables in `src/index.css` (colours, three font families, glow shadows, `label-caps`/`score-text` utilities). Dev server pinned to port 3000 so Supabase's default Site URL works for magic links in dev.
- Auth: magic-link sign-in (primary) + Apple/Google OAuth buttons, sent/error states, British-English copy per the design rules. Session context + TanStack Query profile hook in `src/lib/auth.tsx`.
- First-run profile screen: generated-initials avatar, display name, username with debounced live availability check against `profiles`, "Start bowling" CTA.
- Placeholder Home (solo empty state) with sign-out.
- Migrations staged in `supabase/migrations/`: full §4 schema (+ `name_mappings`, indexes) and complete §5 RLS (security-definer helpers, policies on all 14 tables).
- Supabase project `10pins` created (eu-west-2, ref `txqtdogymumvfvdoksow`) after pausing Last Man Standing to free a slot (user-approved; restorable any time). Both migrations applied, plus a third locking RLS helper functions away from `anon`/`public`. `.env.local` filled with the publishable key; `src/lib/database.types.ts` regenerated from the live schema. Magic-link send verified end-to-end from the dev server.
- Outstanding: Apple/Google OAuth need provider credentials in the Supabase dashboard (buttons are wired); production URL must be added to the auth redirect allowlist at deploy time.

## 2026-07-06 — Milestone 3: Scorecard + FrameEditor component gallery

- `Scorecard` component with all five README §Flagship variants: full, compact (74px name + one-glyph mini strip), live (amber current frame, dim pending frames, NOW BOWLING pill, blank pending totals), editing (amber mismatch fill on failing frames), share (larger cells, scaled preview in gallery).
- `FrameEditor` + `Keypad`: 3+1 column grid with double-height X and /, context-aware legality from `engine.legalRolls` (illegal keys disabled before the tap), always-visible Undo, focused frame cell, auto-advance.
- Settle motion (120ms amber flash + 240ms fade) on changed cumulative totals; disabled under `prefers-reduced-motion`.
- `VerificationBadge` (✓ VERIFIED / LIVE-SCORED / UNVERIFIED) per design treatments.
- Engine: exported `nextRoll(frames)` (position of the next roll) + 4 tests — 89 tests, coverage still 100% enforced.
- `/gallery` route (no auth) rendering everything against the hi-fi fixtures; interactive manual-entry demo verified in browser (legality after a 7, spare→strike scoring, Undo).

## 2026-07-06 — Auth policy change: Google only

- Product decision: Google is the sole sign-in method (overrides the spec's magic link + Apple/Google). Sign-in screen rebuilt around a single "Continue with Google" primary CTA; magic-link form and Apple button removed.
- Requires in the Supabase dashboard: enable the Google provider on project `10pins` with a Google Cloud OAuth client (redirect URI `https://txqtdogymumvfvdoksow.supabase.co/auth/v1/callback`); optionally disable the Email provider so magic links stop working entirely.

## 2026-07-06 — Milestone 1: scoring engine (build spec §3)

- Pure TypeScript scoring engine in `src/engine/` — zero dependencies, no React.
- Full API: `score`, `legalRolls`, `applyRoll`, `editRoll`, `reconciles`, plus `normalizeFrames` and `EngineError`.
- Notation normalisation: first-ball 10 → `X`, any two-roll 10 → `n, /`; illegal input rejected with the failing frame index.
- 85 Vitest tests: perfect 300, all-spares 150, gutters, Dutch 200, every 10th-frame case, foul/bonus interactions, partial-game null cumulatives, exhaustive `legalRolls`, `editRoll` ripple, `reconciles` corruption cases.
- All four design-bundle fixture players (MATT 169, DAVE 213, SOPH 125, JEN 141) asserted frame by frame; the illegal live-session `7,3` fixture proven to normalise to `7, /` and fail reconciliation.
- Coverage gate enforced in `vitest.config.ts`: 100% statements / branches / functions / lines on `src/engine/`.
