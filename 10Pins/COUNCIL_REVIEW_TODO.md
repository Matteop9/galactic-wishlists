# Council review — 10 Pins

> Re-checked against the live `tenpins` schema on **2026-09-02**, during the
> milestone-8 release. Every item below was verified as still-live or already
> fixed rather than taken on trust — the list had gone stale, and item 4 sat
> here from July until a user reported it through the in-app feedback queue.
> Tick things off as they land; a review doc where nothing is ever ticked is a
> review doc nobody reads.


> Generated from a full council review (7 specialist reviewers + adversarial verification, 2026-07-12).
> 58 findings confirmed, 4 rejected as false positives. Deduplicated here into ~35 distinct work items.
> Ordered by priority. Each item lists **where**, **why**, and **how to fix**.

Legend: `[ ]` todo · severity in **bold** · file references are clickable in Claude Code.

---

## P0 — Critical (live and trivially exploitable; fix first)

### [x] 1. Lock down `game_players_insert` so you can't tag other users' stats — **CRITICAL**
- **Status:** **DONE 2026-09-02** (`tp_0015`) — `can_tag()` + rewritten INSERT *and* UPDATE policies. Attack reproduced first (victim average 181.0 → 150.8), then proved rejected (42501) while self/guest/group-mate/friend writes still pass.
- **Where:** `supabase/migrations/20260706000002_rls.sql:174`
- **Why:** The policy only checks `owns_game(game_id)`, never `profile_id`. Anyone (including via the public demo login) can insert a `game_players` row carrying a victim's `profile_id` + a fake `final_score`. The victim's `player_stats` view aggregates it, corrupting their average/high game/recent scores, and they can't delete it. Profile IDs are all readable (`profiles_select using (true)`).
- **How to fix:**
  1. New migration `..._harden_game_players_rls.sql`.
  2. `drop policy game_players_insert on public.game_players;`
  3. Recreate with a `WITH CHECK` that requires `profile_id` to be **null** (guest), **`auth.uid()`**, or a confirmed relationship:
     ```sql
     create policy game_players_insert on public.game_players
       for insert to authenticated
       with check (
         public.owns_game(game_id)
         and (
           profile_id is null
           or profile_id = auth.uid()
           or public.are_friends(auth.uid(), profile_id)   -- accepted friendship only
         )
       );
     ```
  4. Longer term (milestone 5): add a `confirmed boolean default false` column so a tagged game only counts toward a player's stats after they accept it; filter `player_stats` on `confirmed`.
- **Verify:** as user A, attempt to insert a game_players row with user B's id → should be rejected by RLS.

### [x] 2. Remove the demo password from the public bundle — **HIGH (do with P0)**
- **Status:** **DONE 2026-09-02** (`tp_0016`) — anonymous sign-in + `join_demo()`; the demo email went from 1 occurrence in `dist/` to 0. ⚠️ Needs "Anonymous sign-ins" enabled on the Supabase project; until then the button hides itself.
- **Where:** `src/features/auth/SignIn.tsx:9`, `.env.local` (`VITE_DEMO_EMAIL` / `VITE_DEMO_PASSWORD`)
- **Why:** `VITE_`-prefixed vars are inlined into the deployed JS at 10pins.vercel.app. Anyone can read the creds, call `supabase.auth.updateUser` to hijack/brick the shared demo account, enumerate every profile, or spam shared tables.
- **How to fix (pick one):**
  - **Preferred:** Enable **Supabase anonymous sign-in** (Auth → Providers → Anonymous) and change the "Try the demo" button to `supabase.auth.signInAnonymously()`. Each visitor gets a throwaway user; no shared creds.
  - Add an `is_demo`/anonymous claim check to the RLS policies on shared tables (`venues`, `friendships`, etc.) so demo/anon users can't write to them.
  - Delete the `VITE_DEMO_*` vars from `.env.local` and Vercel once the anon flow is live.
- **Verify:** grep the built `dist/assets/*.js` for the old password string → must be absent.

---

## P1 — High: Security & data integrity

### [x] 3. Make `friendships` requester/addressee immutable — **HIGH**
- **Status:** **DONE 2026-09-02** (`tp_0015`) — `friendships_freeze_endpoints` trigger. Probed: status change still allowed, `requester` rewrite rejected.
- **Where:** `supabase/migrations/20260706000002_rls.sql:123` (`friendships_update`)
- **Why:** The addressee can rewrite the `requester` column, forging an "accepted" friendship with any victim and gaining their feed visibility.
- **How to fix:** Either restrict UPDATE to the `status` column only (column-level grant), or add a `BEFORE UPDATE` trigger that rejects changes to `requester`/`addressee`. Simplest:
  ```sql
  create or replace function public.freeze_friendship_parties()
  returns trigger language plpgsql as $$
  begin
    if new.requester <> old.requester or new.addressee <> old.addressee then
      raise exception 'cannot change friendship parties';
    end if;
    return new;
  end $$;
  create trigger friendships_freeze before update on public.friendships
    for each row execute function public.freeze_friendship_parties();
  ```

