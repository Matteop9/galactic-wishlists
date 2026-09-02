# 10 Pins — Technical Build Specification

**Version:** 1.0 · July 2026
**Audience:** engineering agent (Claude Code) building the product.
**Companion inputs:** the design handoff bundle (`design_handoff_10_pins/`) — read its `README.md` first; the `.dc.html` files are **design references, not production code**. Recreate the designs in this codebase using the patterns below. The README's token tables, component specs and copy rules are authoritative for visuals.

---

## 1. Stack and project setup

- **Frontend:** React 18 + Vite + TypeScript + Tailwind. Mobile-first PWA (design canvas 390 × 844, degrade to 360). `vite-plugin-pwa` for manifest + service worker.
- **Backend:** Supabase — Postgres, Auth, Realtime, Storage, Edge Functions (Deno).
- **Hosting:** Vercel (SPA). Later: Capacitor iOS shell pointing at the live URL (do not scaffold Capacitor in v1; keep the app shell-compatible: no SSR assumptions, camera via `<input type="file" accept="image/*" capture="environment">` with `getUserMedia` enhancement).
- **Fonts:** Oxanium (display), Atkinson Hyperlegible (body), Martian Mono (scores) via Google Fonts. `font-variant-numeric: tabular-nums` on all score/stat text — mandatory.
- **State:** TanStack Query for server state; Zustand for local session/offline state. No Redux.
- **Testing:** Vitest. The scoring engine must reach 100% branch coverage before any UI is built (§3).

Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; Edge Function secret `ANTHROPIC_API_KEY` (set via `supabase secrets set`, never shipped to client).

Repository layout:

```
src/
  engine/            # pure TS scoring engine + tests (no React imports)
  components/        # Scorecard, FrameEditor, Keypad, badges, chips…
  features/
    capture/         # camera, processing, review
    live/            # session create/scorer/spectator
    feed/  groups/  stats/  friends/  quickadd/  settings/
  lib/               # supabase client, offline queue, types
supabase/
  migrations/        # SQL below
  functions/
    extract-scorecard/
```

---

## 2. Architecture overview

Three entry modes converge on one pipeline:

```
photo ──▶ Edge Fn (Claude vision) ──▶ extraction JSON ─┐
live  ──▶ FrameEditor (roll events) ───────────────────┼─▶ engine.recompute ─▶ games/frames rows ─▶ feed_events
totals ─▶ Quick add form ──────────────────────────────┘        │
                                                     verification derivation (§7)
```

- The **scoring engine** (§3) is the single source of truth for all totals. The database stores raw rolls; cumulative scores are always derived, cached on write for query convenience, and recomputed on any edit.
- **One writer per live game** (the scorer's device). Spectators subscribe read-only via Realtime. No CRDT/conflict logic.
- **Offline is normal:** in-progress live games persist to `localStorage` on every roll; capture photos queue in IndexedDB and sync on reconnect.

---

## 3. Phase 0 — the scoring engine (build and test first)

Pure TypeScript module in `src/engine/`, zero dependencies, no React.

```ts
// Types
type Roll = number | 'X' | '/' | 'F';          // F = foul (counts 0, displayed F)
interface FrameInput { rolls: Roll[] }          // 1–2 rolls frames 1–9; 1–3 rolls frame 10
interface ScoredFrame {
  rolls: Roll[];
  pinsPerRoll: number[];
  cumulative: number | null;                    // null while bonus pending
  isStrike: boolean; isSpare: boolean; isOpen: boolean; isSplit?: boolean;
}
interface ScoredGame { frames: ScoredFrame[]; total: number | null; complete: boolean }

// API
score(frames: FrameInput[]): ScoredGame                 // full recompute, tolerant of partial games
legalRolls(frames: FrameInput[]): Set<Roll>             // legal next-roll set for keypad disabling
applyRoll(frames: FrameInput[], roll: Roll): FrameInput[]
editRoll(frames: FrameInput[], f: number, r: number, roll: Roll): FrameInput[]  // then recompute
reconciles(frames: FrameInput[], claimedCumulatives: (number|null)[]): { ok: boolean; badFrames: number[] }
```

Rules to implement exactly:
- Strike = 10 + next two rolls; spare = 10 + next one roll; open = pin count.
- Partial games: a frame's `cumulative` is `null` until its bonus rolls exist (this drives the live scorecard's blank totals).
- **10th frame:** third roll exists only after a strike or spare in rolls 1–2; two bonus rolls after a strike; pin-reset semantics for the 10th (after a strike, next roll is against a fresh rack).
- Foul: scores 0, displays `F`, still consumes a roll.
- `legalRolls`: second roll ≤ pins remaining (frames 1–9); full 10th-frame legality including post-strike fresh racks. A first-roll 10 is always `'X'`, never the digit pair summing to 10 — **any two-roll frame summing to 10 is a spare** and must be entered/normalised as `n, /`.
- `reconciles` compares engine-computed cumulatives with claimed ones (from photo extraction), returning the exact failing frame indices — this is the amber-highlight and verification input.

