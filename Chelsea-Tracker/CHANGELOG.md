# Changelog

## 0.1.0 — 2026-08-03

Initial release, live at https://chelsea-tracker.vercel.app

- Next.js 16 + Tailwind v4 app, deployed to Vercel with Vercel Blob storage (no other infrastructure)
- Seeded all 38 Premier League 2026-27 order periods (19 home + 19 away) from the club PDF, including loyalty-point flags, Platinum-only notes and extended holiday windows
- Person picker overlay shown first on every visit (remembers last pick per device); self-serve "I'm not on the list" member add
- Per-game interest: Definitely / Interested / If others go / Not interested, with everyone's answers shown as colour-coded avatars
- Fixtures tab with live window status (Opens / Open / Closing soon / Closed) and filters (All / Open now / Needs my answer / past toggle)
- Everyone tab: games × members grid, apply dialog with one-click mailto email draft from editable template, mark-applied and outcome tracking (pending/successful/unsuccessful)
- 8-games-per-season counter per member (header + grid footer, red at limit)
- Settings tab: per-game deadline editing, add/delete games, member management (add/edit/deactivate), email recipient + template, max-games setting, start-new-season reset, and a feedback board (submit / resolve / delete)
- Versioned-blob storage layer: each write creates a new timestamped blob and prunes old ones, avoiding Vercel Blob's eventual-consistency stale reads on overwrite (which lost writes in testing)
- Seeded 5 members via the live API (kept out of the public repo)
