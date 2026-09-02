# 10 Pins — Design Specification

**Version:** 1.0 · July 2026
**Working title:** 10 Pins (name under review — design the identity so the wordmark is easily swappable)
**Audience for this document:** design agent producing high-fidelity screens, a token system and component specs. Output will be handed, together with a technical build spec, to an engineering agent building the product in React.

---

## 1. Product summary

10 Pins is a social ten-pin bowling app for casual friend groups. Think 18 Birdies for bowling: the unit of the product is the **group session**, not the individual stat log. One person captures the game (ideally by photographing the lane monitor), everyone's linked profile accrues the stats, and the group gets a persistent feed, leaderboards and running rivalries.

**Positioning line:** the app for your bowling crew, not for league bowlers. Warm, competitive, banter-friendly. Explicitly *not* a pro stats tool — no oil patterns, no ball arsenals, no handicap admin.

**Primary persona:** a group of 4–10 friends in their 20s–30s who bowl together every few weeks, care about bragging rights, and will not tolerate data-entry chores. Secondary: an individual within that group checking their own form between sessions.

**The three moments the design must nail:**
1. **Capture** — photographing the overhead monitor at the end of a game and confirming the extracted scorecard in under 20 seconds.
2. **Live session** — one phone scoring frame-by-frame while everyone else watches the shared scorecard update in real time.
3. **The feed moment** — a finished game landing in the group feed and someone reacting to it two days later.

---

## 2. Platform and hard constraints

- **Mobile-first PWA.** Design at 390 × 844 (iPhone-class). Must degrade gracefully to small Android (360 wide). A simple responsive desktop view is nice-to-have for feed/stats screens only; do not design desktop versions of capture or live scoring.
- **Dark environment first.** Bowling alleys are dark with neon accents. The app will be used at the lane, so **dark mode is the primary theme**; provide a light theme as the secondary. All lane-side screens (capture, live scoring, session view) must be designed dark-first with high contrast.
- **One-handed, low-precision use.** Users are standing, holding a drink, mid-conversation. Primary actions in thumb reach, minimum 48 px tap targets, and the scoring keypad targets larger still (see §6.2). The informal bar: usable after two pints.
- **Poor connectivity is normal.** Offline/queued states are first-class, not error states (see §8).
- **Tech context (affects feasibility, not creativity):** React + Tailwind, Supabase backend, later wrapped for iOS via Capacitor. Avoid effects that assume native (no complex gesture choreography, no heavy blur stacks). Standard camera capture via file input / getUserMedia.

---

## 3. Brand and visual direction

We want a design brief executed with a point of view, not a template. Requirements and latitude:

- **Ground it in the alley.** The visual world of bowling — lane wood, pin gloss, overhead monitor glow, retro scorecard grids, alley carpet maximalism — is rich source material. Pull from it deliberately. The scorecard grid itself is an iconic graphic object; treat it as a brand asset, not just a data table.
- **Tone:** competitive warmth. Mates ripping into each other, not a sports-science dashboard. Copy is plain, confident, lightly playful ("New PB", "That's a turkey", "Unverified — pics or it didn't happen" is the register ceiling, don't go zanier).
- **Signature element (required):** propose ONE memorable device and carry it through — e.g. a distinctive scorecard rendering style, a strike/turkey celebration motif, or a verification stamp treatment. Spend the boldness there; keep everything else quiet and disciplined.
- **Token system (required deliverable):** 4–6 named palette values (dark theme primary), a display face with character used with restraint, a body face, and a tabular/mono face for scores and stats (scores must align in columns — tabular figures are mandatory). Type scale, spacing scale, radius and elevation tokens.
- **Avoid:** generic dark-dashboard-with-acid-green defaults; cream-and-terracotta editorial defaults; anything that reads "pro sports analytics". If a choice would look the same on a generic fitness app, revise it.
- **Iconography:** pins, frames, X and / notation are the native symbol set. The X (strike) and / (spare) glyphs will appear thousands of times — design their rendered treatment explicitly.

---

## 4. Information architecture

Bottom tab bar, five items:

| Tab | Purpose |
|---|---|
| **Home** | Feed of games from friends and groups |
| **Groups** | Your groups: leaderboards, members, seasons |
| **➕ Add** (centre, elevated) | The hero action — opens the capture sheet |
| **Stats** | Your own performance |
| **Profile** | You, settings, friends |

The centre **Add** button opens a three-option sheet (this ordering is deliberate — photo is the hero):
1. **Scan scoreboard** (camera, primary treatment)
2. **Score live** (start a session)
3. **Quick add** (totals only)

---

## 5. Screens

Design every screen listed, including all named states. Empty states are specified because a new user's first week is mostly empty states.

### 5.1 Onboarding & auth
- Splash → sign in (email magic link + Apple/Google). Minimal.
- First-run: set username, display name, avatar. Avatar system can be simple (photo or generated initials) — do not design an elaborate avatar builder.
- **Join-via-invite path:** a user's first touch is often a group invite link or a "claim your games" link (see 5.9). Design the flow where sign-up lands you directly in a group with history already visible.
- Empty state after solo signup: prompt to create a group or add friends, with "scan your first game" as the alternative.

### 5.2 Home feed
- Cards, one per completed game/session. Card contents: group name, venue, date; per-player chips with scores (winner emphasised); verification badge (§7); optional photo thumbnail (the actual monitor photo — this is good content, feature it); highlight callouts (PB, turkey, 200+ game, head-to-head streak change).
- Reactions (small fixed set, e.g. 🔥 👏 💀 🎳) and comments. Comment view can be a simple sheet.
- Session grouping: 3 games from one night collapse into one session card with per-game breakdown on tap.
- States: default, empty ("No games yet — get the crew together"), new-content indicator.

### 5.3 Capture flow (the hero — invest most polish here)
Four steps:

**a) Camera** — full-screen viewfinder, alignment hint ("Fill the frame with the scoreboard"), shutter, gallery pick fallback, flash toggle. Tip line for cycling monitors: "Wait for the score grid, not the adverts."

**b) Processing** — photo pinned with a scanning treatment (this is a natural home for the signature motif). Target feel: confident, 3–5 s. Must also have a **queued-offline variant**: "No signal — we'll scan this when you're back online" with the photo saved to a visible queue.

**c) Review & confirm** — the make-or-break screen:
- Extracted scorecard rendered in the app's scorecard component (§6.1), photo pinned above, pinch-zoomable, collapsible.
- **Player matching row:** extracted names ("MATT", "DAVE") mapped to profile chips or "guest" — one-tap corrections, remembered per group.
- **Frame confidence:** frames where the extracted rolls fail to recompute to the extracted running total are highlighted amber. Tapping an amber frame opens the frame editor (§6.2) scoped to that frame. All downstream totals visibly recalculate on correction.
- **Clean-scan fast path:** when nothing is amber, the screen collapses to scorecard + "Looks right?" + single Confirm button. Most scans should be one tap.
- Confirm → success moment (badge stamp lands, brief celebration if PB/milestone) → posted to feed.

**d) Error states:** unreadable photo ("Couldn't read that — try filling the frame / avoid glare", retake or enter manually); partial game detected (accept, remaining frames marked pending); wrong-content photo.

### 5.4 Live session
- **Create:** pick group and venue, add players (profiles + guest names), order them. Generate join QR + share link.
- **Scorer view (one phone):** the frame editor (§6.2) in live mode. Current bowler prominent, full scorecard grid above, keypad below. Auto-advance to next bowler after each frame resolves; undo always visible. Strike/turkey micro-celebration on entry — quick, not blocking.
- **Spectator view (everyone else):** read-only live scorecard, updates in real time, current bowler highlighted, connection indicator. This screen will be shown around at the lane — it should look great at arm's length.
- **End of game:** final card, "Attach photo to verify" prompt (upgrades the game to verified, §7), then "Next game" (keeps players/order) or "End session".
- States: waiting for players, connection lost (scorer keeps working locally; spectators see "reconnecting"), game abandoned.

