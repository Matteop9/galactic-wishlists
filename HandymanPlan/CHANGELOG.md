# Changelog — HandymanPlan

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
