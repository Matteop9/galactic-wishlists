# Changelog — 10 Pins

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
