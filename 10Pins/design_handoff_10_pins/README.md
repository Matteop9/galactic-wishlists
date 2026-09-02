# Handoff: 10 Pins — mobile PWA (dark theme)

## Overview
10 Pins is a social ten-pin bowling app for casual friend groups. The unit of the product is the **group session**, not the individual stat log: one person captures a game (ideally by photographing the lane monitor), everyone's linked profile accrues the stats, and the group gets a persistent feed, leaderboards and running rivalries. Positioning: *the app for your bowling crew, not for league bowlers* — warm, competitive, banter-friendly. Explicitly not a pro stats tool.

This bundle covers the **complete first design pass in the dark (primary) theme**: design tokens, the signature element, flagship components, and every screen + named state from the product spec, plus share assets and a screen-flow map.

## About the design files
The files in this bundle are **design references authored in HTML** — a prototype showing intended look, layout and behaviour. They are **not production code to copy directly**. Your task is to **recreate these designs in the target codebase's environment** using its established patterns and libraries. The intended stack (per the product spec) is **React + Tailwind, Supabase backend, later wrapped for iOS via Capacitor**. If you're starting fresh, that's the recommended stack; standard camera capture via file input / `getUserMedia`.

Note on the HTML: the prototype is built as a "Design Component" (`.dc.html`) that uses a small template runtime (`<sc-for>`, `<sc-if>`, `{{ }}` holes) and inline styles throughout. **Ignore that runtime** — read the markup for structure and the inline `style="..."` values for exact tokens. The repeated game data (scorecards) lives in the component's JS `renderVals()` at the bottom of the file; it's realistic, mathematically-correct bowling data you can use as fixtures.

## Fidelity
**High-fidelity.** Final colours, typography, spacing and states. Recreate pixel-accurately using the codebase's libraries. All screens are drawn at **390 × 844** (iPhone-class); must degrade gracefully to 360-wide Android. A responsive desktop view is a nice-to-have for feed/stats/group only — do **not** build desktop capture or live scoring.

---

## Design tokens

### Colour — core palette (dark primary)
| Token | Hex | Use |
|---|---|---|
| `ink` | `#0A0E14` | app background |
| `panel` | `#111A26` | cards, sheets |
| `well` | `#0D1520` | scorecard cells, inputs, keypad keys |
| `glass` | `#D7F4FF` | CRT white (QR, splash accents) |
| `phosphor` | `#FFAE2B` | primary accent — verification, celebration, primary CTA, current frame |
| `signal` | `#FF5D45` | foul, destructive, live-recording dot |

### Colour — derived tones
| Token | Hex | Use |
|---|---|---|
| text | `#E9F1F6` | primary text |
| dim | `#8FA5B4` | secondary text |
| faint | `#5E7485` | captions, labels |
| disabled | `#33455A` | disabled keypad digits |
| mark | `#BFE9FF` | glowing roll marks (X / spare digits) — always with text-shadow glow |
| line | `#223146` | card / cell borders |
| hairline | `#1B2A3B` | internal dividers inside cells |
| success | `#5AD08A` | positive form arrow, availability |

### Glow (elevation is glow, not shadow, in dark)
- Amber glow (earned states only): `box-shadow: 0 0 16px rgba(255,174,43,.30)` and text `text-shadow: 0 0 12px rgba(255,174,43,.4)`.
- Glass/mark glow: `text-shadow: 0 0 6px rgba(150,220,255,.4)` on roll marks; `0 0 10px rgba(150,220,255,.5)` at large sizes.
- Sheet shadow (the rare drop shadow): `0 8px 24px rgba(0,0,0,.45)`; modal `0 20px 60px rgba(0,0,0,.6)`.
- Amber glow is **earned** — verification, celebration, current frame, primary CTA. Never decorative.

### Typography
Three families, loaded from Google Fonts:
- **Display — Oxanium** (600/700/800): scores, titles, headings, nav labels, glyphs. Slight tech/scoreboard character.
- **Body — Atkinson Hyperlegible** (400/700): all running copy and captions. Chosen for legibility in a dark alley.
- **Tabular/mono — Martian Mono** (400/600/700): every score and stat. Always `font-variant-numeric: tabular-nums` so columns align.