**Test suite (minimum):** perfect 300; all-spares 150 (e.g. all `5,/` = 150); all gutters 0; Dutch 200 (alternating X and spare); every 10th-frame case (X-X-X, X-X-n, X-n-/, X-n-m, n-/-X, n-/-m, open, foul in 10th); foul interactions with bonuses; partial-game null cumulatives at every stage; `legalRolls` exhaustively for a fresh frame, after a 7, and every 10th-frame state; `editRoll` on frame 3 of a strike chain rippling frames 1–2; `reconciles` happy path and single-frame corruption.

**Fixtures from the design bundle:** the four-player game in the hi-fi file's `renderVals()` (MATT 169, DAVE 213, SOPH 125, JEN 141) is verified correct — encode all four as engine tests asserting every cumulative. **Do not use the live-session fixtures as tests:** MATT's live frame 4 (`7,3` open, cumulative 58) is illegal (7+3 = 10 must be a spare). The engine's normaliser must reject or convert that input; add a test asserting exactly that.

---

## 4. Database schema (Supabase migration)

```sql
-- Profiles (1:1 with auth.users)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null,
  avatar_url text,
  created_at timestamptz default now()
);

create table friendships (
  requester uuid references profiles not null,
  addressee uuid references profiles not null,
  status text not null check (status in ('pending','accepted')) default 'pending',
  created_at timestamptz default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);

create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references profiles not null,
  verified_only_leaderboard boolean not null default false,
  season_name text default '2026 season',
  season_ends date,
  invite_code text unique default encode(gen_random_bytes(6),'hex'),
  created_at timestamptz default now()
);

create table group_members (
  group_id uuid references groups on delete cascade,
  profile_id uuid references profiles,
  role text not null default 'member' check (role in ('admin','member')),
  joined_at timestamptz default now(),
  primary key (group_id, profile_id)
);

create table venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lat double precision, lng double precision,
  place_id text unique
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups,
  venue_id uuid references venues,
  created_by uuid references profiles not null,
  started_at timestamptz default now(),
  status text not null default 'active' check (status in ('active','finished','abandoned'))
);

create table games (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions on delete cascade,
  game_number int not null default 1,
  entry_type text not null check (entry_type in ('photo','live','total','manual')),
  verification_status text not null default 'unverified'
    check (verification_status in ('verified','live','unverified')),
  photo_path text,                       -- storage path when a monitor photo exists
  extraction jsonb,                      -- raw vision output, kept for re-reconciliation
  status text not null default 'complete' check (status in ('in_progress','complete','abandoned')),
  played_at timestamptz not null default now(),
  created_by uuid references profiles not null
);

create table game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games on delete cascade,
  profile_id uuid references profiles,          -- null for guests
  guest_name text,                              -- null for profiles
  seat_order int not null,
  final_score int check (final_score between 0 and 300),
  strikes int, spares int, opens int,           -- cached; null for totals-only
  check (profile_id is not null or guest_name is not null)
);

create table frames (
  game_player_id uuid references game_players on delete cascade,
  frame_no int not null check (frame_no between 1 and 10),
  rolls jsonb not null,                         -- e.g. ["9","/"] or ["X"] or ["X","9","/"]
  cumulative int,                               -- engine-derived cache; null while pending
  is_split boolean default false,
  primary key (game_player_id, frame_no)
);

create table feed_events (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('game','session','milestone')),
  game_id uuid references games,
  session_id uuid references sessions,
  group_id uuid references groups,
  highlights jsonb default '[]',                -- ["PB","200_CLUB","TURKEY"]
  created_at timestamptz default now()
);

create table reactions (
  feed_event_id uuid references feed_events on delete cascade,
  profile_id uuid references profiles,
  emoji text not null check (emoji in ('🔥','👏','💀','🎳')),
  primary key (feed_event_id, profile_id, emoji)
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  feed_event_id uuid references feed_events on delete cascade,
  profile_id uuid references profiles not null,
  body text not null check (char_length(body) <= 500),
  created_at timestamptz default now()
);

create table guest_claims (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups not null,
  guest_name text not null,
  claim_code text unique default encode(gen_random_bytes(8),'hex'),
  claimed_by uuid references profiles,
  claimed_at timestamptz
);
```

