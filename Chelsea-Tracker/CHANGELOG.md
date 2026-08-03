# Changelog

## 0.2.1 — 2026-08-03

- Simplified interest colours to four families (group's request): green = going (Definitely/Yes), orange = maybe/TBC (If others / Maybe / Depends on time), blue = Apply direct, red = not going (Away / Busy / Not interested — Not interested darkest). Symbols unchanged and still distinguish levels within a family; Everyone-tab legend condensed to the four families.

## 0.2.0 — 2026-08-03

Implements the group's first round of feedback (from the in-app board) plus two live requests:

- **Interest scale expanded to 9 options** (Matteo): Definitely / Yes / If others are / Maybe / Depends on time / Apply direct / Away / Busy / Not interested. Existing "Interested" votes migrate to "Yes" automatically.
- **"Apply direct"** (Matteo): for cup/midweek games bought straight from the club — excluded from the email pre-tick and the 8-game planning count.
- **"Not interested" is now red** (Harry).
- **Planning total** (Matteo): new "Planning to go" row in the Everyone grid (won + pending + Definitely/Yes votes) and in the header — red with ⚠ when over the season limit.
- **Away deadline shift** (Matteo): away games now count down to the window OPEN (requests must be with Neil beforehand) and show as closed once it opens; amber note on away cards.
- **Outlook reminders** (Matteo): Settings → "Outlook reminders" downloads an .ics — home games at window open, away games 3 days before open — with step-by-step import instructions. Past reminders excluded.
- **Deadlines tab** (Matteo): day-by-day agenda of every deadline grouped by month, plus a sort-by-deadline option on the Everyone grid.

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
