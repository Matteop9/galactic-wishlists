# Changelog

## 2026-11-02 v0.1.0
- Scaffold per brief sections 3-8: fetch (WikiSync, hiscores JSON, CA all-tasks table with `data-ca-task-id`, four master tables, Boss Slayer pool, master costs), id map + baseline reconciliation, required-set solver, route buckets, slayer do/skip/block model with block EV, Turael-boost calculator, provenance-tagged report.md, dated snapshots.
- First live run: 226/655, 733 pts; required set 298 tasks / 1,233 pts, cutoff 6.1% (tie-order; brief said 6.2%). ID anchors 51/268/183 verified.
- Flags raised: Slayer-level gating of Hydra/Araxxor/Thermy, Royal Titans + Shellbane on-task, Nex not in LaB pool, Mortimer unmodelled.

## 2026-11-02 v0.1.1
- Config filled from Matteo's answers: Like a Boss on, Duradel, Wings Spread owned, 7 Duradel blocks, no forced excludes.
- New UNBLOCK? verdict for blocked tasks that carry open CA points, with EV if freed. Blocks matched case-insensitively, unknown block names logged.
- Turael example skips blocked tasks; report handles a zero-probability target.

## 2026-11-02 v0.2.0
- Ordering view (`ca/ordering.py`, report section 2b): ranks required-set bosses by open pts x KC familiarity x access (level gate, avoid list, team list), all weights in `config.ordering`.
- Avoid-list pricing: re-runs the solver with avoid bosses excluded and reports the cutoff shift and the tasks that come in instead. CoX exclusion today: 6.1% -> 4.6%.

## 2026-11-02 v0.3.0
- Slayer model generalised beyond CA: every assignment carries an XP/hr, GP/hr and minutes baseline from `data/task_rates.json` (75 seeded estimates, overwrite and mark `measured`).
- `--objective ca|xp|gp|balanced` (presets in `config.slayer.objectives`) scores tasks 0..1 per dimension against the master's best; verdicts DO/SKIP/BLOCK/UNBLOCK? follow the chosen objective, BLOCK is the bottom quartile with a floor.
- Report shows per-master expected CA/roll, xp/hr and gp/hr before/after blocks, and the block list each objective would pick side by side.

## 2026-11-02 v0.3.1
- Rates sourced from the wiki (fetched 2 Nov 2026): xp/hr for 41 assignments from the Slayer training table (best listed method, raw text kept in `xp_wiki` with the wiki's own do/skip recommendation in `wiki_rec`), gp/hr for 44 from the Money making guide index (guide named in `gp_note`; boss alternatives used where that is the on-task money, e.g. Cerberus for hellhounds). Boss-task gp = mean of 31 Like a Boss pool guides. Per-field `xp_src`/`gp_src`; report marks only assumed cells with `*`. Minutes per task remain estimates. Raw scrape kept in `data/wiki_rates_raw_2026-11-02.json`.

## 2026-11-02 v0.4.0
- Local dashboard: `python serve.py` opens http://127.0.0.1:8765/ (`index.html`, no build). Tabs: Overview (cards, tiers, flags, diff), Ordering (bucket filter, search, task expansion), Slayer (master tabs, objective switch, sortable verdict table, EV cards, block list by objective), Task log, Turael calculator.
- `run.py` now writes `report.json` (all four objectives modelled every run) and ingests `data/task_log.json`: logged tasks become measured xp/gp/minutes in `task_rates.json`, overriding wiki figures.
- `serve.py` (stdlib): serves the page, `POST /api/log` appends/deletes entries, `POST /api/run` reruns the pipeline so the Refresh button works from the page.

## 2026-11-05 v0.5.0 moneymakers
- New `moneymakers/` sub-tool: ranks every wiki Money making guide by gp/hr with a luck estimate (sd, cv, luck share, hours to +-10%), effort 1-5 (wiki intensity) and human skill 1-5 (keyword table, assumed). Data from the wiki `money_making_guide` Bucket API in one request (524 guides, 489 normal + 35 recurring), not HTML scraping.
- Variance model: per-kill drops with p<1 Bernoulli, integer drops and >=20/hr production deterministic, else Poisson (`variance.model` in `data/config.json`, `poisson` restores the pure model). Maggot King check: 9.82m/hr, cv 3.16, Elder venator fang 0.0735/hr = 89% of variance.
- Flags: `--reprice` (live GE mid prices, gemw lines only), `--details` (wikitext scan for AFK/click/tick effort adjustments), `--force`, `--top`, `--min-profit`, `--members-only`, `--f2p-only`. Dated snapshots in `moneymakers/data/`, raw cache gitignored.
- Open: skill tier for The Fractured Archive unverified; tax-exempt item list ignored under `--reprice`.
