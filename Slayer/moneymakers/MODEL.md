# Money maker variance + effort model (spec, v0.1, 5 Nov 2026)

Owner: Matteo (OSRS IGN Hahap). Purpose: rank every method on the wiki Money making guide by
expected profit, luck dependence, human effort and human skill. Provenance tags as per Slayer
CLAUDE.md: every number is read / derived / assumed.

## Inputs per method (read from wiki)
- name, guide URL, category (wiki), intensity (wiki, Low/Moderate/High if present)
- skill requirements (name + level), other requirements (quests, items), members flag
- inputs: list of (item, qty_per_hour, unit_price)
- outputs: list of (item, qty_per_hour, unit_price)
- hourly_profit (wiki) = sum(outputs) - sum(inputs). Recompute and flag if |diff| > 2%.

## Variance (derived)
Treat each output item as a Poisson count per hour with rate lambda = qty_per_hour and
value v = unit_price. Inputs treated as deterministic (consumables scale with time, not luck).
- var_hour = sum(lambda_i * v_i^2) over outputs
- sd_hour  = sqrt(var_hour)
- cv       = sd_hour / hourly_profit   (coefficient of variation; the "luck" number)
- luck_share = profit from outputs with lambda < 1 per hour / total output value
- hours_to_90 = hours needed before realised gp/hr is within +-10% of expectation at ~95%
             = (1.96 * cv / 0.10)^2   (Poisson relative sd shrinks with sqrt(hours))
Caveat printed on report: Poisson overstates variance for deterministic yields (e.g. 1 bar per
smelt) and understates it for lumpy rolls (e.g. 1/5000 pet-style drops bundled into one line).
Items with qty >= 100/hr are near-deterministic and contribute little; that falls out naturally.

Luck bands (assumed): cv < 0.10 steady | 0.10-0.35 some luck | 0.35-1.0 lucky | > 1.0 lottery.

## Effort (derived, 1-5)
Base from wiki intensity: Low=1, Moderate=3, High=5 (assumed mapping). If intensity missing,
derive from category: Collecting/AFK combat=2, Processing=3, Combat=3, Skilling=3, PvM boss=4.
Adjust +1 if the guide text mentions "click-intensive", "tick manipulation", "prayer flick",
"3-tick", "1-tick"; -1 if it mentions "AFK". Clamp 1-5.

## Human skill (derived, 1-5), distinct from in-game level
1 = anyone (buy/sell, collecting, basic processing)
2 = simple combat or skilling with a routine
3 = mid PvM (GWD, Zulrah-tier, Barrows), tick-based skilling
4 = hard PvM / mechanics (DT2 bosses, Nex, Cerb, Hydra, Nightmare, Gauntlet)
5 = raids, Inferno/Colosseum, ToB, CoX speed, Phosani, Doom
Assign from a boss keyword table in `data/skill_tiers.json` (assumed, editable). Unknown
combat method defaults 2, non-combat 1, with "tick"/"manipulation" bumping +1.

## Ranking
Primary table sorted by hourly_profit; columns: method, gp/hr, sd/hr, cv, luck band, luck_share,
effort, skill, category, req skills, members. Secondary views: by effort band, by skill band,
and "risk-adjusted" = profit - 0.5 * sd (assumed penalty; flag as a judgement call).

## Output
`moneymakers/report.md` + `report.json` + `data/methods_<date>.json` (never overwrite prior
snapshots) + `data/raw/` cache (gitignored) of wikitext per guide, dated.

## Refinements forced by the data (v0.2, 5 Nov 2026, recorded at build)

1. **Data source.** One bucket query (`money_making_guide`, Category:Worthwhile money making guides)
   returns all 524 guides (489 normal, 35 recurring) with structured inputs/outputs; no per-guide
   page scrape is needed. `value` = wiki headline profit. Per-hour qty = qty x default_kph when the
   guide is per-kill and the line is not `isph`, else qty. Recompute matched `value` within 2% on
   524/524 guides on the first run, so the recompute is a regression check, not a correction.
2. **Variance model `refined` (default; `variance.model` in config, `poisson` restores v0.1).**
   Pure Poisson made thin-margin processing guides look like lotteries (1,000 bars/hr at a 2%
   margin gives cv ~0.8 from a yield that is actually fixed). So:
   - per-kill drop with p < 1 per kill: Bernoulli per kill, var/hr = kph x p(1-p) x v^2 (equals
     Poisson for rare drops; Maggot King moves 3.162 -> 3.158);
   - per-kill qty that is a whole number >= 1: guaranteed drop, var 0;
   - per-kill qty non-integer > 1 (averaged stacks): Poisson on the hourly rate;
   - per-hour lines at >= 20/hr (`deterministic_rate_per_hour`, assumed): production, var 0;
     below that, Poisson (pet/seed/clue-style rolls in skilling guides).
   Pure-Poisson sd/cv are still written to report.json (`sd_poisson`, `cv_poisson`).
3. **luck_share** uses rate < 1 per hour (per run for recurring) as "rare", per spec.
4. **Recurring guides.** `value` is per run; `time` is minutes of play per run. gp/hr of play =
   value x 60 / time (the wiki's own conversion). Variance is computed per run. They are reported
   only in their own section.
5. **Effort.** All 489 normal guides carry intensity, so the category fallback only fires for
   recurring guides. `--details` pulls wikitext 50 titles per request (11 calls, not 524) and
   applies the +-1 keyword rule to the whole guide wikitext; "not AFK"/"non-AFK" style negations
   are stripped first. Spec text "3-tick/1-tick" extended with "2-tick", "tick perfect".
6. **Human skill.** Keyword match is whole-word with optional plural `s` (so "demonic gorillas"
   hits "demonic gorilla"); regular hydras are not the Alchemical Hydra. Tick keywords lift a
   method to tier 3 (not +1), per the brief. Unknown content (Fractured Archive) is tiered 4 and
   flagged unverified in the report.
7. **Re-pricing** (`--reprice`): gemw lines re-priced at the live mid of high/low; output tax 2%
   floored, only if price > 49, capped 5m; the tax-exempt list is ignored. Manual `value` lines
   keep the wiki number. sd/cv stay on wiki prices (variance is a shape measure; the drift is
   small next to the Poisson approximation).
8. **Snapshots.** `data/methods_<date>.json`; a second run the same day with different content
   writes `methods_<date>_<HHMMSS>.json`, identical content is not rewritten.
