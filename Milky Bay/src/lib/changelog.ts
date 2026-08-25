/* User-facing changelog. Newest first. Keep items short and punchy — the full
   technical log lives in CHANGELOG.md. */

export interface ChangelogEntry {
  version: string
  date: string // ISO
  title: string
  items: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.4.0',
    date: '2026-08-25',
    title: 'Easier picks, fuller cards',
    items: [
      'Long Random acca picks no longer get chopped off — tap any leg to expand the full bet, tap again to tuck it away',
      'The W acca team box is now a proper picker: start typing and it suggests clubs with their badges and how often the group has picked them — new teams still just type in full',
      'Club badges now show next to W acca picks on the cards',
      'Odds are entered with a −/+ decimal stepper (0.05 steps) instead of free text — type exact odds if the steps don\'t land on yours; fractional odds from the chat go in as decimal (4/5 = 1.80)',
    ],
  },
  {
    version: '0.3.2',
    date: '2026-08-25',
    title: 'Reliability tune-up',
    items: [
      'This Week keeps showing the weekend just gone right through to midweek, instead of jumping to next week\'s empty card',
      'The pick window now opens bang on Wednesday noon instead of taking a few minutes to catch up, and the close time reads correctly',
      'Dates always read in UK time, and a dropped connection shows a proper "try again" instead of pretending you\'re logged out',
    ],
  },
  {
    version: '0.3.1',
    date: '2026-08-20',
    title: 'Picks actually save',
    items: [
      'Entering a pick failed with a permission error every time — nobody had managed to save one through the app until now. Fixed: picks go in properly, and the app still records who typed each one in',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-08-19',
    title: 'The honours cabinet, redesigned',
    items: [
      'One crown that LEVELS UP with titles instead of a row of crowns — laurels at two, wings at three, and it keeps growing to rank eight and beyond',
      'The wooden spoon grows too, just downhill: drips, drooped wings, demotion stripes and eventually stink lines',
      'Half crown and half spoon are now proper half-drawn marks, not chopped-in-half graphics',
      'The 💩 is now hand-drawn (same shame, more craft) — and the half-season half poo is officially The Pat: flattened, one eye',
    ],
  },
  {
    version: '0.2.2',
    date: '2026-08-19',
    title: 'Admin dropdowns actually save',
    items: [
      'The mini-league weekend selector (and the status + feedback dropdowns) were silently saving the OLD value — picking a weekend for a mini league now sticks',
    ],
  },
  {
    version: '0.2.1',
    date: '2026-08-19',
    title: 'All-time history + polish',
    items: [
      'All Time now includes the 24/25 and 25/26 season totals — Harry leads all-time on 151.08',
      'Custom date range on Standings',
      'Gameweeks grouped: this season so far on top, the future below',
      'The 💩 no longer gets its head cut off — it sits ON the letter now',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-08-19',
    title: 'Mini leagues, history & editable rules',
    items: [
      'This season is 26/27 (the agreement doc was a year behind)',
      'Mini leagues are real now — admins create them and pick exactly which gameweeks count. The Jersey Weekend one (first 6 weekends) is set up',
      'Standings has a History tab: the full 24/25 and 25/26 final tables',
      'Tim gets a second crown (25/26 champion, 74.53); Luke collects a second spoon; Sandy\'s 22/23 spoon is now a HALF spoon — it was a half season',
      'Admins can amend the rules in-app — every change is stamped in the audit trail',
      'Feedback box on your profile — ideas land in the admin queue',
      'Never won a season? A little 💩 sits on your name until you do',
    ],
  },
  {
    version: '0.1.1',
    date: '2026-08-19',
    title: 'Season calendar + open pick entry',
    items: [
      'Every Premier League weekend of the season is now a gameweek — 34 in total, finishing 29/30 May. Break and cup weekends are skipped',
      'Anyone can enter (or fix) anyone\'s picks from the chat while the window\'s open — the app records who typed it in',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-08-19',
    title: 'Milky Bay goes digital',
    items: [
      'Both weekly accas tracked — W acca and Random acca, points capped at 2.50 a pick',
      'Sole-loser penalty applied automatically (let the acca down and it\'s −1 × your odds)',
      'Mini league table for the first 6 weekends',
      'Crowns for past champions — half a crown for the 22/23 half season — and wooden spoons for last place, forever',
      'Week 1 already in: Tim leads on 4.10',
      'Same login as The Acca if you\'re in both',
    ],
  },
]
