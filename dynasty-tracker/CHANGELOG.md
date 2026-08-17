# Changelog

## 0.3.0 — 2026-08-17

Verdict engine rework, driven by the `transcripts/` research (see `STRATEGY.md`):

- Direction-first verdict ladder: youth assets on rebuilding/ascending/middle rosters are always
  holds and are never flagged as duplicate depth (fixes the 22-year-old rookie WR "sell — 4th WR"
  bug).
- The Henry rule: ageing producers who start for a contender are holds — production outweighs
  value bleed while contending. Contenders now only sell ageing vets who don't crack the lineup.
- Youth classification is age-based (≤24) rather than requiring dynasty-vs-redraft dominance,
  which silently excluded most rookies.
- Position-aware age cliffs for the Declining archetype (`decliningMinAgeByPosition`: QB 33,
  RB 28, WR 28, TE 31).
- Contender bench youth: consolidate up-tier above `contenderYouthConsolidateMinValue`, hold cheap
  stashes, never sell into a negative 30-day trend.
- Rebuilds now sell redraft-dominant prime producers (realised ceiling) rather than shrugging
  Unsure; sell reasons carry market-timing language (August window).
- Backup QBs excluded from depth sells in superflex (`depthSellExcludePositions`).
- Ascending buy targets are now prime + youth (not ageing vets); youth buys for
  rebuilding/ascending teams no longer require a starter-value gain and rank by asset value.
- New `STRATEGY.md` — distilled strategy canon from 25 Dynasty Domain transcripts, with a
  regression list. New tests in `tests/verdicts.test.ts`.

## 0.2.0 — 2026-08-17

- League tabs: one league on screen at a time (summary table rows switch tabs too; last tab remembered).
- Team status overrides: every team's direction (mine and all opponents) can be pinned via a dropdown — Auto follows the classifier. Overrides persist locally and feed verdicts, counterparties and buy targets. Manual statuses are marked in the UI and the markdown export.
- Verdicts now render as three columns — Sell / Unsure / Hold — with a new Unsure verdict for borderline calls (win-now vets on a mushy-middle roster, prime players on a rebuild, 29+ players not yet declining on non-contenders). Unsure cards show the would-be buyer where one exists.

## 0.1.0 — 2026-08-17

- Phase 1 (Foundation): Vite + React + TypeScript scaffold, config files (`config/leagues.json`, `config/thresholds.json`), `scripts/refresh.ts` snapshot fetcher (Sleeper + FantasyCalc), shared analytics engine (`src/lib/engine/`), preseason baseline view with cross-league summary, per-league profiles, verdict tables, buy targets, opponent one-liners, markdown export and live-fetch fallback.
