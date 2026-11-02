# Changelog

## 2026-11-02 v0.1.0
- Scaffold per brief sections 3-8: fetch (WikiSync, hiscores JSON, CA all-tasks table with `data-ca-task-id`, four master tables, Boss Slayer pool, master costs), id map + baseline reconciliation, required-set solver, route buckets, slayer do/skip/block model with block EV, Turael-boost calculator, provenance-tagged report.md, dated snapshots.
- First live run: 226/655, 733 pts; required set 298 tasks / 1,233 pts, cutoff 6.1% (tie-order; brief said 6.2%). ID anchors 51/268/183 verified.
- Flags raised: Slayer-level gating of Hydra/Araxxor/Thermy, Royal Titans + Shellbane on-task, Nex not in LaB pool, Mortimer unmodelled.

## 2026-11-02 v0.1.1
- Config filled from Matteo's answers: Like a Boss on, Duradel, Wings Spread owned, 7 Duradel blocks, no forced excludes.
- New UNBLOCK? verdict for blocked tasks that carry open CA points, with EV if freed. Blocks matched case-insensitively, unknown block names logged.
- Turael example skips blocked tasks; report handles a zero-probability target.