Indexes: `frames(game_player_id)`, `game_players(game_id)`, `games(session_id)`, `feed_events(group_id, created_at desc)`, `group_members(profile_id)`.

**Storage:** bucket `monitor-photos`, private. Path convention `group_id/game_id.jpg`. Signed URLs for display.

---

## 5. Row Level Security (enable on every table)

Helper: `is_group_member(gid uuid)` — security-definer function checking `group_members`.

- `profiles`: readable by any authenticated user (usernames are public within the app); updatable only by owner.
- `friendships`: rows visible to either party; insert as requester; update (accept) by addressee only.
- `groups` / `group_members`: visible to members; groups also selectable by `invite_code` via an RPC (`join_group(code)`) so the invite-landing page can show the group preview pre-join — the RPC returns name, avatar cluster and top-3 leaderboard only.
- `sessions`, `games`, `game_players`, `frames`: select if member of the owning group **or** a participant (`game_players.profile_id = auth.uid()`); insert/update by session `created_by` (single-writer rule enforced at the policy level); games with no group (solo) visible to creator and tagged players.
- `feed_events`: visible if group member or friends-with a tagged participant (friend visibility via a view joining accepted friendships).
- `reactions` / `comments`: insert by anyone who can see the event; delete own only.
- `guest_claims`: claim via RPC `claim_guest_games(code)` which, in one transaction, sets `claimed_by` and updates all matching `game_players` rows (`guest_name` match within the group, `profile_id is null`) to the claiming profile. Return the list of games claimed for the confirmation screen.
- `monitor-photos` storage policy: read/write scoped to group members of the game's group.

---

## 6. Photo capture pipeline

**Edge Function `extract-scorecard`:**
1. Input: `{ photoPath, gameHint?: { playerCount?, groupId } }`. Download image from Storage server-side.
2. Call Anthropic Messages API (`claude-sonnet-4-6`, image + prompt). Prompt requires **JSON only**, schema:

```json
{
  "players": [{
    "displayed_name": "MATT",
    "frames": [{"frame":1,"rolls":["9","/"],"cumulative":20}],
    "final_score": 169
  }],
  "partial": false,
  "confidence_notes": "optional free text on unreadable regions"
}
```

3. Normalise rolls (uppercase X, `/` for any two-roll 10, `–`→miss, F). Run `engine.reconciles` per player. Respond to the client with the extraction **plus** `{ badFrames: {playerIdx: number[]} }`.
4. The client renders the review screen: amber frames = `badFrames`; edits run through the engine locally; on confirm, write `games` (entry_type `photo`), `game_players`, `frames`, store `extraction` jsonb, derive verification (§7), insert `feed_event` with computed highlights.
5. Name matching: client-side. Persist a per-group map `displayed_name → profile_id/guest` in a `name_mappings` table (group_id, displayed_name, target) so it's one tap next time.

**Client capture behaviour:** compress to ≤1600px longest edge before upload. If offline: save blob + metadata to IndexedDB queue; a queue processor (on `online` event + app focus) uploads, invokes the function, then local-notifies "Scanned — review when ready". Queue is visible in Profile per the design.

Costs are negligible at expected volume; still add a per-user rate limit in the function (e.g. 30 scans/day) as a guard.

---

## 7. Verification derivation (server-side function, single source of truth)

Implement as one Postgres function or one shared Edge module used by every write path:

- `verified` ⇐ `photo_path` present **and** current frame rolls recompute exactly to the extraction's claimed cumulatives (per `engine.reconciles` against stored `extraction`).
- `live` ⇐ entry_type `live`, no photo. Attaching a photo post-game re-runs extraction against the *entered* frames; if reconciled → upgrade to `verified`.
- `unverified` ⇐ entry_type `total`/`manual`, or photo present but never reconciled after manual override.
- Any frame edit re-derives status; the client shows the design's warning modal before an edit that would drop `verified`.
- Leaderboard queries take a `verified_only` flag from the group setting.

