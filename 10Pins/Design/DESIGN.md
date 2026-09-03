# 10 Pins design system: The Scoresheet

Identity built from the paper bowling scoresheet: ruled hairlines, boxed numerals, right-aligned totals, grease-pencil red and ballpoint blue. Light-first. This file is the contract; when in doubt, do the plainer thing.

## Colour roles

Light (default):
- `--paper: #F7F3EA` app ground
- `--sheet: #FBF8F1` scoresheet / card fill
- `--card: #EFEADD` raised paper (own-row highlight, active nav)
- `--ink: #201E1A` text, rules, primary buttons
- `--ink-faded: #5C574C` secondary text (6.2:1 on paper)
- `--hairline: rgba(32,30,26,0.18)` internal rules
- `--red: #B3372B` strikes, high games, "hot", destructive
- `--blue: #2C4E9E` spares, averages, "steady", links
- `--disabled-bg: #CFC9BA`, `--disabled-fg: #6E6A5F` (never opacity)

Dark (via `prefers-color-scheme`, plus manual override in Profile):
- `--paper: #171511`, `--sheet: #211E18`, `--card: #2A2620`
- `--ink: #ECE6D9`, `--ink-faded: #A39B8B`
- `--hairline: rgba(236,230,217,0.16)`
- `--red: #E4574A`, `--blue: #8FA7E8`
- No glow, no elevation shadows. Dark is a theme, not the default.

Colour rules: red and blue only ever mean hot/steady. Everything else is ink. No gradients, no coloured card borders, no glass.

## Type

Two faces only:
- **Oswald** 500/600: scores, headings, wordmark. `font-variant-numeric: tabular-nums` is mandatory on every number.
- **Source Sans 3** 400/600: body, labels, buttons. Sentence case everywhere; no all-caps labels, no monospace.

Scale (px): 96 score entry · 84 hero numeral · 44 head-to-head · 30 boxed numeral · 24-26 strip total / h1 · 18-20 h2 / row numeral · 15 body · 13 small · 12 caption. Body contrast >= 4.5:1, large numerals >= 3:1, both themes.

## Radius (exactly five steps)

- r0 = 0: scoresheet strips, boxed numerals, stat tiles, tables
- r1 = 2px: inputs, segmented controls
- r2 = 6px: chips, buttons, toasts
- r3 = 16px: bottom sheet top corners
- r4 = full: avatars, FAB, home indicator

Cards/strips, chips and buttons deliberately do NOT share a radius.

## Spacing

4px grid: 4, 8, 12, 16, 20, 24, 32, 48. Touch targets >= 44x44pt, >= 8px apart. Safe-area insets honoured (`viewport-fit=cover`). Tab bar hides on scroll-down, restores on scroll-up.

## The frame-grid primitive

One structure reused everywhere (feed post, leaderboard, stat tiles, quick add, player page):
- Outer border 1.5px ink, fill `--sheet`, radius 0
- Header row: player (Oswald 600) + meta (faded) + total right-aligned (Oswald 600, large)
- Ten-frame grid: `grid-template-columns: repeat(10, 1fr)`, hairline internal rules; two ball cells top-right per frame, cumulative total beneath
- Marks: X in red, / in blue, pin counts in ink, misses as `-`
- Quick-added games render header row only, labelled "Quick add, totals only"
- Empty states are the same box with dashes and the actions inside it, never a floating headline

## Components

Tab bar (5 slots, centre FAB) · segmented control (r1, ink fill on active) · chip (r2, ink fill on active) · scoresheet strip · boxed numeral (r0, 1.5px border) · leaderboard row (own row: `--card` fill + 3px ink left border, no glow) · bottom sheet (r3 top, grab handle) · form field (r1, label above, "optional" inline lightly) · empty state (dashes in boxes) · toast (r2, ink fill).

## Icons

One stroke set (Lucide), 1.75px stroke, matched to body weight. No emoji as icons or in copy, ever.

## Motion

Functional only: frame fills in, score counts up once on first render, sheet slides. All behind `prefers-reduced-motion`. No looping or decorative animation.

## Copy

British English. Short, plain, the voice of a mate who keeps the scores. Sentence case labels. Say what the thing is: "Season average", "High game", "Games played". Dates read as dates ("Today, Tue 2 Sep"). No em dashes (commas or full stops). Banned: "Nothing here yet", "takes ten seconds", "lands here", "let's get started", exclamation-mark enthusiasm.

## Don't

- No purple, gradients, glows, glass
- No coloured left/top borders on cards (own-row marker is the one sanctioned ink border)
- No Inter, no Oxanium, no third typeface
- No emoji
- No stat banner rows, numbered onboarding, icon-on-top feature cards
- No hero, landing or marketing sections
- No `opacity` for disabled states
- No all-caps or monospace labels