### [x] 4. Fix `deleteGame` — broken FK + missing delete policy — **HIGH**
- **Status:** **DONE 2026-09-02** (`tp_0012`, `tp_0013`) — reported by a user via the in-app feedback queue before this list was re-read. `feed_events.game_id` now cascades; `sessions`/`groups` got the owner-scoped DELETE policies their rollback paths always assumed. `deleteGame` also removes the photo from storage now.
- **Where:** `supabase/migrations/20260706000001_schema.sql:93` (`feed_events.game_id`), `src/lib/games.ts:247`
- **Why:** `feed_events.game_id` has no `ON DELETE` action and every saved game creates a feed event, so `delete from games` always fails (FK 23503). Users can never remove a mis-scored game.
- **How to fix:** New migration — drop and re-add the FK with cascade (Postgres can't alter it in place):
  ```sql
  alter table public.feed_events drop constraint feed_events_game_id_fkey;
  alter table public.feed_events
    add constraint feed_events_game_id_fkey
    foreign key (game_id) references public.games(id) on delete cascade;
  -- same for session_id
  ```
  Do the same for `sessions` references. (Cascade means deleting the game auto-removes its feed event, so no delete policy is needed — but if you keep events, add a `feed_events` delete policy for the owner instead.)

### [ ] 5. Move game save into one transactional RPC — **HIGH**
- **Where:** `src/lib/games.ts:71` (`saveQuickGame` / `saveManualGame`)
- **Why:** Save is 4 sequential REST writes with best-effort client rollback (itself 2 more network calls). A dropped connection mid-save leaves a `status='complete'` game with zero players — renders scoreless, can't be deleted.
- **How to fix:**
  1. Write a `security definer` Postgres function `save_game(session, game, players[], frames[], feed_event)` that does all inserts in one transaction and returns the game id.
  2. Grant `execute` to `authenticated` only; re-assert ownership inside the function.
  3. Replace the client's multi-step sequence with a single `supabase.rpc('save_game', ...)`.
  4. Delete the now-dead `rollback()` helper.
- **Verify:** kill the network after the game insert in the old flow vs. new — new flow leaves no partial rows.

### [ ] 6. Add `ON DELETE` handling to all FKs referencing `profiles` — **HIGH**
- **Where:** `supabase/migrations/20260706000001_schema.sql:67` (and 13-14, 24, 51, 73, 102, 110, 120, 128)
- **Why:** 11 FKs to `profiles` default to `NO ACTION`, so deleting any user who logged one game fails — a GDPR/erasure blocker.
- **How to fix:** New migration, per-table decision, drop/re-add each FK:
  - Personal rows (`friendships`, `reactions`, `comments`, `name_mappings`) → `on delete cascade`
  - `game_players.profile_id` → `on delete set null` (preserves group history as a guest row)
  - `created_by` columns (`groups`, `sessions`, `games`) → `on delete set null` or a reassign strategy — decide per table.

### [ ] 7. Fix `ensureVenue` ILIKE injection + add venue uniqueness — **HIGH**
- **Where:** `src/lib/games.ts:17`, `supabase/migrations/20260706000001_schema.sql:40`
- **Why:** `.ilike('name', trimmed)` treats `%`/`_` as wildcards → game attributed to the wrong venue. No unique constraint → concurrent saves create duplicate venues that split per-venue averages.
- **How to fix:**
  1. Add `create unique index venues_name_lower_idx on public.venues (lower(name));`
  2. Change `ensureVenue` to `upsert` on the normalized name, or match with `.eq('name', trimmed)` after lowercasing, escaping `%`/`_`/`\`.

### [ ] 8. Close the group_id RLS gaps — **MEDIUM (do with the RLS batch)**
- **Where:** `rls.sql:155` (`sessions_insert/update`), `rls.sql:193` (`feed_events_insert`)
- **Why:** Neither validates `group_id`, so an outsider who learns a group UUID can plant sessions/games/feed events in another group's feed (exploitable at milestone 5).
- **How to fix:** Add `(group_id is null or public.is_group_member(group_id))` to the `WITH CHECK` of `sessions_insert`, `sessions_update`, and `feed_events_insert`.

### [ ] 9. Rate-limit / moderate `venues` writes — **MEDIUM**
- **Where:** `rls.sql:150` (`venues_insert with check (true)`, no update/delete policy)
- **Why:** World-writable, uncleanable spam appears in every user's autocomplete.
- **How to fix:** Route venue creation through the `save_game` RPC (item 5) which normalizes + dedupes; add a `created_by` column and a delete policy for the creator/admin.

### [ ] 10. Add DB-side constraints on stats/frame columns — **MEDIUM**
- **Where:** `schema.sql` (`game_players` cached counts, `frames.rolls`)
- **Why:** Cached strike/spare counters and frame contents are unconstrained, so stats are poisonable through the public PostgREST endpoint.
- **How to fix:** Add `CHECK` constraints (`final_score between 0 and 300`, strike/spare/open counts `between 0 and 12`), and consider a trigger validating `rolls` jsonb shape on insert/update.

---

## P2 — High: Resilience, infra & test safety net

### [x] 11. Commit the project to git — **HIGH (do early, it's the rollback point)**
- **Status:** **DONE 2026-09-02** — 110 files committed (`1c6c78e`), secret-scanned first.
- **Where:** whole `10Pins/` folder (currently `?? ./`, zero history)
- **Why:** The live production app has never been committed; no rollback, deploys are "whatever is on the laptop," a OneDrive sync conflict silently changes the next deploy.
- **How to fix:** From the `10Pins/` folder, stage **only this subfolder** (never `git add -A` — the parent repo is public and shared):
  ```
  git add "Claude Projects/10Pins"
  git commit -m "10 Pins: initial commit of live v-current"
  ```
  Then commit before every `npm run deploy` so each production build maps to a commit. Confirm `.env.local` stays ignored (it is).

### [x] 12. Add a React error boundary + fix query-error/empty-data conflation — **HIGH**
- **Status:** **PARTLY DONE 2026-09-02** — `ErrorBoundary` is in and caught a real crash within minutes. The query-error / empty-data conflation is NOT addressed yet.
- **Where:** `src/App.tsx`, `src/features/feed/Home.tsx`, `src/features/stats/Stats.tsx`, `src/features/auth` (AuthGate)
- **Why:** No error boundary anywhere → a render-time engine throw white-screens the app. Query failures are treated as empty data: Home goes blank, Stats says "No games yet," AuthGate sends existing users to onboarding.
- **How to fix:**
  1. Add an `<ErrorBoundary>` around routed pages with a fallback + retry.
  2. In every data screen, branch explicitly: `isPending` → spinner, `isError` → error+retry (`refetch`), `data === null/empty` → empty state. Don't collapse error into empty.
  3. Wrap the `score()` call in `Scorecard` (items 15/16) so a bad row degrades to "scorecard unavailable" instead of throwing.

### [ ] 13. Persist in-progress manual entry + guard navigation — **HIGH**
- **Where:** `src/features/manual/ManualEntry.tsx:20` (also `QuickAdd.tsx`)
- **Why:** Entry lives only in React state. One accidental tab-bar tap, refresh, or iOS tab discard silently discards up to 10 frames — the flagship flow.
- **How to fix:** On every change, write `{history, date, venue}` to `localStorage` keyed per profile; rehydrate on mount; clear on successful save. Add a `useBlocker` (react-router) confirm when frames are non-empty, plus a `beforeunload` handler.

### [ ] 14. Fix the Add-game sheet accessibility — **HIGH**
- **Where:** `src/components/MobileTabBar.tsx:50`
- **Why:** `aria-hidden` sits on the backdrop that *wraps* the `role="dialog"`, removing the whole sheet (both entry buttons) from the a11y tree. No focus trap, no Escape.
- **How to fix:** Put `aria-hidden` on a separate sibling backdrop, not the wrapper. Add `aria-modal="true"`, move focus to the first button on open, trap focus, close on Escape.

### [x] 15. Label the keypad's strike/spare keys — **HIGH**
- **Status:** **ALREADY DONE** — every keypad key has an `aria-label`; verified 2026-09-02.
- **Where:** `src/components/Keypad.tsx:16`
- **Why:** Screen readers announce the two most important keys as literal "X" and "slash."
- **How to fix:** Map `'X'` → `aria-label="Strike"`, `'/'` → `"Spare"` (same pattern already used for Miss/Foul). After applying a roll, programmatically move focus to the keypad container/Undo instead of letting a disabled key drop focus to `document.body`.

### [ ] 16. Guard `score()` against bad DB rows — **MEDIUM (pairs with 12)**
- **Where:** `src/components/scorecard/Scorecard.tsx:72` & `:167`, `src/lib/frames.ts:14`
- **Why:** `score()` throws `EngineError` on illegal sequences; `GameDetail` feeds it raw DB frames with no validation, and there's no error boundary → one bad `frames` row white-screens the page for every viewer. `deserializeRolls` also silently coerces junk to gutter balls (wrong scores).
- **How to fix:** `try/catch` the `score()` call in `Scorecard`, render a fallback + surface the bad frame. Validate via `normalizeFrames` at the `framesFromRows` boundary; make `deserializeRolls` return a tagged "unreadable" result instead of guessing `0`, and fall back to totals-only display.

### [ ] 17. Fix the `score()` bonus-borrow bug across holes — **HIGH (engine)**
- **Where:** `src/engine/index.ts:171` (flat/flatStart bonus lookup), `src/lib/frames.ts:22`
- **Why:** Bonus lookup ignores frame boundaries. If an earlier frame is unfinished but a later frame has rolls, the strike/spare bonus silently borrows the wrong physical roll (shows a wrong cumulative instead of pending). Reachable via `editRoll` (the designated correction path) and via `framesFromRows` filling gaps with empty frames.
- **How to fix:** In `score()`, stop resolving a strike/spare bonus once any intervening frame is missing owed rolls (leave the frame pending); **or** have `normalizeFrames` reject rolls that appear after an unfinished/empty prior frame. Add a regression test: edit a mid-game strike down to one ball with later frames populated → the prior strike frame must return to `null`.

### [ ] 18. Add the missing test safety net — **HIGH**
- **Where:** `src/lib/games.ts` (0 tests), `vitest.config.ts:8`
- **Why:** The persistence layer that writes user scores is untested; coverage config measures only `src/engine` so `test:coverage` reports a misleading 100%.
- **How to fix:**
  1. Add `games.test.ts` with a mocked Supabase client: assert exact rows inserted for a known fixture (`HIFI_GAME`), assert rollback fires in order on each insert failure, assert highlights compute against the *pre-save* best.
  2. Add a corrupt/illegal-DB-row test through `framesFromRows` → `Scorecard` (needs `jsdom` + `@testing-library/react`).
  3. Widen `coverage.include` to `src/lib/**` + `src/components/scorecard/display.ts`; change test glob to `src/**/*.test.{ts,tsx}`.

### [x] 19. Ship real PWA scaffolding — **HIGH**
- **Status:** **DONE 2026-09-02** — `vite-plugin-pwa` with `registerType: 'prompt'` (never auto-reload mid-game), manifest, five icons generated from the real wordmark, and `vercel.json` widened so `/sw.js` and `/manifest.webmanifest` aren't swallowed by the SPA rewrite. Verified on prod: manifest serves as `application/manifest+json`, SW active, zero Supabase responses cached.
- **Where:** `index.html:3`, no `public/`, no manifest/SW
- **Why:** Positioned/demoed as a PWA but has no manifest, icons, or service worker. "Add to Home Screen" gives a plain shortcut; offline white-screens.
- **How to fix:** Add a web manifest now (standalone, `theme #0A0E14`, portrait) + icon set + apple-touch-icon + favicon. Add `vite-plugin-pwa` for the service worker when milestone 8 lands (cache-first for the Google Fonts too).

---

## P3 — Medium (polish & hardening)

### [x] 20. Add security headers to `vercel.json` — **MEDIUM**
- **Status:** **DONE 2026-09-02** — `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` (keeping `camera=(self)` for capture). Verified on the deployed response.
- **Where:** `vercel.json:3`
- **How:** Add a `headers` block: `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`) to stop clickjacking of sign-in/demo, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and a CSP with `connect-src` limited to your Supabase origin.

