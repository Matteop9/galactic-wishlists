# HandymanPlan — visual redesign brief ("Site Notebook")

Instructions for updating `index.html` to the new design, and rules for building
any new page/tab so it looks like it belongs.

**Reference implementation:** [`redesign/index.html`](redesign/index.html) — the
existing v0.1.1 app with the new theme already applied (JS logic untouched apart
from the four small edits listed in §2). Open it side by side with the old file;
when in doubt, copy from it verbatim.
**Stylesheet source:** [`redesign/theme.css`](redesign/theme.css) — the same CSS
as a standalone file, for diffing.

---

## 1. The direction

A tradesman's job book crossed with an architect's drawing.

- **Ink on bone paper.** Warm off-white `#EFEAE0` page, card stock `#FBF9F4`
  panels, near-black ink. A blueprint grid at 5% opacity sits under everything so
  the page never feels like flat white.
- **Rules, not shadows.** Hairline 1px borders and dividers do the structural
  work. The only shadow is a hard offset "printed card" one on things you can
  click (property cards, modals) — no blur, no glow.
- **Sharp corners.** 2–3px radius everywhere. Nothing is pill-shaped any more.
- **Mono micro-labels.** Every label, table header, button, tab and chip is
  IBM Plex Mono, uppercase, ~10–11px, letter-spaced. This one habit carries most
  of the aesthetic.
- **Figures are the hero.** Money and counts are set in Bricolage Grotesque 800,
  tight tracking, tabular numerals.
- **One signal colour.** Safety orange `#C6431A` = action, alert, "here you are".
  Navy `#1E3247` = structure (the sidebar). Everything else is a muted earth
  status colour used only in tints.
- **Nav moved.** Top pill bar → fixed navy sidebar (236px), which collapses to a
  fixed bottom rail under 860px.

Copy tone stays exactly as it is: dry, practical, second person, opinionated.
The app is allowed to tell you a deal is "not worth the dust".

---

## 2. Applying it to the existing base

Five mechanical edits to `index.html`. Nothing else in the JS changes.

1. **Fonts + theme colour** — in `<head>`, before `<style>`:
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
   <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
   <meta name="theme-color" content="#1E3247">
   ```
   Offline still works — the fallback stack is Segoe UI / Helvetica / system
   mono, and no layout depends on the webfont metrics.

2. **Replace the whole `<style>` block** with `redesign/theme.css`. All custom
   property *names* are unchanged (`--panel2`, `--line`, `--accent`, `--olive`,
   and the `*-soft` pairs `STAGE_COLORS` reads), so every inline `var(--x)` in
   the JS keeps working — only the values moved.

3. **Header markup** — the sidebar needs a brand block and a footer note:
   ```html
   <header>
     <div class="head-inner">
       <div class="logo" onclick="go('dashboard')">
         <span class="mark">HP</span>
         <span class="wordmark">Handyman<b>Plan</b></span>
       </div>
       <nav id="nav"></nav>
       <div class="sidefoot">
         <div class="sidefoot-k">Job book &middot; v0.1.1</div>
         <div class="sidefoot-v">Buy it, fix it, sell it, drive on.</div>
       </div>
     </div>
   </header>
   ```
   `#nav` is still filled by `renderNav()` — untouched. Keep the `sidefoot-k`
   version string in step with `CHANGELOG.md`.

4. **Two JS string edits** (presentation only):
   - `PROP_TABS` labels lose their emoji (`'💶 Deal'` → `'Deal'`) — the sub-tabs
     are mono uppercase now and the emoji fought the type. Country flags stay;
     they carry information.
   - the stage `<select>` in `vProperty()` gets the mono treatment:
     ```
     style="border:1px solid var(--ink);border-radius:2px;padding:8px 10px;font-family:var(--mono);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.09em;background:var(--panel);color:var(--ink)"
     ```

5. **Favicon + footer** — favicon becomes an orange `HP` stamp (SVG data URI, in
   the reference file); footer shortens to
   `Data lives in this browser only — export a JSON backup from the Data tab.`

