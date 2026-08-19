# The Emblem Grammar
### Design brief for Claude Design — The Acca × Milky Bay honours emblems

Two sibling apps hang tiny trophies off players' names — champion stars in The Acca, crowns, wooden spoons and the poo of shame in Milky Bay. Both systems grow every season and both are near the edge of their current grammar. This brief asks for **one emblem family that can absorb the next five-plus seasons without eating the name it decorates**.

All path data below is taken verbatim from production (`src/components/ChampStars.tsx` in JHH Acca, `src/components/Honours.tsx` in Milky Bay).

---

## 01 — The system today

### The Acca (jhh-acca.vercel.app · "Friday Night Slip" theme, surface `#121712`)

One emblem per colour, and it **evolves** instead of repeating: win count changes the silhouette. Gold = won a season outright; silver = was on the winning team. A player wears at most two emblems (their best gold tier and their best silver tier), so width is bounded — but the lineage dead-ends at tier 4, and season 7 starts Saturday.

| Tier | Silhouette | Meaning | viewBox |
|------|-----------|---------|---------|
| 1 | star | 1 season won | `0 0 10 10` |
| 2 | star in laurel wreath | 2 seasons won | `0 0 14 10` |
| 3 | winged star | 3 seasons won | `0 0 18 10` |
| 4 | winged star + wreath + chevron | 4+ seasons — **current ceiling** | `0 0 18 12` |

Silver lineage: identical tiers, `--color-silver` instead of `--color-gold`.

Star path (parameterised on centre `cx`):

```
M{cx} 0 L{cx+1.12} 3.45 L{cx+4.76} 3.45 L{cx+1.82} 5.59
L{cx+2.94} 9.05 L{cx} 6.91 L{cx-2.94} 9.05 L{cx-1.82} 5.59
L{cx-4.76} 3.45 L{cx-1.12} 3.45 Z
```

Tier 2 adds two wreath arcs (`stroke-width 1.1`, round caps); tier 3 adds three feather strokes per side (`stroke-width 1`); tier 4 adds a chevron below (`M{cx-2.4} 11 L{cx} 9.8 L{cx+2.4} 11`). See `ChampStars.tsx` for the exact arc/wing curves.

### Milky Bay (milky-bay.vercel.app · deep-bay theme, surface `#121826`)

One glyph per honour, **repeated**: two crowns for two titles, a spoon per last-place finish. Half variants (a half-filled glyph) mark the 22/23 half season. Separately, players who have never won a season wear a tiny 💩 hovering over the first letter of their name — a half poo if they've only ever won a half season. The poo is the only emblem that already lives *above* the name rather than beside it.

| Emblem | Meaning | Construction |
|--------|---------|--------------|
| Crown | 1 per season won — repeats | `M1 8.6 L0.6 2.6 L3.8 5 L6 0.8 L8.2 5 L11.4 2.6 L11 8.6 Z`, viewBox `0 0 12 10`, fill `--color-gold` |
| Half crown | Won the 22/23 half season | Same path, 50% horizontal linearGradient fill (gold → transparent) + outline stroke 0.7 @ 0.55 opacity |
| Wooden spoon | 1 per last-place finish — repeats | `ellipse cx=5 cy=3.4 rx=2.9 ry=3.4` + `rect x=4.1 y=6.2 w=1.8 h=7.4 rx=0.9`, viewBox `0 0 10 14`, fill `--color-spoon` |
| Half spoon | Last in the half season | Same, 50% vertical gradient fill + outline |
| Poo of shame | Never won a season | 💩 emoji at 7px, absolute-positioned centred over the first letter, inside the line box |
| Half poo | Only ever won the half season | Emoji clipped to its left half (`width: 0.62em; overflow: hidden`) |

---

## 02 — Where emblems are worn

| Context | Render height | Name size | Density |
|---------|--------------|-----------|---------|
| Leaderboard rows (both apps) | 10px | 13–13.5px bold | Highest — 12 rows on screen, name column is `truncate` |
| Pick entry / dense lists | 8px | 12px | High |
| Gameweek detail cards | 10px | 13px bold | Medium — emblem sits between name and status chips |
| Player profile header | 12px | ~22px display | Low — room to breathe |
| Poo of shame overlay | 7px | over first letter | Absolute-positioned inside the line box so row height never changes |

**The 10px leaderboard case is the design gate: an emblem that only reads at 12px doesn't exist.**

---

## 03 — The growth problem

Project each system three or four seasons forward and both break in different ways:

**The Acca** — the evolution lineage is star → star-in-wreath → winged star → winged star + wreath + chevron, then nothing. Tier 4 is the ceiling; a fifth title renders the same as a fourth. The grammar is good (silhouette growth beats glyph repetition) but it needs at least tiers 5–8 designed in the same language, for both gold and silver.

**Milky Bay** — repetition scales linearly in width. Honours are seeded back to 22/23, so a strong player already wears 2–3 crowns; add spoons and the emblem run starts fighting the truncated name for space today. A player with 2 crowns + half crown + 2 spoons + half spoon spends ~60px of a name cell that's often under 200px wide on a phone.

And the poo is an emoji — it can't take a theme colour, renders differently per OS, and its "half" state is a crude overflow clip. It deserves a drawn mark in the same family.

---

## 04 — The ask

