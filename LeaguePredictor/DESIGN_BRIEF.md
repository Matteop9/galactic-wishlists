# Design Brief — **Spot On**

*A brand + asset brief for Claude Design. Everything you need is in this document — please produce the deliverables in the "Asset shopping list" section.*

---

## 1. What Spot On is

Spot On is a web game for groups of friends: before the football season starts, everyone predicts the **complete final league table** (every position, 1st to last) for competitions like the Premier League and EFL Championship, plus a **top scorer** for each. All season long, a live leaderboard scores each player — **1 point for every position you're off** on every team, **−5 bonus** if you called the top scorer — and the **lowest score wins**. It's a bragging-rights game between mates, played over WhatsApp-shared invite links, checked obsessively on phones after Saturday's results.

The name **"Spot On"** is a double meaning: league *spots* (positions) + *spot on* (exactly right). A perfect pick — predicted 7th, finished 7th — scores zero, and that's the moment the brand celebrates: **being spot on**.

## 2. Audience & tone

- 20s–40s football fans in friend groups of 3–10, UK-centric but not exclusively.
- Checked mostly on **mobile**, mostly in the pub / on the sofa during Soccer Saturday.
- Tone: **competitive banter, deadpan confidence, terrace wit**. Never corporate, never gambling-adjacent (no odds, no money styling, no casino energy).
- The core emotions: the smugness of a perfect call, the agony of your relegation pick winning the league, season-long tension of a live table.

## 3. Voice & copy flavour (for any text baked into assets)

- Strapline candidates (pick or improve): **"Call the table."** · "Every spot counts." · "Predict it. Then live with it."
- Microcopy style: "3 off — not bad" · "Nailed it. Zero." · "Your top scorer is currently 14th. Bold."
- British English throughout.

## 4. Product surfaces the design must serve

1. **Landing page** (hero + how-it-works + create/join CTAs)
2. **League leaderboard** — the heart of the app: a dense, readable table of friends' totals, expandable per-team breakdowns
3. **Prediction editor** — a draggable list of 20–24 team rows with crest, name, position number
4. **Invite card** — the link friends share into WhatsApp ("You've been invited to [league name] — call the table")
5. **Player detail** — one person's predicted table vs reality, with per-row diff chips (▲3, ▼7, ●0 spot-on)
6. Empty states (no leagues yet, predictions not in yet, season not started)

## 5. Asset shopping list (deliverables)

| # | Asset | Notes |
|---|-------|-------|
| 1 | **Logo / wordmark** | "Spot On" — consider a target/dot/position-marker motif (the "spot"). Must work at 24px favicon and full hero size. **SVG preferred.** Include a square app-icon variant |
| 2 | **Favicon / app icon** | Derived from the logo mark, legible at 16–32px |
| 3 | **Colour palette** | Full system: background, surface, text, muted text, primary, accent, plus **semantic trio** — "spot on / exact" (celebratory), "close" (mild), "way off" (bad) — used for diff chips ▲▼●. Provide **light AND dark mode** values as hex, WCAG AA contrast on text |
| 4 | **Font pairing** | One display face (headlines, big numbers) + one UI face (tables, forms). **Google Fonts only** (easy web embedding). Tables need tabular numerals |
| 5 | **Hero / landing background** | Evocative but quiet enough to sit behind text; also a subtler tileable/ambient variant for app pages |
| 6 | **Illustrations** | (a) trophy/winner moment, (b) empty-state "no leagues yet", (c) "waiting for the season" state. Consistent style, transparent backgrounds |
| 7 | **OG / share-card template** | 1200×630 — league name + "join my league" composition, space for 3–6 avatars/initials |
| 8 | **Invite card template** | Portrait-ish variant of #7 optimised for WhatsApp preview |
| 9 | **UI component mood board** | How a leaderboard row, a draggable team row, a diff chip (▲3 / ▼7 / ● spot on), and a "locked" state should feel |

## 6. Candidate visual directions (choose one, or blend — your call)

**A. Modern broadcast** — Sky-Sports-adjacent: deep navy/near-black, one electric accent (green or cyan), condensed sans display, sharp data-viz tables, subtle pitch-line geometry. Feels *live* and stats-first. Risk: generic if not pushed.

**B. Retro football annual** — vintage matchday-programme: cream paper, bold slab serif, pitch green + claret, badge/rosette shapes, halftone textures. Warm, nostalgic, great for illustrations. Risk: can feel twee; must keep tables crisp.

**C. Panini sticker album** — playful collectible energy: bright fields, sticker-style team rows with white die-cut borders, foil-effect accents for "spot on" moments. Most fun, most distinctive. Risk: harder to keep a 24-row data table calm and readable.

Whichever direction: **the leaderboard table is the product**. Density, scannability and number legibility beat decoration everywhere they conflict.

## 7. Technical constraints

- Assets consumed by a **Next.js/Tailwind** web app; colours will be wired as **CSS variables** — deliver the palette as a flat hex list with names (e.g. `--color-spot-on: #00E676`)
- Logo/illustrations: **SVG** where possible, PNG (2x) otherwise; transparent backgrounds
- Both **light and dark** themes will ship; dark is the expected default
- Fonts: Google Fonts names + weights only (no licence-restricted faces)
- Team crests come from an external API and will sit on our surfaces — palette must not clash with the full rainbow of club colours (neutral surfaces recommended)
- No gambling visual language (chips, cards, odds boards, neon casino)

## 8. Things that are already fixed (don't redesign)

- Name: **Spot On**
- Scoring language: points are *bad* ("1 off = 1 point"), zero is perfect, **lowest wins** — celebrate *low* numbers and the ● "spot on" moment
- The app ships first at `spot-on.vercel.app`; a custom domain may follow
