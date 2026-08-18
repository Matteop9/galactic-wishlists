# Dynasty strategy canon

Distilled from 25 Dynasty Domain transcripts (`transcripts/`, researched 2026-08-17). This is the
authoritative source for verdict and buy-target logic. Player names in the transcripts are evidence
only — the rules are what matter. Engine keys referenced where a rule is implemented.

## The master rules

1. **Every verdict is conditional on team direction and price.** "It's not about the player, it's
   about the price" — and the same player is a Sell on one roster and a Hold on another. The engine
   must never emit a verdict without checking direction first (`verdicts.ts` is direction-first).
2. **Production wins leagues; value builds them.** Contenders optimise weekly production; rebuilds
   optimise value growth. Everything below follows from that split.
3. **We play dynasty in 2–3 year windows, max.** Age penalties are windowed, not linear — a 26–27
   year old elite producer is fine inside a contender's window.

## Player categories (transcript taxonomy → engine archetypes)

| Transcript category | Engine mapping | Notes |
|---|---|---|
| Cornerstone / Foundational | high-value Youth asset / young Prime | value ceiling realised or nearly; never sold at a discount |
| Upside premier / upside shot | Youth asset (bench) | unproven youth; the fuel of a rebuild |
| Mainstay | Prime, balanced | value plateaued — can't rise much, hard to fall |
| Productive vet / short-term league winner | Win-now vet | production > price; contender gold, rebuild poison |
| Declining | Declining (position-aware age + negative trend) | value only goes one way |

## Verdict matrix by direction

### Contender
- **Hold ageing producers who start.** The Henry rule: "you sold him at value ceiling four years ago
  and for four straight years he's given you flex-level production that would win you a
  championship." Production outweighs value bleed while contending. *Contenders do not sell older
  RBs who start.* Sell an ageing vet only when he does not crack the lineup.
- **Buy** cheap production: productive vets and short-term league winners into flex spots (flex RBs
  over WRs), prime producers priced below their scoring. Every buy must raise the weekly ceiling of
  the starting lineup — else pass.
- **Young bench stashes**: fine to hold if cheap ("not affecting your week-to-week upside"); if a
  bench youth asset carries real value, up-tier it into a starter upgrade — consolidate, never
  discount, and never sell into a value dip (`contenderYouthConsolidateMinValue`).
- **Picks**: trade projected-late future 1sts for insulated proven starters; never a 1st for an
  ageing short-term league winner (that's a 2nd's price); hold early-projected 1sts.

### Rebuilding
- **Hold all youth, full stop.** Bench time is irrelevant — a 22-year-old rookie WR4 is the plan,
  not depth. "Do not sell low and do not freak out when they don't produce right away." Youth
  assets are never flagged as duplicate depth (`verdicts.ts` hard rule).
- **Sell every realised-ceiling asset**: productive vets, short-term producers, ageing RBs
  (for future 1sts — the market prices hyped future picks above ageing producers), and prime
  players whose value is production-backed (redraft-dominant). Timing: sell into August/September
  when contenders panic-buy points.