### 5.5 Quick add (totals only)
- One screen: score (0–300, big numeric entry), date (defaults today), optional venue, optional additional players each with a score. Ten-second flow.
- Clearly labelled as unverified at the point of entry: subtle "Unverified" tag preview so the status isn't a surprise in the feed.
- "Add frames later / attach photo" affordance on the resulting game for upgrading.

### 5.6 Game detail
- Full scorecard (canonical component), verification badge, photo (if any) full-bleed viewable, venue/date/group, per-player mini-stats for that game (strikes, spares, splits if known), reactions/comments thread.
- Owner actions: edit (opens frame editor; editing a verified game visibly drops/retains the badge per the reconciliation rule — design the "this will remove verification" warning), delete, attach photo.

### 5.7 Group page
- Header: group name, avatar cluster, venue most played.
- **Leaderboard block (the heart of the page):** season average, high game, most strikes/turkeys, games played. Rank movement indicators. A **"verified only" filter toggle** (group setting, default off) — design both states.
- Head-to-head: tap any two members → record ("You're 7–3 vs Dave"), recent meetings.
- Season concept: a named period (e.g. "2026 season") with an end date; past seasons archived and viewable. Keep light — this is not league admin.
- Members list, invite (QR + link), group settings (name, avatar, verified-only toggle).
- Empty state: newly created group before any games.

### 5.8 Stats (personal)
- Headline tiles: average, high game, games played, current form arrow.
- Form graph: score over time, with a period selector (3m / season / all).
- Frame-level block: strike %, spare %, open frame %, splits — **always footnoted "Based on n frame-scored games"** and visually separated from headline stats, because totals-only games are excluded here. This distinction must be legible, not buried.
- Milestones/achievements strip (first 100/150/200, first turkey, 10 games, etc.). Keep restrained — badges support banter, they are not the product.
- Per-venue breakdown (average by venue) as a secondary list.

### 5.9 Friends, invites and guest claim
- Friends list, requests, search by username.
- **Guest claim flow (growth loop — design carefully):** a guest ("DAVE") who signs up via a claim link sees the games recorded under that guest name, confirms "Yes, that's me", and their profile absorbs the history. Design the confirmation screen showing exactly which games will be claimed.
- Share surfaces: game share card (image-rendered scorecard suitable for WhatsApp/Instagram — design this as a distinct branded asset, it is free marketing) and group invite card.

### 5.10 Settings
- Account, theme (dark default), notifications (friend reactions, challenges, group activity), data export, sign out, delete account. Standard patterns; minimal design effort.

---

## 6. Core components (spec individually — these are the system)

### 6.1 Scorecard grid (the canonical component)
The single most important visual object in the app. Used in: feed cards (compact), game detail (full), live session (live), photo review (editable), share image (branded render).
- 10 frames per player row; frames show roll marks (numerals, X, /, –, F for foul, split indicator) above a cumulative total.
- 10th frame is wider (up to three rolls) — design this asymmetry deliberately rather than letting it look broken.
- Required variants: **compact** (feed: names + totals + mini-frame strip), **full**, **live** (current frame highlighted, pending frames dimmed), **editing** (selected frame focused, amber mismatch state), **share render** (branded, includes verification stamp).
- Multi-player: up to 8 rows; design the 4-player case as the hero, define scroll/stack behaviour beyond that.
- Tabular figures throughout; totals must align vertically across rows.

