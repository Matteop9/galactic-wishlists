/* User-facing changelog shown on the This Week page. Newest first.
   Keep items short and punchy — the full technical log lives in CHANGELOG.md. */

export interface ChangelogEntry {
  version: string
  date: string // ISO
  title: string
  items: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.3.0',
    date: '2026-08-10',
    title: 'Phase 2 — polish pass',
    items: [
      'Table is now Standings — tap any column to sort',
      'GW history chart: every week\'s margin, VDL pulls left, JHP pulls right',
      'Team picker: search every team ever picked, club badges included',
      '29 historical team-name spellings tidied (Athletico → Atletico, Spurs → Tottenham…)',
      'Names now wear team colours everywhere — VDL yellow, JHP blue',
      'Pick page reminder: group chat first, always',
      'Feedback box on your profile — ideas land in the admin queue',
      'Bonus/minus adjustments now show on gameweek pages and can be removed in Admin',
      'JHP Test Weekend pairs (Team 4–6) are set up alongside VDL\'s',
      'Pick history: load more instead of stopping at 15',
      'This “what\'s new” panel',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-08-10',
    title: 'Proper logins',
    items: [
      'Username + password sign-in with the shared group code — no more email links',
      'Admin can reset passwords and free up names',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-08-10',
    title: 'The Acca goes digital',
    items: [
      'Full history imported — 1,287 picks across 108 gameweeks, verified against the spreadsheet to 4 decimal places',
      'Live scores on Saturdays, sweep doubles, disputes, and the Test Weekend sandbox',
    ],
  },
]