- **…but only if the market actually pays.** A wrong-phase player below `minSellValue` fetches
  nothing — selling him is a favour to the buyer. He becomes a free temporary hold: watch for a
  value pop, cut only when the roster spot is needed (Matteo's middling-TE case, 2026-08-17).
- **Buy** upside: cheap youth, players with downside already priced in, injury-dip young assets,
  picks from contenders. Filter: "could this player decrease in value? Then no."
- **Guardrail**: don't hold *only* unproven assets — value ceiling high, value floor zero.
  Diversify into proven young pieces.

### Ascending (reload)
- Hold/buy youth and prime pieces with unrealised ceilings; hold picks to maturity.
- Sell mainstays and productive vets sitting on the roster — they only bleed value while you wait.
  Exception: the deliberate push year, when the reload converts to contending.

### Mushy middle
- The worst place to be. Pick a lane, then apply that lane's rules. Take clear value wins whichever
  direction they point. High production share + low value share + no picks → contend now or swap
  30s producers for 23–26 proven producers.

## Age and position curves (`decliningMinAgeByPosition`)

- **RB**: current era is "the second golden age of running backs" — elite RBs are startable value
  into 27–28; receiving-back profiles age best. Direction decides the verdict: contender holds for
  production, rebuilder sells before the season for a 1st. Cliff ≈ 28.
- **WR**: elite value holds to ~26, market reprices at 27–28; no 28+ WR lives inside the top ~5
  rounds. Sell-before-the-cliff point ≈ 26–27 *for value purposes only* — contenders still hold
  producers. Cliff ≈ 28.
- **QB**: age matters least; elite QBs are illiquid; cheap veteran fringe-QB1s are the efficient
  buy in superflex. Cliff ≈ 33.
- **TE**: holds value longest; elite TEs are luxuries, never essential; young TEs are premier cheap
  stashes (hype alone moves them). Cliff ≈ 31.

## Depth rules

- **Depth is league-structure-relative.** A position's startable count = dedicated slots + every
  flex slot the position can fill (SUPER_FLEX counts as a QB slot in superflex). In a 2RB + 3FLEX
  lineup, five RBs can start at once — the 4th and 5th RB are starting depth (byes, injuries,
  matchups), not trade bait. Duplicate-depth sells only apply beyond startable + `depthSellSpareSlots`
  (`startableCount` in lineup.ts).
- Only ~15 roster spots matter (starters + 3–4). Consolidate bench value up-tier; don't down-tier
  stars for depth.
- Depth worth keeping: **backup QBs** (value pops the moment they start — never depth-sold,
  `depthSellExcludePositions`), handcuff/committee RBs, young TEs. Late-round WR depth is the cut.
- Duplicate-depth sells never apply to youth assets on any direction.

## Picks

- Picks are value-insulated while they're picks; future 1sts appreciate toward the draft.
- Value a future 1st by projected slot (early/mid/late from the owing team's standing — implemented
  in `picks.ts`). Late 1st ≈ mainstay-tier player; 2nd ≈ ageing short-term league winner.
- Never trade a cornerstone for picks alone; never trade picks for bundles of junk (but package
  your junk *for* picks).

## Market timing (the value calendar)

- **Post-title week → June**: buy ageing producers cheap (everyone gets cute and rebuilds).
- **August–September**: sell ageing producers to point-hungry contenders; buy young non-Year-1
  producers ("redraft brain" discounts them).
- Buy pre-catalyst: injury returns, year-2 bounce-back names, rookie RB/TE camp-hype archetypes,
  suspension/legal panic discounts. Sell post-catalyst / into positive press.
- Camp noise (first-team reps, beat-writer hype, coach speak) moves price, not production — trade
  on it, don't rank on it. A top-5 pick behind veteran camp noise is a hold: teams don't bench
  their capital.
- TD-inflated seasons (≥14 TDs) are sell-highs; yardage-driven scoring is sustainable.
- The vacated-volume fallacy: a backup inheriting a departed star's volume almost never produces at
  the projected level — fade as buyer, exploit as seller.

## Mistakes the engine must not make (regression list)

1. Selling a young bench asset on a rebuild as "duplicate depth" (Matteo's 22-year-old rookie WR
   case, fixed 2026-08-17).
2. Telling a contender to sell an ageing RB who starts (the Henry rule).
3. Selling any young asset while its 30-day trend is negative (selling the bottom).
4. Recommending a contender buy that doesn't raise starter value.
5. Recommending an ascending/rebuilding team buy ageing vets.
6. Depth-selling backup QBs in superflex.

## Training log

Verdict disputes from the app (v0.4.0 training feature) land here once processed. When Matteo
pastes a training report into a session: decide whether a threshold or a ladder rule is wrong,
apply the correction (`config/thresholds.json` for numbers, `src/lib/engine/verdicts.ts` for
rules), add a regression case to `tests/verdicts.test.ts` reproducing the disputed situation, and
record the decision below — one line per dispute, newest first. If the dispute is wrong on the
strategy merits, record it as `rejected` with the reasoning instead of changing the engine. Never
regress the hard rules above.

Format:
`- YYYY-MM-DD — {player} ({league}) — disputed {engine verdict} → {user verdict} — change: {thresholds key or ladder rule, or "rejected: why"} — test: {test name}`

- 2026-08-17 — sell floor (session feedback) — a wrong-phase player worth next to nothing was
  still flagged Sell (middling TE on a rebuild, "selling for absolutely nothing") — change:
  `verdicts.minSellValue` (600): any non-depth Sell below it becomes a temporary hold with
  watch-for-a-pop copy — test: "temporary hold, not a sell for scraps" in tests/verdicts.test.ts.
- 2026-08-17 — depth threshold (session feedback, all leagues) — disputed the fixed "3rd at position
  = depth" rule: in 2RB + 3FLEX lineups the 4th–5th RB often starts — change: depth-sell threshold
  now derived from league structure (`startableCount` in lineup.ts: dedicated + eligible flex
  slots; `depthSellSpareSlots` replaces `sellDuplicateDepthMinCount`) — test: "depth is
  league-structure-relative" suite in tests/verdicts.test.ts.
