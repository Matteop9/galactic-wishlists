# Implementing The Scoresheet in `src/`

Companion to `DESIGN.md` (the contract) and `10 Pins Screens.dc.html` (the
screens). This is how the design system is expressed in this codebase. When a
screen file needs a look, it uses these and nothing else.

## Tokens (Tailwind class names)

The default Tailwind palette, radii, shadows and fonts are switched off in
`src/index.css`. Only these exist:

| role | class | notes |
|---|---|---|
| app ground | `bg-paper` | the page. Also the text colour on ink fills: `text-paper` |
| strip / card fill | `bg-sheet` | inside a strip |
| raised paper | `bg-card` | own leaderboard row, active rail item, focused frame, skeleton blocks |
| text, rules, primary buttons | `text-ink` `bg-ink` `border-ink` | |
| secondary text | `text-ink-faded` | meta, captions, inactive tabs |
| internal rules | `border-hairline` `divide-hairline` | 1px |
| input borders, soft strips, inactive chips | `border-rule` | |
| hot | `text-red` | strikes, high games, "you won", destructive text |
| steady | `text-blue` | spares, averages, links |
| disabled | `bg-disabled-bg text-disabled-fg` | never opacity |
| scrim | `bg-scrim` | behind sheets |

Fonts: `font-display` (Oswald 500/600) for numbers, headings, wordmark;
`font-body` (Source Sans 3 400/600) is the default. **Every number gets `num`**
(Oswald + tabular). Weights: use `font-medium` (500) or `font-semibold` (600)
only. Never `font-bold`, never `uppercase`, never `tracking-*` on labels.

Radius: `rounded-none` (strips, boxed numerals, tables, stat tiles), `rounded-r1`
(inputs, segmented controls), `rounded-r2` (chips, buttons, toasts, rail items),
`rounded-r3` (sheet top corners, use `rounded-t-r3`), `rounded-full` (avatars,
the add disc). Nothing else.

Spacing: 4px grid (`gap-1 … gap-8`, `p-3.5` = 14px is fine). Gutters: screens
use `px-4` (16px) for strips, `px-5` (20px) for headers and forms as the
screens do. Touch targets ≥ 44px.

## Type scale

| use | classes |
|---|---|
| score entry | `num text-[96px] font-semibold leading-none` |
| hero numeral | `num text-[84px]` |
| head-to-head | `num text-[44px] font-semibold leading-none` |
| boxed numeral / stat tile | `num text-[30px] font-semibold leading-none` |
| strip total / screen title | `num text-[24px] font-semibold` |
| section title / row numeral | `num text-[18px]` – `text-[20px]` |
| body | `text-[15px]` (default) |
| small | `text-[13px]` |
| caption / meta | `text-[12px] text-ink-faded` |

## Utilities (index.css)

- `strip` / `strip-soft`: the box. Prefer the `Strip` component.
- `label`: 13px semibold sentence-case label above a field. `optional`: the
  inline "optional" word, e.g. `<span className="label">Venue <span className="optional">optional</span></span>`.
- `field`: an input/select/textarea. `<input className="field" />`.
- `btn-primary`, `btn-secondary` (full size), `btn-primary-sm`,
  `btn-secondary-sm` (header and row actions), `btn-danger-text` (red text,
  destructive only).
- `chip`, `chip-active` (prefer `ChipRow`).
- Motion: `press`, `fade-in`, `rise-in`, `sheet-up`, `settle`, `progress-line`
  (only for work actually in flight). Nothing else animates.
- `no-scrollbar` for horizontal chip rows.

## Components (`src/components`)