---

## 8. Live session (Realtime)

- Channel per session: `session:{id}` using Supabase Realtime **broadcast** for roll events (low latency) plus Postgres changes on `frames` as the durable record.
- **Scorer** (creator's device): every keypad tap → `applyRoll` locally → optimistic UI → persist to `localStorage` (`live-session:{id}`) → upsert the affected `frames` row → broadcast `{gamePlayerId, frameNo, rolls}`.
- **Spectators:** subscribe; on join or reconnect, fetch full state from `frames` then apply live broadcasts. Show SYNCED/reconnecting indicator per design.
- Offline scorer: keep scoring from localStorage; flush upserts in order on reconnect. On app relaunch with an unfinished local game, offer resume (this is the LaneTalk failure mode we're explicitly fixing).
- Join flow: QR/link encodes session id + a join token; joining adds viewer presence (Realtime presence API drives the "2 watching" count).
- End of game: compute final scores via engine, cache `final_score`/`strikes`/`spares`/`opens` on `game_players`, prompt photo-verify, then next-game (clone players/order, `game_number+1`) or end session (feed event for the session).

---

## 9. Stats and highlights

Computed via SQL views (not client aggregation):
- `player_stats`: average, high game, games played over all games; **frame-level stats (strike %, spare %, open %, splits) computed only where frames exist** — expose `frame_scored_games` count for the mandatory "Based on N frame-scored games" footnote.
- `group_leaderboard(group_id, verified_only)`: season-scoped (games where `played_at` within season), avg/high/games/movement (movement = rank now vs rank 7 days ago; a materialised weekly snapshot table is acceptable).
- Head-to-head: wins by comparing `final_score` between two profiles within shared games.
- Highlights on game confirm: PB (score > previous max), thresholds (100/150/200/250/300 club), turkey (three consecutive X anywhere), first game. Write into `feed_events.highlights`.

---

## 10. PWA / app shell

- Manifest: dark theme colour `#0A0E14`, standalone display, portrait.
- Service worker: precache shell; **network-first** for data, cache-first for fonts/assets. Do not cache Supabase auth endpoints.
- The offline queue and localStorage session survival are the real offline story; the SW is secondary.
- Share card: render the branded 1080×1350 card client-side (canvas or satori) from the game data + design tokens; share via Web Share API with file fallback to download.

---

## 11. Build order (each milestone independently verifiable)

1. **Engine + full test suite** (§3). Gate: all tests green, fixtures encoded, illegal-input normalisation proven.
2. **Scaffold:** Vite/Tailwind/tokens from README, Supabase project, migrations, auth (magic link + Apple/Google), profile first-run.
3. **Scorecard + FrameEditor components** (all variants per README §Flagship) rendered against engine fixtures in a component gallery route.
4. **Manual entry + Quick add** end-to-end: write games, game detail screen, personal stats views.
5. **Groups + friends + feed:** invite RPC, leaderboards, reactions/comments, guest claim RPC.
6. **Live session:** Realtime, scorer/spectator, offline survival, end-of-game flow.
7. **Capture pipeline:** Edge Function, camera UI, processing/review/confirm with amber flow, offline queue, verification derivation + badges everywhere.
8. **Polish:** celebrations, share card, skeletons/empty states, PWA manifest/SW, copy pass (British English, design copy rules).

Photo capture is deliberately after live scoring: it depends on the review editor (milestone 3) and verification (§7), and live mode exercises the engine hardest first.

## 12. Non-functional requirements

- All score text tabular; totals align across rows (visual regression-check the 4-player card).
- Tap targets ≥48px; keypad rows 50–52px; X and / double-height per design.
- Amber glow only on earned states (verification, celebration, current frame, primary CTA) — lint the design tokens into Tailwind theme so arbitrary ambers don't creep in.
- No secrets in the client; the Anthropic key lives only in the Edge Function.
- British English throughout UI copy; follow the README copy rules verbatim.
- Accessibility floor: visible focus states, `prefers-reduced-motion` disables sweep/celebrations, semantic buttons.
