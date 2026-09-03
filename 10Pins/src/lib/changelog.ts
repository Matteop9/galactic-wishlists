/**
 * What’s new — the in-app changelog.
 *
 * The user-facing mirror of `CHANGELOG.md`: the repo file says *how* a release
 * was built, this says *what changed for you*, in plain sentences. One entry
 * per shipped release, newest first.
 *
 * The rules below are enforced by `npm run check:release`, which runs on every
 * build (`prebuild`), so a release physically cannot ship without an entry:
 * - `RELEASES[0].version` is the app’s version and must equal package.json’s.
 * - Versions strictly descend and are unique; dates are ISO and never go
 *   forwards as you read down the list.
 * - Copy follows the de-vibe pass (2 Sept): no emoji, no exclamation marks,
 *   sentence case.
 *
 * Versions below 0.3.0 were labelled retroactively when this page was added —
 * the dates are the real ship dates from `CHANGELOG.md`.
 *
 * Pure module, in the shape of `feedFilter.ts`: no React, and every storage
 * call takes a `Storage | null` and swallows exceptions (private mode and
 * blocked storage just mean the card shows once per session at worst).
 */

export type Release = {
  /** Semver. `RELEASES[0].version` is the running app’s version. */
  version: string;
  /** ISO date, the day it went live. */
  date: string;
  /** One line, sentence case — the headline for the home card. */
  title: string;
  /** Two to five plain lines. What changed, from the player’s side. */
  items: string[];
};

export const RELEASES: Release[] = [
  {
    version: '0.4.0',
    date: '2026-09-02',
    title: 'A new look, the scoresheet',
    items: [
      'The whole app is redrawn as a paper scoresheet: ruled frames, boxed numerals, strikes in red and spares in blue, on a light page.',
      'Dark mode follows your phone, or pick light or dark yourself under Profile, Theme.',
      'Every game is drawn as its scoresheet strip, on the feed and on the game page.',
      'Reactions are now one thing, a nice one. Tap it once, tap again to take it back.',
      'On a tablet or desktop the tab bar becomes a side rail and the feed runs in two columns.',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-09-02',
    title: 'What’s new, in the app',
    items: [
      'Every release now says what changed: a card on the feed the first time you open the app after an update, and the full history on the What’s new page.',
      'Reach it any time from Profile, where the version number lives too.',
    ],
  },
  {
    version: '0.2.3',
    date: '2026-09-02',
    title: 'Groups feel more like a group of friends',
    items: [
      'Start a match day straight from the plus button, not just from inside a group.',
      'Filter the feed to one group, and the app remembers which one.',
      'Group leaderboards run over the season, the last 30 days or all time, ranked by average or by high game.',
      'Tap anyone’s name for their player page, including your head-to-head record against them.',
      'Signing in no longer bounces you to a dead localhost link.',
    ],
  },
  {
    version: '0.2.2',
    date: '2026-09-02',
    title: 'Tighter boundaries for demo visitors',
    items: [
      'Someone trying the demo sees only the people they bowl with, and cannot reach outside the demo group.',
      'Demo accounts are cleared out after a week.',
    ],
  },
  {
    version: '0.2.1',
    date: '2026-09-02',
    title: 'Share card and sign-out fixes',
    items: [
      'A share card can no longer credit the wrong player with someone else’s highlight.',
      'Signing out clears the previous account’s cached feed, so a shared phone shows the right games.',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-09-02',
    title: 'Celebrations, share cards and offline scans',
    items: [
      'Strikes, doubles, turkeys and personal bests get a moment on screen, always skippable.',
      'Turn any frame-scored game into a share card.',
      'Install 10 Pins to your home screen; scans taken without signal queue up and send when you are back.',
    ],
  },
];

/** The running version — the newest entry, by definition. */
export const APP_VERSION = RELEASES[0]!.version;

export const CHANGELOG_SEEN_KEY = 'tenpins.changelog.seen';

/**
 * Semver compare on the numeric parts only (we ship plain `x.y.z`).
 * Negative when `a` is older, 0 when equal, positive when `a` is newer.
 * A malformed segment reads as 0 rather than NaN, so a corrupted stored
 * value can never make the comparison throw or go undefined.
 */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) => v.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const left = parse(a);
  const right = parse(b);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * The releases this person hasn’t been shown yet, newest first.
 *
 * No stored value means one of two people: a brand-new account, or someone
 * who already had the app before this page existed. `FirstRun` marks the
 * newcomer as seen the moment their profile is created, so by the time this
 * runs a missing value means the second — and they get exactly the newest
 * release, not the whole back catalogue dumped into a card.
 */
export function releasesSince(
  seen: string | null | undefined,
  releases: Release[] = RELEASES,
): Release[] {
  if (releases.length === 0) return [];
  if (!seen) return releases.slice(0, 1);
  return releases.filter((release) => compareVersions(release.version, seen) > 0);
}

export function readSeen(storage: Storage | null): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(CHANGELOG_SEEN_KEY);
  } catch {
    return null;
  }
}

export function markSeen(storage: Storage | null, version: string = APP_VERSION): void {
  if (!storage) return;
  try {
    storage.setItem(CHANGELOG_SEEN_KEY, version);
  } catch {
    /* quota or blocked storage: the card reappears next session, which is survivable */
  }
}

/** "2 September 2026" — the What’s new page’s date line. */
export function formatReleaseDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
