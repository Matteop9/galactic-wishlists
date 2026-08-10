# Acca Tracker — Design Guide ("Friday Night Slip")

Companion to `acca-tracker-build-spec.md`. Encodes the visual system shown in the design file (`Acca Tracker Design.dc.html` at the project root). Dark theme only in v1, mobile-first at 390px, desktop is the same layout centred at max-width 480px.

## 1. Direction

Floodlit betting slip: near-black pitch-green background, one loud lime accent for anything live or actionable, and the two team identities carried everywhere — VDL amber, JHP sky. Numbers are the heroes; everything numeric is mono and tabular. No gradient washes, no emoji in UI chrome (announcement graphics are exempt — see build spec §11b).

## 2. Tokens

Colours (hex):

- `bg` #0A0D0B — app background
- `surface` #121712 — cards
- `surface-2` #0E120F — inputs, card footers, tab bar
- `line` rgba(255,255,255,.07) — hairlines (use .12–.14 for input borders)
- `text` #EAF0E6 · `muted` #93A08F
- `accent` #B4E33D (lime) — live states, active nav, primary CTA; tint bg rgba(180,227,61,.08), text-on-accent #0A0D0B, bright text variant #D8F58C
- `vdl` #F5A83B · `jhp` #57B8F0 — team identities; avatar/chip tint = colour at 14–16% alpha, border at 40% alpha
- `win` #55D97C (text/icons) · `win-solid` #2F9E5D (form cells, W toggle)
- `loss` #F0655F (text/icons) · `loss-solid` #B54742 (form cells, L toggle)
- `gold` #F2C94C — 6/6 double, BTTS badge; text-on-gold #3A2A08
- `nopick` #6E1F1F — −2 form cell; text #F5C9C9

Tailwind: register the above under `theme.extend.colors` with these names.

Type (Google Fonts):

- **Saira Condensed 600/700** — display: page titles, team names, section mastheads. Uppercase, letter-spacing .04–.06em.
- **Archivo 400–700** — UI and body. Player names 700.
- **Spline Sans Mono 500–700** — every number (odds, scores, counts, dates in grids), all micro-labels/overlines (9px, letter-spacing .12–.14em, uppercase, muted).

Scale: page title 24px · card team name 22px · stat value 22px · odds in rows 14px · combined odds 19px · row primary 13px · row secondary 11.5px muted · overline 9px. Scores and S/M to 2dp; odds to 2dp; British English.

Shape & space: cards radius 14px (12px for sub-cards/tiles), inputs 10px, buttons 12px, badges 4px, pills 99px. Page padding 16px; card row padding 9–10px 14px with 1px `line` separators; section gap 14–16px. Hit targets ≥ 44px on interactive controls.

## 3. Core components