### [ ] 21. Fix the cleared-date-field crash — **MEDIUM**
- **Where:** `ManualEntry` / `QuickAdd` date handling
- **Why:** Clearing the date crashes save and surfaces a misleading "check your connection" error.
- **How:** Validate the date before submit; show a field-level "pick a date" message instead of routing through the generic connection error.

### [ ] 22. Fix FirstRun username-check silent failure — **MEDIUM**
- **Where:** `src/features/auth/FirstRun.tsx`
- **Why:** A failed availability check can permanently disable submit; a PK collision is misreported as "username taken."
- **How:** Distinguish network error (retry) from real 23505 collision; never leave submit permanently disabled.

### [x] 23. Fix scorecard React keys colliding on duplicate names — **MEDIUM**
- **Status:** **DONE 2026-09-02** — keyed by seat. Reachable in practice now: a monitor photo can return two players called MATT.
- **Where:** `Scorecard.tsx` (rows keyed by uppercased display name)
- **Why:** Two players named "MATT" collide → state bleed.
- **How:** Key by `game_player.id` (or seat_order), not the display name.

### [x] 24. iOS safe-area inset for the fixed tab bar — **MEDIUM**
- **Status:** **DONE 2026-09-02** — `env(safe-area-inset-bottom)` on the tab bar and the add sheet.
- **Where:** `src/index.css` (MobileTabBar), `index.html` viewport
- **How:** Add `padding-bottom: env(safe-area-inset-bottom)` to the tab bar; confirm `viewport-fit=cover` is set (it is).

