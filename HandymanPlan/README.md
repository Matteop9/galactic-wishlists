# HandymanPlan 🔨

End-to-end tracker for a **buy → live in → renovate → sell** journey around Europe, plus a pre-trip skills curriculum. Personal project.

**Live at [handymanplan.vercel.app](https://handymanplan.vercel.app)** — password-gated (ask Barney), with shared cloud data: both phones see the same state (versioned Vercel Blob store, last 50 saves kept).

## What it is

One self-contained HTML file — works offline too: open [index.html](index.html) straight from disk and it runs in local-only mode (localStorage + JSON export/import). Hosted on Vercel it adds the password gate (server-checked) and automatic sync. Design follows the "Site Notebook" brief in [Redesign/](Redesign/redesign_REDESIGN.md).

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
| **Playbook** | The strategy in-app: a tickable mission checklist (citizenship chain, paper trail, tax consult, tiling apprenticeship…), the Italian passport play, Maddie's routes, the sell-vs-let verdict table, family edges, and country numbers |
| **Data** | Rename people, sync status + lock-this-device, JSON export/import, demo data, wipe |

### Data & deployment

Local truth lives in browser `localStorage` (key `hmp_data_v1`); hosted, every save also pushes a timestamped JSON version to a **private Vercel Blob store** via [api/state.js](api/state.js) (password checked server-side; last 50 versions kept, so history is recoverable). Two people saving in the same instant = last write wins. **Still export a JSON backup occasionally** from the Data tab.

Deploy: `vercel deploy --prod --yes` from this folder (project `handymanplan`, Blob store `handymanplan-data` already linked). Change the password by setting the `APP_PASSWORD` env var in Vercel — the default lives in the code of a public repo, so treat the gate as a curtain, not a vault.

## Companion docs

- **[SKILLS.md](SKILLS.md)** — the printable pre-trip curriculum with free online resources
- **[PLAYBOOK.md](PLAYBOOK.md)** — strategy notes: country-by-country costs and rules, the 90/180 problem and visa options, the Italian-passport play (post-2025 rules + partner rights), sell-vs-Airbnb decision framework, family advantages (tiling apprenticeship, Portuguese furniture trade access), renovation cost benchmarks, classic traps

## Country presets

The Deal tab seeds buying/selling cost percentages per country (Italy, Spain, Portugal, France, Greece, Bulgaria, Ireland, Croatia). They're planning figures — always editable per property, always verify locally before an offer.