**Acca card** (flagship — This Week): 3px team-colour gradient bar across the top; header = team name (Saira, team colour) + "6-FOLD" overline, right-aligned COMBINED overline + combined odds (mono 19px). Six pick rows: 30px avatar circle (team tint, 2-letter mono initials) · name + selection · method badge · odds (right-aligned, 44px column) · state icon. State icons: won = green ✓ chip, lost = red ✕ chip (row also gets rgba(240,101,95,.05) bg and struck-through red odds), pending = 18px hollow circle. Footer strip on `surface-2`: left = plain-English status ("Acca down — 1 leg lost" in loss colour / "All 6 alive — 3 to go" in #D8F58C), right = "2W · 1L · 3 pending" mono.

**Method badges**: mono 9px uppercase, letter-spacing .12em, 2×6px padding, 4px radius, transparent bg, 1px border at 40% alpha. WIN = win green; BTTS = gold. Same construction for team chips (VDL/JHP) and the ×2 gold chip.

**Form grid cell**: 26×24px, radius 5px, solid fill, centred mono 9px value. +1 `win-solid` · 2 `gold` (dark text) · −1 `loss-solid` · −2 `nopick`. Column headers = GW dates (d/m, mono 8px); a 6/6 week's date header is gold. Row = name (52px) + 5 cells + right-aligned form count "n/5" (5/5 in accent). Always render the four-swatch legend beneath.

**Leaderboard row**: grid `24px 1fr 30px 56px 48px`, gap 8px. Rank mono muted; leader's rank in accent with a faint accent row wash. Name 12.5px + 6px team dot. Score 13px mono 700; S/M muted. Header row = mono 8.5px uppercase muted. Season tabs = pill row, active pill solid accent with dark text.

**Team tug bar** (Teams/leaderboard header): both team scores flanking an 8px two-segment bar, widths proportional to score, amber vs sky gradients, 2px gap.

**Live banner**: accent-tinted card (8% bg, 25% border), pulsing 7px lime dot (1.6s opacity pulse), "LIVE — n of 12 legs settled", right mono timestamp. Same shell reused for the pick-window countdown (Enter Pick header chip).

**6/6 banner** (gameweek detail): gold gradient tint bg, gold 40% border, "VDL WENT 6/6" display type + "Winning odds doubled this gameweek", big ×2 mono right. Winning rows that week carry the small ×2 gold chip after their market odds — never show mutated odds.

**Settle toggle** (admin): paired 30×26px W/L pills; W active = `win-solid`, L active = `loss-solid`, inactive = hairline border + muted text.

**Inputs**: `surface-2` bg, 1px border rgba(255,255,255,.14), radius 10px, 13px 14px padding, 15px text. Overline label above. Odds = − / value / + stepper, value mono 24px. Disabled/conditional (second team when method=WIN) = 40% opacity + dashed border + helper text. Segmented method control: active = accent 10% bg + 1.5px accent border + #D8F58C text.

**Primary CTA**: full-width solid accent, dark text 700, radius 12px, 15px vertical padding, soft accent glow shadow. One per screen. Secondary/ghost = hairline border, muted text.

**Tab bar**: `surface-2`, hairline top border, 5 items: This Week · Table · Pick (raised 44px accent circle, −18px overlap) · GWs · You. Active = accent, inactive = muted. Icons 20px, 2px stroke, labels 9.5px.

**Stat tile** (profile): surface card, overline label + mono 22px value. Highlight tile (the player's headline stat) gets an accent border + accent value.

## 4. Screen notes

- **This Week**: app bar (wordmark "THE ACCA" + mono lime "26/27"; right GW chip) → live/countdown banner → VDL card → JHP card → tab bar. Pre-close the banner is the countdown ("Window open — closes Fri 8:00 PM · hh:mm:ss"); Saturday it flips to LIVE with settle progress.
- **Leaderboards**: title → season pill tabs → team tug bar → 12-row table → form grid + legend. All Time tab ranks by S/M (see build spec §4) — keep both columns.
- **Enter Pick**: method segmented → selection → second team (enabled iff BTTS) → odds stepper with "Minimum 1.50 · odds lock at submission" helper → rules info card (public-on-submission + odds-movement) → Lock it in CTA → "Editable until Fri 8:00 PM" → team progress row (filled vs dashed avatar circles).
- **Gameweek detail**: back + "GW n · SAT d MMM" + status chip (SETTLED green / OPEN lime / CLOSED muted) → 6/6 banner when earned → per-team groups with overline "VDL — WEEK SCORE 20.68" in team colour → settle rows (admin sees toggles; players see result chips) → dashed adjustments card with "+ Add".
- **Player profile**: avatar + Saira name + team chip + "n entries · since Season x" → 2×2 stat tiles (All-time score, S/M w/ rank, Wins w/ %, Streak) → method split bars (Win bar sky, BTTS bar gold) → head-to-head selector row → recent picks list (mono date, selection, odds coloured by result) → ghost "Rival roast" button.

## 5. Don'ts

- Never colour-code anything green/red that isn't a result; lime is for live/action, not wins.
- Never display doubled odds as the pick's odds — market odds + ×2 chip only.
- No emoji, no rounded left-border accent cards, no third background colour.
- Don't drop the pending hollow-circle state — three visually distinct settle states (won/lost/pending) at all times.