Regression checklist after the swap: sidebar active state on all five tabs ·
property detail with all six sub-tabs · a modal (focus ring, half-width field
pairs, delete button on the left) · over-budget bar turning orange · 375px wide
(bottom rail scrolls, nothing clipped, inputs still 16px so iOS doesn't zoom).

---

## 3. Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#EFEAE0` | page (plus the blueprint grid background-image on `body`) |
| `--panel` | `#FBF9F4` | panels, cards, buttons, inputs-on-paper |
| `--panel2` | `#E7E1D4` | recessed wash: table group rows, tag backgrounds |
| `--ink` | `#181A17` | text, borders on emphasis, button outlines |
| `--muted` | `#6B6C63` | secondary text, all micro-labels |
| `--line` | `#D8D1C0` | hairline borders and dividers |
| `--line-strong` | `#BDB49C` | table header rule, input borders, checkbox outlines |
| `--navy` / `--navy-2` | `#1E3247` / `#2B4560` | sidebar, modal scrim |
| `--accent` / `--accent-soft` | `#C6431A` / `#F7DFD5` | the signal: primary buttons, active tab, over-budget, links |
| `--olive` / `-soft` | `#4E6B36` / `#E2E8D3` | progress fill, DIY tag, "ours" |
| `--amber` / `-soft` | `#9C6E14` / `#F4E5C6` | in progress, warnings, stars |
| `--green` / `-soft` | `#3B6B44` / `#DBE7DB` | done, sold, positive money |
| `--red` / `-soft` | `#A32A20` / `#F3DAD5` | destructive, negative money, dropped |
| `--blue`, `--teal`, `--purple`, `--grey` (+ `-soft`) | — | stage chips only |
| `--radius` | `3px` | panels/cards. Controls, chips and tags use `2px` |
| `--hard` | `3px 3px 0 rgba(24,26,23,.10)` | clickable card offset |

Rule of thumb: **solid = text or fill, `-soft` = tint background.** Every
solid/soft pair is legible as text-on-tint (that's how `STAGE_COLORS` works).
Don't add new hues; if you need another category, reuse `--grey`.

---

## 4. Type

| Role | Font | Spec |
|---|---|---|
| Page title `h1` | Bricolage Grotesque 800 | 34px / -0.025em (27px mobile) |
| Section `h2`, card names, skill titles | Bricolage Grotesque 700 | 15–19px / -0.015em |
| Big figures `.stat .v` | Bricolage Grotesque 800 | 30px, tabular nums |
| Body, table cells, notes | IBM Plex Sans 400/500 | 14–15px / 1.55 |
| Money in tables `.money` | IBM Plex Sans 600 | tabular nums |
| Labels, `th`, buttons, tabs, chips, tags, `.jd`, `.backlink`, footer | IBM Plex Mono 500/600 | 10–11.5px, UPPERCASE, 0.09–0.13em tracking |

Display face is for names and numbers only — never for sentences. Sentences are
never uppercase. Nothing goes below 10px.

---

## 5. Components (all class names unchanged)

- **`.panel`** — 1px `--line`, 3px radius. Its `h3` is a mono uppercase kicker
  with a full-bleed rule under it (negative side margins do the bleed); keep
  `h3` inside a `.row` when it needs a right-hand button.
- **`.cards` / `.stat`** — one bordered slab divided by hairlines, not floating
  boxes: label (mono) → figure (display) → one line of context.
- **`.prop-card`** — the only element with the hard offset shadow; hover lifts
  `-2px,-2px` and the shadow goes orange.
- **`.btn`** — mono uppercase, 1px ink outline, inverts to ink-fill on hover.
  `.primary` = orange fill (one per view, the main action). `.ghost` = cancel.
  `.danger` = red outline → red fill. `.tiny` for in-panel actions.
- **`.chip`** — 1px `currentColor` border + tint background, mono 10px. Stage
  chips get their colours from `STAGE_COLORS`; don't hard-code.
- **`.bar`** — ruler ticks in the track (repeating gradient), solid olive fill,
  orange `.over`. 8px tall, 1px radius.
- **`.subtabs`** — an underlined tab strip: 2px orange bottom border on `.on`,
  no pills.
- **`.task .tstat` / `.sdot`** — square 2px-radius toggles: empty → amber tint →
  solid green. Hit area stays ≥40px via the `::before` bleed / padding.
- **Tables** — mono uppercase `th` over a `--line-strong` rule, hairline rows,
  `.num` right-aligned tabular, row hover 2% ink wash. Wrap in `.tablewrap`
  (negative margins so it bleeds to the panel edge on mobile).
- **`.field`** — mono uppercase label, 1px `--line-strong` input, focus =
  orange border + 3px `--accent-soft` ring. Inputs stay 16px (iOS zoom).
- **`.alert`** — tint background, 3px left bar in the status colour.
- **`.legend`** — dashed border box, mono, above whatever it explains.
- **`.empty`** — one emoji at 34px/70% opacity, one sentence, then the action.
  Buttons in empty states are `.primary`.

---

## 6. Building a new page

### 6.1 A new top-level tab

1. Add it to `TABS` (`[['dashboard','Dashboard'],…]`) — label is a plain word,
   no emoji, the CSS uppercases it.
2. Add a `v<Name>()` view function returning an HTML string, and a branch in
   `render()`. Follow the existing pattern: pure string building, `esc()` on
   every user value, `commit()` after every mutation.
3. Reach the page with `go('<id>')`; anything nested uses the third argument
   pattern like `go('property', id, subtab)`.

### 6.2 Page skeleton

```html
<h1>Page title</h1>
<div class="sub">One line saying what this is for, in the app's voice.</div>

<!-- optional: alerts that need action, before anything else -->
<div class="alert red">…</div>

<!-- optional: 3–6 headline figures -->
<div class="cards">
  <div class="stat">
    <div class="k">Label</div>
    <div class="v">€41,610</div>
    <div class="d">what it's counting</div>
  </div>
</div>

<h2>Section</h2>
<div class="panel">
  <div class="row"><h3 class="grow">Panel title</h3>
    <button class="btn primary tiny" onclick="…">+ Add thing</button></div>
  <div class="tablewrap"><table>…</table></div>
</div>
```

Order is always: title → one-line `.sub` → alerts → figures → panels. Every
panel is either a table, a list of rows, or a short form — nothing else.

### 6.3 Rules for new pages

- **Use the existing classes.** If you need a new one, add it to the theme
  block, not inline — and check no existing class already does the job.
- **Inline `style=` is only for values the CSS can't know** (a bar width, a chip
  colour pair from `STAGE_COLORS`). Everything static belongs in a class.
- **Every empty state gets copy plus the action** that fills it.
- **Every mutation goes through `commit()`** so localStorage and the render stay
  in step; every destructive action confirms.
- **Every new form field** goes in a modal via `openModal()` (use `half:true`
  pairs for related numbers) — no inline editing patterns.
- **Numbers:** money through `money()`, percentages through `pct()`, dates
  through `fmtDate()`. Anything numeric gets `.money` or `.num`.
- **Colour means status, never decoration.** Green = done/positive, amber = in
  progress, orange = attention/over, red = destructive/negative, olive =
  ours/DIY.
- **Mobile is the field device:** test at 375px, keep tap targets ≥40px, wrap
  tables in `.tablewrap`, never put the only affordance on a hover state.
- **Stay single-file and offline-capable** — no build step, no dependencies, no
  external images or icon fonts. Emoji only where it carries information
  (country flags) or in an empty state.

### 6.4 Things not to do

Rounded pills · drop shadows with blur · gradients as decoration · a second
accent colour · sentence text in the display font · uppercase sentences · type
below 10px · new spacing values (stick to 6/9/14/18/22/34) · icon-only buttons
without a `title` · anything that needs a network connection.

---

## 7. If you extend the design later

- **Dark mode:** flip `--bg`/`--panel`/`--ink`/`--line` under
  `@media (prefers-color-scheme: dark)`; the solid status colours need
  lightening ~15%, the `-soft` tints become ~12% alpha of the solid. The navy
  sidebar can stay as it is.
- **Print** (a property one-pager to hand a builder) is the obvious next
  addition: `@media print` — hide `header`/`footer`/buttons, drop the body grid
  and card shadows, set `main{margin:0}`, and let panels break `avoid`.
- **A dashboard chart** (spend over time) should be inline SVG drawn with
  `--olive`/`--accent` on hairline `--line` axes, mono uppercase labels, no
  gridlines other than hairlines.