### [ ] 25. Touch-target + contrast fixes — **MEDIUM**
- **Where:** remove-guest button (~18px), 10px `label-caps` text (~3.7:1 contrast)
- **How:** Bump interactive targets to ≥44px; raise small-label contrast to ≥4.5:1 (AA) or increase size/weight.

### [ ] 26. Fix the "Opening Google…" stuck sign-in button — **MEDIUM**
- **Where:** `src/features/auth/SignIn.tsx`
- **Why:** After back-navigation the button can stay stuck on "Opening Google…".
- **How:** Reset the loading state on mount / on `visibilitychange` when returning to the page.

### [x] 27. Missing-env-var guard — **MEDIUM**
- **Status:** **ALREADY HANDLED** — `supabase.ts` warns and falls back to a placeholder client rather than crashing; verified 2026-09-02.
- **Where:** `src/lib/supabase.ts`
- **Why:** Missing env vars produce a green build that ships a dead app; only a `console.warn` guards it.
- **How:** Throw at startup (or render a clear config-error screen) when the Supabase URL/key are absent.

### [ ] 28. Fix `.gitignore` swallowing `.env.example` — **MEDIUM**
- **Where:** `.gitignore` (`.env.*` pattern)
- **How:** Change to ignore `.env` and `.env.local` specifically, or add `!.env.example` so the template can be committed.