Scale (px): Display XL 34/800 · Display L 26/800 · Title 20/700 · Heading 17/700 · Body 15/400 · Body S 13.5/400 · Caption 12/400 · Label 10/600 tracked caps (`letter-spacing:.12em`, mono, colour faint).

### Spacing / radius
- Spacing scale (px): 4, 8, 12, 16, 24, 32, 48.
- Radius (px): 4 cells · 8 chips/keys · 10–12 inputs/CTAs · 12–16 cards · 40 phone frame · 999 pills.
- Standard screen gutter: 16px (feed/capture) to 24px (auth/centered). Bottom-nav height 78px. Status bar 44px.

### Motion values
| Name | Value |
|---|---|
| press | 80ms linear |
| fast | 120ms ease-out |
| base | 240ms cubic-bezier(.2,.8,.2,1) |
| sweep | 1600ms loop (the scan line) |
| settle | 120ms amber flash + 240ms fade (recompute ripple) |
| celebrate | ≤1200ms, always skippable |

---

## Signature element — "the sweep"
An amber phosphor scan line travelling over a glowing monitor grid. The product's moment of truth is reading the lane monitor, so the brand **is** the monitor's glow. It appears in exactly five places and **nowhere else** — restraint rule: it never idles, only runs while something is genuinely happening, then stops.
1. **Processing** — sweep reads the photo top-to-bottom (1600ms loop).
2. **Verification stamp** — a single sweep pass "prints" the ✓ VERIFIED badge onto a card.
3. **Live scoring** — the current frame carries the amber underline glow.
4. **Share card** — a frozen sweep line sits over the scorecard render.
5. **Splash** — one pass over the wordmark on cold start.

**Wordmark:** boxed numeral `10` (phosphor, 2px border, glow) + `PINS` in glass caps with `letter-spacing:.14em`. The name is under review — keep the wordmark pure type so only the letters change if the product is renamed.

---

## Flagship components

### Scorecard grid (canonical — the single most important object)
10 frames per player row. Each frame: a two-cell roll strip (17–18px tall, hairline divider) above a cumulative total row (19–20px). Roll marks in Oxanium, colour `mark #BFE9FF` with glass glow; totals in Martian Mono tabular. The **10th frame is deliberately wider** (`flex:1.7` vs `flex:1`) to hold three rolls, with a heavier left rule (`border-left:2px solid #2E4258`). Notation: numerals, `X` strike, `/` spare, `–` miss, `F` foul (colour signal). Totals align vertically across rows.

Variants (all present in §03 of the hi-fi file):
- **full** — feed detail / review / game detail. Two-row cells with totals.
- **compact** — feed cards. Name (74px) + one-glyph mini strip + right-aligned total.
- **live** — current frame outlined amber (`1.5px solid #FFAE2B` + inset bottom bar + glow); pending frames empty/dim; "NOW BOWLING" pill.
- **editing** — selected frame focused with amber outline + glow; amber mismatch state = `2px solid #FFAE2B` + `rgba(255,174,43,.14)` fill overlay on the failing frame only.
- **share render** — larger cells, branded, includes stamp (see share card).

Multi-player: 4 rows is the hero. Up to 8 rows stack; beyond 8 the block scrolls with the leader pinned.

### Frame editor + keypad
One component powering live scoring, photo-review correction and manual entry. Layout: header (current bowler avatar + name + frame/roll context + always-visible Undo), the focused frame cell, then the keypad. Keypad is a CSS grid `grid-template-columns: repeat(3,1fr) 1.2fr` with 50–52px rows: digits 1–9 and 0, `–`, `F` in the left 3 columns; **X spans two rows** (rows 1–2) and **/ spans two rows** (rows 2–3) in the 4th column — X and / are the largest targets and get distinct treatment (X plain glyph, / glass-glow). **Context-aware legality:** illegal keys are visually disabled (colour `#33455A`, dimmer border) *before* the tap — never an error after. Any edit ripples through downstream totals with the **settle** flash. Modes: live (auto-advance bowler-to-bowler) · spot-edit (jump to one frame from review) · full manual (blank card, sequential).

