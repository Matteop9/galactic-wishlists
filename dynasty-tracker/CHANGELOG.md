# Changelog

## 0.2.0 — 2026-08-17

- League tabs: one league on screen at a time (summary table rows switch tabs too; last tab remembered).
- Team status overrides: every team's direction (mine and all opponents) can be pinned via a dropdown — Auto follows the classifier. Overrides persist locally and feed verdicts, counterparties and buy targets. Manual statuses are marked in the UI and the markdown export.
- Verdicts now render as three columns — Sell / Unsure / Hold — with a new Unsure verdict for borderline calls (win-now vets on a mushy-middle roster, prime players on a rebuild, 29+ players not yet declining on non-contenders). Unsure cards show the would-be buyer where one exists.

## 0.1.0 — 2026-08-17

- Phase 1 (Foundation): Vite + React + TypeScript scaffold, config files (`config/leagues.json`, `config/thresholds.json`), `scripts/refresh.ts` snapshot fetcher (Sleeper + FantasyCalc), shared analytics engine (`src/lib/engine/`), preseason baseline view with cross-league summary, per-league profiles, verdict tables, buy targets, opponent one-liners, markdown export and live-fetch fallback.
