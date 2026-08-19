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
    version: '0.6.0',
    date: '2026-08-19',
    title: 'Deadline moved + void picks',
    items: [
      'Typing decimal odds actually works now — the decimal point no longer vanishes',
      'You\'ve got until Saturday midnight to get picks into the app. Group chat deadline is still Friday 8 PM — nothing changes there',
      'New "No pick" option on the pick page for when someone in your team hasn\'t picked',
      'Postponed and invalid picks get their own marker at settlement — they score 0 per the rules, with a chip explaining why',
      'Live scores now show on Saturday even while the entry window is still open',
    ],
  },
  {
    version: '0.5.0',
    date: '2026-08-10',
    title: 'Your feedback, done',
    items: [
      'Standings: the sideways-scrolling tabs are gone — pick your season from a dropdown, and it starts on this one',
      'New dropdown next to it: count the international breaks or leave them out',
      'Gameweeks list now tells you how each week went at a glance — 9/12 · VDL +2.01',
      'Form grid goes back 5, 10 or 20 weeks — your call',
    ],
  },
  {
    version: '0.4.0',
    date: '2026-08-10',
    title: 'Badges for everyone + international breaks',
    items: [
      'Club badges for lower-league sides — Stockport, Crewe, Wrexham and co. finally get their crests',
      'International break weeks: marked with a 🌍 chip, the pick page suggests sports (with emoji) instead of clubs, and live scores stay off',
      'Past break weeks (Sep/Oct/Nov ’25, Mar ’26) tagged automatically',
    ],
  },
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