### Verification badges (three states)
- **✓ VERIFIED** — phosphor fill, ink text, glow. Strongest treatment. `font:700 10px Oxanium; letter-spacing:.1em; background:#FFAE2B; color:#0A0E14; border-radius:4px; padding:4px 9px; box-shadow:0 0 12px rgba(255,174,43,.4)`.
- **LIVE-SCORED** — quiet outline: dim text, `1px solid #2A3B4E`, no fill.
- **UNVERIFIED** — subtle, muted: faint text, `1px dashed #2A3B4E`. Legible, not punitive — the group's banter polices it, not the UI.

### Supporting components
Player chip (profile = filled avatar + solid border; guest = dashed avatar + dashed border, faint text) · leaderboard row (rank, avatar, name+games, movement ▲/▼/—, avg + high) · stat tile · form graph (SVG polyline, phosphor, period selector 3m/season/all) · reaction bar (fixed set 🔥 👏 💀 🎳 + `＋`) · venue row · QR join card (checkerboard `repeating-conic-gradient(#D7F4FF 0% 25%, #0D1520 0% 50%)`) · offline-queue banner (grey dot, "normal" framing) · celebration toasts (strike → turkey → PB/200-club, escalating, ≤1.2s, skippable).

---

## Screens & named states

All screens carry a `data-screen-label` in the prototype. Bottom tab bar (5 items): **Home · Groups · ＋Add (centre, elevated phosphor FAB) · Stats · Profile**. The centre Add opens a 3-option sheet ordered deliberately: **Scan scoreboard** (hero, phosphor) → **Score live** → **Quick add**.

### Onboarding & auth
- **Splash** — wordmark centered, one sweep pass, tagline "The app for your bowling crew".
- **Sign in** — email magic-link (primary) + Apple/Google. "No password" reassurance. Minimal.
- **First run · profile** — avatar (photo or generated initials, no elaborate builder), display name, username with live availability. CTA "Start bowling".
- **Invite landing** — first touch is usually an invite link. Shows avatar cluster, "Dave invited you to Thursday Pin Club", **group history already visible** (season leaderboard + a recent verified PB) before the "Join" CTA.
- **Solo empty** — first Home for a solo signup: monitor icon, "No games yet", primary "Scan your first game" + "Create a group" + "Add friends". Every empty state names one next action.

### Home feed
- **Default + new-content** — cards, one per game; a night of 3 games collapses into a **session card** with per-game breakdown. Verified game card leads with winner (phosphor score), highlight pills (NEW PB, 200 CLUB), compact scorecard, the **monitor photo slot** (real content — feature it), reaction bar + comment count. New-content indicator = phosphor pill "3 new games" in the header. Unverified entries render quiet with a dashed UNVERIFIED tag.
- **Empty** — see Solo empty above.