---

## P4 — Low (hygiene, batch when convenient)

- [ ] 29. `reconciles()` blind-casts non-engine errors to `EngineError` → `badFrames: [undefined]`. Narrow the catch. (`src/engine`)
- [ ] 30. `groups_update` has no `WITH CHECK` — an admin can reassign `created_by`/overwrite `invite_code`. Add one. (`rls.sql`)
- [ ] 31. OAuth uses the implicit flow (tokens in URL fragment). Switch to PKCE (`flowType: 'pkce'` in the Supabase client). (`src/lib/supabase.ts`)
- [ ] 32. Add indexes: `game_players(profile_id)`, `games(created_by)`, and FK columns checked on delete. (migration)
- [ ] 33. Hashed assets served with `max-age=0` — add an immutable cache-control header for `/assets/*` in `vercel.json`.
- [ ] 34. `/favicon.ico` rewritten to `index.html` (200 text/html) — add a real favicon + exclude it from the SPA rewrite.
- [ ] 35. Add tests for `display.ts` glyph functions and `frameCounts` 10th-frame strike/spare semantics (a 300 game currently records 10 strikes, bonus rolls uncounted). (`src/**/*.test.ts`)
- [ ] 36. Silent-failure UX: `deleteGame` and guest-score-clear give no feedback (guest clear silently records 0). Add `onError` toasts / confirm. (`src/features` + Home)

---

## Rejected by verification (do NOT action — false positives)
- Future-dated games: the `max` attribute does hold at the input level.
- `game_players` duplicate double-count: fresh `gameId` every save → not reachable.
- `settings.local.json` leak: covered by global gitignore.
- Untested highlights combo (FIRST_GAME + CLUB): the `?? -1` logic already handles it.

---

## Suggested execution order (batched to minimize migrations & re-deploys)
1. **Migration batch A (RLS + FKs):** items 1, 3, 6, 4, 7, 8, 10 — one migration, review, apply, verify. *(closes the critical + most high security/data)*
2. **Git commit** (item 11) — establish the rollback point.
3. **Save RPC** (item 5) + venue moderation (item 9).
4. **Resilience batch:** error boundary + query states (12), score() guards (16, 17), draft persistence (13).
5. **A11y batch:** items 14, 15, 23, 24, 25.
6. **Infra:** headers (20), PWA scaffolding (19), env guard (27), gitignore (28).
7. **Tests** (item 18) — ideally alongside each fix above.
8. **P4 sweep** when convenient.