### 6.2 Frame editor + keypad
One component powering live scoring, photo-review correction and manual entry.
- Keypad: 0–9, X (strike), / (spare), – (miss), F (foul), undo. X and / are the most-used keys — largest targets, distinct treatment.
- Context-aware legality: keys that would create an illegal roll (second roll exceeding remaining pins; 10th-frame third roll rules) are disabled, never error after the fact.
- Live recompute: any edit visibly ripples through downstream totals (a brief settle animation on changed totals communicates the recalculation).
- Modes: **live** (advances bowler-to-bowler), **spot-edit** (jump to one frame from photo review), **full manual** (blank card, sequential).

### 6.3 Verification badge set (see §7 for logic)
Three visual states used on feed cards, game detail, leaderboards and the share render:
- **Verified** — camera/stamp mark. The strongest treatment; this is the badge people want on a PB.
- **Live-scored** — quiet secondary tag.
- **Unverified** — subtle, slightly muted treatment of the entry itself. Legible but not punitive; the group's banter does the policing, not the UI.

### 6.4 Supporting components
Feed card; leaderboard row (rank, avatar, value, movement, badge filter state); stat tile; form graph; player chip (profile vs guest states); reaction bar; venue row; QR join card; offline-queue banner; toast/celebration system (strike, turkey, PB, 200/250/300 club — escalating but always ≤1.5 s and skippable).

---

## 7. Verification model (design logic reference)

- **Verified** = a monitor photo exists AND the extracted rolls recompute exactly to the extracted totals (or user corrections still reconcile with the photo's totals). Machine-checked maths, not notarisation.
- **Live-scored** = frame-by-frame human entry, no photo. Upgradable by attaching a photo at game end.
- **Unverified** = totals-only entry, or a photo whose numbers never reconciled after manual override.
- Everything counts in personal stats and averages. Group leaderboards can be filtered to verified-only via a group setting (default off).
- Editing a verified game's frames removes the badge unless the edit still reconciles with the stored photo extraction — the edit flow must warn before the badge is lost.

---

## 8. System states (design once, apply everywhere)

- **Offline capture queue:** photos and completed local games queue visibly (banner + queue list in Profile), sync automatically, notify on completion. Framed as normal behaviour, not failure.
- **Processing/skeletons:** feed, stats and leaderboards get skeleton states; capture gets its bespoke scanning state.
- **Empty states:** feed (no friends/games), group (no games), stats (no games / no frame-level games), friends (none). Every empty state names the single next action.
- **Errors:** scan failed, connection lost mid-session, claim link expired. Plain explanation + one recovery action, per the copy rules below.

---

## 9. Copy rules

Sentence case throughout. Buttons say what happens ("Confirm scorecard", "Start session", "Claim these games" — never "Submit"/"OK"). Consistent verbs end-to-end (a "Scan" ends in "Scanned", not "Uploaded"). Errors state what went wrong and how to fix it, no apologising, no vagueness. British English. Bowling vocabulary used correctly: frame, strike, spare, open frame, split, turkey (three consecutive strikes), foul.

---

## 10. Out of scope for this design phase

Ball/arsenal management, oil patterns, league handicaps, tournaments, venue booking, monetisation surfaces, notifications settings detail, Android-specific adaptations, marketing site.

---

## 11. Deliverables requested

1. **Design tokens:** palette (dark primary + light secondary), type (display/body/tabular-numeric), spacing/radius/elevation, motion values.
2. **Component specs** for §6, all variants and states, with the scorecard grid and frame editor treated as flagship components.
3. **High-fidelity screens** for every screen and named state in §5, at 390 × 844, dark theme (light theme for Home, Stats and Group only).
4. **The signature element** documented: what it is, why it fits, where it appears.
5. **Share-card render** design (game result image for WhatsApp/Instagram).
6. Screen-flow map covering: first-run via group invite; scan→confirm→feed; live session create→score→verify; guest claim.

Files in whatever format your pipeline produces (Figma-style frames, HTML/CSS references or annotated images are all acceptable) — engineering will consume them alongside a separate technical build spec.