### Capture flow (the hero — invest most polish)
- **a) Camera** — full-screen viewfinder, phosphor corner brackets, alignment hint "Fill the frame with the scoreboard", tip line "Wait for the score grid, not the adverts", shutter (phosphor), gallery pick, flash toggle.
- **b) Processing** — photo pinned, **sweep** runs top-to-bottom, status "NAMES ✓ · FRAMES ✓ · CHECKING TOTALS…", target feel 3–5s.
- **b2) Queued offline** — first-class, not an error: "No signal — saved to your queue / We'll scan this when you're back online". Photo saved to a visible queue. "Keep bowling".
- **c) Review · amber** — the make-or-break screen. Monitor photo pinned above (pinch-zoom, collapsible), **player-matching row** (extracted names MATT/DAVE mapped to profile chips or guest, one-tap correct, remembered per group), full editable scorecard. Frames that fail to recompute to the extracted total are outlined **amber**; the callout points at the exact frame; totals recalculate on correction. Primary "Confirm scorecard".
- **c2) Review · clean fast path** — when nothing is amber the screen collapses to scorecard + "Everything adds up" + single Confirm. Most scans should be one tap.
- **d) Confirmed** — success moment: the ✓ VERIFIED stamp lands (sweep), brief celebration if PB/milestone, posted to feed. "See it in the feed" / "Scan the next game".
- **e) Errors** — unreadable ("Couldn't read that — fill the frame / avoid glare", retake or enter manually); partial game (accept what's there, remaining frames pending); wrong-content photo ("That doesn't look like a scoreboard").

### Live session
- **Create** — pick group, venue (defaults most-played), add players (profiles + guest names), **drag to order**, generate join QR + share link.
- **Scorer (one phone)** — full scorecard grid up top (current frame amber), current-bowler strip, keypad below, always-visible Undo, auto-advance after each frame resolves. Recording dot + "2 watching".
- **Spectator (everyone else)** — read-only, large arm's-length type, current bowler prominent with live total, connection indicator ("SYNCED"), join code. This screen gets shown around the lane — it must look great big.
- **End of game** — final card tagged LIVE-SCORED, "Attach photo to verify" prompt (upgrades to verified), then "Next game — same players" or "End session".
- **States** — waiting for players (QR + who's joined); reconnecting (spectator, catches up); offline (scorer keeps working locally, syncs on return); game abandoned (kept for session, excluded from averages, resume).

### Quick add (totals only)
One screen: big numeric score entry (0–300), date (defaults today), optional venue, optional additional players each with a score. Ten-second flow. **Labelled unverified at the point of entry** (preview tag, no surprise in feed). Footnote: totals-only games count in stats/averages; can attach a photo / add frames later to upgrade.

### Game detail
Canonical full scorecard, verification badge, monitor photo (tap for full-bleed), venue/date/group, per-player mini-stats for that game (strikes/spares/splits), reactions + comments thread. Owner actions: Edit frames, Share card, ⋯ (delete, attach photo). **Editing a verified game** shows a warning modal first: *"If your edits still match the photo's totals, the badge stays. If they stop matching, this game becomes unverified."*

### Group
- **Page (filter off)** — avatar cluster + name + home lane, season chip ("2026 season", end date), **leaderboard block** (the heart: rank, avatar, games, movement, season avg + high, verified-only toggle off), head-to-head teaser ("You're 7–3 up on Dave"), most strikes/turkeys, past seasons link.
- **Leaderboard · verified-only on** — toggle glows phosphor; header "COUNTING 27 OF 52 GAMES · PHOTO-CHECKED ONLY"; members with no verified games drop to a dimmed "—" row. Group setting, default **off**.
- **Head-to-head detail** — two avatars, big record "7–3", recent meetings with scores.
- **Empty (just created)** — QR + "Share invite link", "anyone who joins gets on the leaderboard from the first game".

### Stats (personal)
Headline tiles (average, high with ✓, games, form arrow) — Oxanium/phosphor. Form graph (SVG polyline, period selector). **Frame-level block visually separated** in a dashed well, always footnoted "Based on N frame-scored games — quick adds don't count here" (totals-only games excluded). Milestones strip (restrained). By-venue list. Empty state for no frame-scored games.

### Friends, invites & guest claim
- **Friends** — search by username, requests (accept/ignore), friends list, plus a guest-claim prompt ("'JEN' has 3 unclaimed games — send her a claim link").
- **Guest claim (growth loop)** — "Are you 'JEN'?" confirmation showing **exactly which games** transfer (date, venue, score, who with) before "Claim these games" / "Not me". Absorbs history into the profile.

### Settings
Account, theme (dark default), notifications, offline queue, export data (CSV), sign out, delete account (signal colour). Standard patterns, minimal effort.

### Share assets
- **Share card** — image render for WhatsApp/Instagram, exports **1080 × 1350** (4:5). Wordmark, group name, winner + big phosphor score, highlight pills, full scorecard render, frozen sweep line, ✓ VERIFIED stamp. This is free marketing — treat it as a distinct branded asset.
- **Group invite card** — wordmark, QR, group name + stats, join URL.

---

## Interactions & behaviour
- **Tap targets** ≥ 48px; keypad keys larger (50–52px). One-handed, thumb-reach primary actions. "Usable after two pints."
- **Recompute ripple:** any corrected roll flashes every *changed* downstream total amber for 120ms then fades (the settle motion) — makes the maths visible.
- **Keypad legality:** compute legal rolls for the current state (2nd roll ≤ remaining pins; 10th-frame third-roll rules) and disable illegal keys before tap.
- **Auto-advance** in live mode after a frame resolves; Undo always available.
- **Celebrations** escalate (strike → turkey → PB/200/250/300 club), ≤1.2s, always skippable, never block scoring.
- **Offline is normal, not failure:** capture and completed local games queue visibly (banner + queue list in Profile), sync automatically, notify on completion. Scorer keeps working offline; spectators see "reconnecting".
- **Skeletons** for feed, stats, leaderboards; capture gets its bespoke sweep state.

## State management
Core entities: `User` (username, displayName, avatar), `Group` (members, venue, season, verifiedOnly setting), `Session` (group, venue, players+order, games[]), `Game` (frames per player, totals, verification status, photo, highlights), `Frame` (rolls, cumulative total, amber/reconcile flag), `Reaction`, `Comment`, `Friendship`/request, `GuestName` + claim link, `OfflineQueueItem`.

Verification status is derived, not stored raw:
- **Verified** = monitor photo exists AND extracted rolls recompute exactly to extracted totals (or corrections still reconcile with the photo's totals). Machine-checked maths.
- **Live-scored** = frame-by-frame human entry, no photo. Upgradable by attaching a photo at game end.
- **Unverified** = totals-only entry, or a photo whose numbers never reconciled after manual override.
- Everything counts in personal stats/averages. Leaderboards filter to verified-only via group setting (default off). Editing a verified game removes the badge unless the edit still reconciles with the stored photo extraction — warn before the badge is lost.

Frame-level stats (strike/spare/open %, splits) are computed **only** from frame-scored games; totals-only games are excluded and this must stay legible.

## Copy rules
Sentence case. Buttons say what happens ("Confirm scorecard", "Start session", "Claim these games" — never "Submit"/"OK"). Consistent verbs (a "Scan" ends "Scanned", not "Uploaded"). Errors state what went wrong + one fix, no apologising, no vagueness. **British English.** Bowling vocabulary used correctly (frame, strike, spare, open frame, split, turkey = three consecutive strikes, foul).

## Assets
- Fonts: Oxanium, Atkinson Hyperlegible, Martian Mono (Google Fonts). Substitute with the codebase's equivalents only if these can't be loaded — but tabular figures for scores are **mandatory**.
- Icons: bottom-nav and small UI icons are inline SVG in the prototype (home, groups, stats, profile, camera). The X / / / – / F notation is **type**, not icons.
- No photographic assets shipped — the monitor-photo slots are placeholders the user fills. QR is a CSS pattern placeholder; generate real codes.
- No emoji in chrome; reactions (🔥 👏 💀 🎳) are the only emoji and are intentional product content.

## Out of scope (this phase)
Ball/arsenal management, oil patterns, handicaps, tournaments, venue booking, monetisation, notification-settings detail, Android-specific adaptations, marketing site. **Light theme** (Home/Stats/Group only) is deferred to after dark sign-off — build dark first.

## Files
- `10 Pins Hi-fi.dc.html` — the full hi-fi design pass (tokens §01–02, components §03, all screens §04–10, share assets + flow map §11). Primary reference. Game fixtures are in the JS `renderVals()` at the bottom.
- `10 Pins Directions.dc.html` — the three initial art-direction candidates; "Monitor glow" (1a) was chosen and is what the hi-fi file implements. Kept for context on rejected directions.
- `10-pins-design-spec.md` — the original product/design specification this pass was built against.