- `Strip` (default export) + `StripHeader`, `StripRow`, `StripTitle`,
  `StatTile`, `StatCell`, `EmptyFrames` in `Strip.tsx`. A Strip's direct
  children are its rows; it draws hairlines between them.
  - Feed post / game: `<Scorecard players=[{ name, frames, meta, tone, total }] variant="compact|full|live|editing|share" />` renders one strip per player with the ten-frame grid.
  - A totals-only game: `<Strip><StripHeader title="Dan" meta="Quick add, totals only · Sat 30 Aug" right={158} /></Strip>`.
  - A group card: `<Strip><div className="flex items-center gap-3 p-3.5">…</div><div className="grid grid-cols-3 divide-x divide-hairline"><StatCell value={64} label="Games" /><StatCell value={144} label="Group average" tone="steady" /><StatCell value={214} label="High game" tone="hot" /></div></Strip>`.
  - A settings list: `<Strip>` of `<Link className="flex items-center justify-between px-4 py-3.5 text-[15px]">` rows with a `chevron-right` icon in `text-ink-faded`.
  - Leaderboard: `<Strip>` with a header row (`grid grid-cols-[34px_1fr_52px_56px_52px] px-3.5 py-[9px] text-[12px] text-ink-faded`) then rows in the same grid at `py-[13px] text-[14px]`; the rank `num text-[16px] font-semibold`, the ranked metric `num text-[17px] font-semibold text-blue` (average) or `text-red` (high game). Own row: `bg-card border-l-[3px] border-l-ink` and the word `you` after the name in `font-normal text-ink-faded`.
- `PageHeader` `{ title, sub, back, right }`: top-level screens (24px title, right action), sub-screens (`back` chevron, 22px title, `sub` line).
- `Sheet` `{ onClose, label, title }`: bottom sheet with grab handle.
- `ChipRow` `{ label, options, value, onChange, fill?, size? }`: chips, or with `fill` a segmented control (`size="sm"` for a secondary picker under a primary one).
- `EmptyState` `{ title, body, action, secondary, tone: 'page'|'inline'|'quiet' }`: the dashed strip. Always this, never a floating headline.
- `Avatar` `{ name, url, size, ring }`, `AvatarStack` `{ people, size, max }`.
- `Icon` `{ name, className }`: Lucide-style, 1.75 stroke. Names in `Icon.tsx`. If one is missing, use the nearest and note the gap in your report; do not edit `Icon.tsx`.
- `VerificationBadge` `{ status }`: renders plain faded text ("Scanned from photo", "Scored live", "Unverified"). Put it in a meta line, not a badge slot.
- `ReactionBar` `{ feedEventId, profileId, reactions }`: one chip, "Nice one · 3". `niceOnes(count)` gives "3 nice ones" for footers.
- `CountUp` `{ value }`: a numeral that counts up once on first render. Use for hero and stat-tile numbers.
- `Skeleton.tsx`: static, strip-shaped. Same exports as before.
- `Wordmark`, `PlayerLink`, `JoinQr`, `GroupPicker` (chips now), `Keypad`, `FrameEditor`, `WhatsNewCard`, `Celebration`, `UpdatePrompt` are done.
- `src/lib/theme.ts`: `useTheme()` → `[pref, setPref]` and `THEME_OPTIONS` for the Profile picker.

## Copy

British English. Sentence case everywhere. Short, plain, the voice of a mate
who keeps the scores. Say what the thing is: "Season average", "High game",
"Games played". Dates read as dates: "Sat 30 Aug", "Today, Tue 2 Sep". Use a
middle dot `·` to join meta ("Jersey Bowl · Sat 30 Aug").

Never: em dashes in copy (use a comma or a full stop), emoji, exclamation
marks, all-caps, "Nothing here yet", "takes ten seconds", "lands here",
"let's get started", "vibe", "crew" as a label. Errors are plain: "That didn't
save. Check your connection and try again."

## Don't

No `text-white`, `bg-black`, `opacity-*` for disabled, `shadow-*`, gradients,
`backdrop-blur`, coloured borders (`border-red` is allowed only around a
destructive confirmation, and even then prefer red text on a plain strip), no
`font-mono`, no `uppercase`, no `tracking-*`, no `rounded-card|control|chip|cell|sheet|xl|lg|md`,
no `label-caps`, no old tokens (`panel well glass phosphor signal dim faint
disabled mark line success text-text`). No icon-on-top feature cards, no
numbered onboarding, no hero or marketing sections.
