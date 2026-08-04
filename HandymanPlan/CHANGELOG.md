# Changelog — HandymanPlan

## v0.2.0 — 2026-08-04

Round 2: citizenship, exit strategy & family advantages (3-agent research sweep).

- **App:** new **Letting** pipeline stage; Deal tab gains a **let-scenario calculator** (net monthly rent → annual income, gross yield on all-in with verdict, holding-cost coverage, years-of-rent ≈ sale-profit); docs checklist seeds STR licence / rental-tax / co-host items; new **Short-let hosting** skill (40 total) with a seed-version migration so existing data adopts it; Tiling and Staging skills note the family edges.
- **PLAYBOOK.md:** three new sections — §9 *The Italian passport play* (post-Law 74/2025 two-generation rules, CJEU referral, London consulate process from Jersey, unmarried-partner routes per country, marriage effects), §10 *Sell vs Airbnb* (default-sell reasoning, Italy's hold-to-year-5 exception, country cheat-line, licence/tax/demand realities), §11 *Unfair advantages* (tiler in-laws, Portuguese furniture trade access: furnished exits, furniture packs, staging, blinds). §8 gains Step 0 (verify the citizenship chain first) and the Croatia-preset caveat added to §3.

## v0.1.1 — 2026-08-04

Review round: 18 confirmed findings from a 27-agent adversarial review, all fixed.

- **Data safety:** corrupt/unreadable data is stashed under `hmp_data_v1_corrupt` instead of being overwritten at boot; shared `normalize()` repairs malformed backups on load *and* import; revision guard + `storage` listener stop two open tabs clobbering each other.
- **Schengen calculator:** days are now a union of calendar days, so a border-crossing day (exit Italy / enter France same day) counts once; ongoing stays project correctly into future days.
- **Modals:** validation runs before the form closes (failed saves keep your input, with a message); backdrop-tap/Escape prompt before discarding unsaved changes; cancelling a delete-confirm returns to the edit modal instead of destroying it; background scroll locked.
- **Consistency:** renaming a person remaps task assignments; changing a property's country updates the tax-ID checklist item and untouched cost presets; journal/stay edits can no longer silently blank fields; scheme-less URLs get `https://` so they don't resolve as broken `file://` links.
- **Mobile:** 16px form inputs (no more iOS zoom-in), long words/URLs wrap instead of breaking the layout, bigger touch targets (task ticks, stars, icons, checkboxes), contact/stay rows tappable to edit (the pencil was off-screen at 375px), doc titles toggle their checkbox.

## v0.1.0 — 2026-08-03

Initial release.

- **index.html** — single-file tracker: Dashboard, Properties pipeline (Deal calculator with country cost presets, Renovation rooms/tasks, Budget ledger, Contacts, Docs checklist, Journal), Skills curriculum tracker (per-person progress), Schengen 90/180 stay calculator, JSON export/import.
- **SKILLS.md** — pre-trip skills curriculum with free online learning resources.
- **PLAYBOOK.md** — strategy playbook: country economics, visa/90-180 options, renovation cost benchmarks, pitfalls.
- Country presets: Italy, Spain, Portugal, France, Greece, Bulgaria, Ireland, Croatia.