Design one emblem family with three lineages — **star** (Acca), **crown + spoon** (Milky Bay), **poo** (Milky Bay) — that share a growth grammar, so a tier-3 anything reads as the same magnitude of achievement at a glance.

- [ ] **Star lineage, tiers 1–8, gold and silver.** Keep the shipped tiers 1–4 exactly as they are (players know them); design 5–8 as continuations of the same language — each tier must add *silhouette*, not detail, because detail dies at 10px. Think crest, rays, banner, laurels closing into a ring — your call, but monotonic: a tier-6 must look obviously "more" than a tier-5 even at 8px.
- [ ] **Crown lineage, tiers 1–8.** Migrate Milky Bay from repetition to evolution: one crown that grows with title count, in the same grammar as the star lineage. Repetition may survive up to 2 glyphs if tier-2-as-two-crowns reads better than any single mark — decide and be consistent. Must include a **half-crown** state at tier 1 (half-filled, currently a 50% gradient clip + faint outline) that composes with full crowns (e.g. 1 title + the half season).
- [ ] **Spoon lineage, tiers 1–8, plus half-spoon.** Same grammar, inverted dignity — spoons should grow more embarrassing, not more majestic. Colour stays `--color-spoon #c58a4a`.
- [ ] **Vector poo, full + half.** Replaces the 💩 emoji. Must read as a poo at **7px tall**, single fill colour (it should be able to take a CSS variable), and have a *designed* half state — not a clipped half. This is the hardest deliverable in the brief; if it needs two tones to survive 7px, propose the second tone.
- [ ] **A composition rule.** When a player wears multiple lineages (crown + spoon, gold + silver star), define order, gap, and optical alignment so mixed runs sit on one visual baseline. Today's order: gold, silver (Acca); crowns, half-crowns, spoons, half-spoons (MB).
- [ ] **The above-the-name variant** — see section 06. Each emblem should work both inline-beside-the-name and centred-above-the-name, so provide optical-centring guidance (the star tiers are asymmetric-height once the chevron appears).

> **Grammar over glyphs.** The single most valuable output is the *rule* that generates tier N+1 from tier N. Seasons keep coming; a rule scales, a sprite sheet doesn't.

---

## 05 — Constraints & handoff

| Constraint | Spec |
|-----------|------|
| Format | Hand-inlined SVG path data in React components. No image assets, no sprite sheets, no external files. Tight viewBox per emblem, integer-ish coordinates, one `<path>` or small group per emblem. |
| Colour | Single flat fill per emblem via CSS variable: `--color-gold #f2c94c`, `--color-silver #c0c8d2`, `--color-spoon #c58a4a`. No gradients except the established 50% half-fill mask. Must hold on both grounds: `#121712` (Acca) and `#121826` (Milky Bay). |
| Size floor | Legible at 8px render height, designed at 10px, comfortable at 12px. Test at 1× on a phone — no hairlines under ~1 viewBox unit. |
| Width budget | ≤ 2.2× height per emblem (the current tier-3/4 winged star is the max at 1.8×). A player's full emblem run should stay under ~48px at 10px height. |
| Baseline | All emblems in a run share a bottom edge; vertical accents (wreath arcs, chevrons) grow upward/downward from that shared line. |
| Meaning is load-bearing | Gold star ≠ silver star ≠ crown. These are different honours in different games; the lineages can rhyme but must not be confusable. |
| Delivery | Per emblem: name, tier, viewBox, path data, intended fill variable — plus a one-line description of the tier rule so tiers 9+ can be derived without the designer. |

---

## 06 — Layout lab: emblems above the name

Requested experiment: move all emblems from beside the name to **above** it, the way the poo already floats. Both apps' leaderboard rows were rebuilt faithfully (same grid, type sizes and colours as production) in three treatments and measured live in a browser:

| Treatment | Measured row height | Cost | Reads? |
|-----------|--------------------|------|--------|
| **A · Inline** (current production) | 38px | — | Yes — the baseline |
| **B · Stacked lane** (11px emblem lane above the name, inside the row) | 49px | **+11px / +29% per row** — and every row pays, including players with no honours, or row heights jitter | Yes, but the table loses ~1.5 rows of screen on a 12-man leaderboard |
| **C · Hover** (poo-style absolute overlay, no height change) | 38px | Free | Only up to ~2 glyphs; beyond that it reads as noise over the letterforms. Names are `truncate` (overflow hidden), so the overlay must stay inside the line box — the same constraint the poo already lives with |

### Verdict

- **Inline stays right for leaderboards.** The stacked lane costs ~29% row height across the densest screens in both apps; the hover treatment is free but tops out at about two glyphs before it fights the ascenders — fine for the poo (which is the joke: it hovers), wrong as the general rule.
- **Stack where there's air.** The profile header (and similar low-density spots like gameweek winner cards) is where above-the-name shines — emblems become a rank badge crowning the name rather than trailing punctuation.
- **Consolidation is what makes stacking viable.** A single tier-3 crown stacks; six repeated glyphs never will. Hence the section 04 requirement that every emblem works centred-above at 12–15px as well as inline at 8–10px.

---

*Sources: `ChampStars.tsx` · `Honours.tsx` · `index.css` (both apps). Row heights measured 19 Aug 2026 against faithful recreations of production rows.*
