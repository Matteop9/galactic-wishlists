# HandymanPlan 🔨

End-to-end tracker for a **buy → live in → renovate → sell** journey around Europe, plus a pre-trip skills curriculum. Personal project.

## What it is

One self-contained HTML file — no build, no dependencies, works offline. Open [index.html](index.html) in any browser (double-click is fine; no server needed).

### Tabs

| Tab | What it does |
|---|---|
| **Dashboard** | Portfolio at a glance: cash in projects, projected + realised profit, skills progress, Schengen days, over-budget alerts |
| **Properties** | Pipeline from *Scouting → Viewing → Offer → Buying → Renovating → Letting → Selling → Sold*. Each property has six sub-tabs: |
| — Deal | Country cost cheat-sheet + full deal calculator (buying costs %, reno budget, holding, selling costs → all-in, projected profit, ROI, break-even price) with estimates vs actuals, plus an optional let-scenario (net rent → gross yield, holding coverage, years-of-rent vs sale profit) |
| — Renovation | Rooms → tasks with status (to-do / in progress / done), who's doing it (you / partner / trade), DIY flag, est vs actual cost |
| — Budget | Money ledger by category (fees, materials, labour, holding, selling) — actuals feed the deal maths |
| — Contacts | Local tradespeople with phone, star rating, notes |
| — Docs & legal | Paperwork checklist seeded per country (tax number, notary, permits, energy cert…) |
| — Journal | Dated project diary |
| **Skills** | The pre-trip curriculum ([SKILLS.md](SKILLS.md)) as an interactive tracker — 40 skills across 6 phases, per-person progress (Not started → Learning → Practiced → Confident), free learning links |
| **Stays** | Schengen 90/180 rolling-window calculator — log entries/exits, see days used, days left, and how long you could stay if you entered today |
| **Data** | Rename people, JSON export/import (backup + sync between devices), demo data, wipe |

### Data

Everything lives in browser `localStorage` (key `hmp_data_v1`). **Export a JSON backup regularly** from the Data tab — that file is also how you sync between two phones/laptops.

## Companion docs

- **[SKILLS.md](SKILLS.md)** — the printable pre-trip curriculum with free online resources
- **[PLAYBOOK.md](PLAYBOOK.md)** — strategy notes: country-by-country costs and rules, the 90/180 problem and visa options, the Italian-passport play (post-2025 rules + partner rights), sell-vs-Airbnb decision framework, family advantages (tiling apprenticeship, Portuguese furniture trade access), renovation cost benchmarks, classic traps

## Country presets

The Deal tab seeds buying/selling cost percentages per country (Italy, Spain, Portugal, France, Greece, Bulgaria, Ireland, Croatia). They're planning figures — always editable per property, always verify locally before an offer.
