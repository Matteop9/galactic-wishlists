import { describe, expect, it } from 'vitest';
import {
  APP_VERSION,
  CHANGELOG_SEEN_KEY,
  RELEASES,
  compareVersions,
  formatReleaseDate,
  markSeen,
  readSeen,
  releasesSince,
  type Release,
} from './changelog';

/** Minimal fake — only the methods our functions call. */
function fakeStorage(initial: Record<string, string> = {}): Storage {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

/** Storage that throws on everything — private mode / blocked storage. */
function hostileStorage(): Storage {
  return {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('blocked');
    },
    removeItem() {
      throw new Error('blocked');
    },
    clear() {
      throw new Error('blocked');
    },
    key() {
      throw new Error('blocked');
    },
    length: 0,
  } as unknown as Storage;
}

const FIXTURE: Release[] = [
  { version: '2.0.0', date: '2026-03-02', title: 'Third', items: ['c'] },
  { version: '1.2.0', date: '2026-02-02', title: 'Second', items: ['b'] },
  { version: '1.1.0', date: '2026-01-02', title: 'First', items: ['a'] },
];

describe('compareVersions', () => {
  it('orders by major, then minor, then patch', () => {
    expect(compareVersions('1.0.0', '2.0.0')).toBeLessThan(0);
    expect(compareVersions('1.2.0', '1.10.0')).toBeLessThan(0);
    expect(compareVersions('0.2.3', '0.2.10')).toBeLessThan(0);
    expect(compareVersions('0.3.0', '0.2.9')).toBeGreaterThan(0);
  });

  it('treats equal versions as equal', () => {
    expect(compareVersions('0.3.0', '0.3.0')).toBe(0);
  });

  it('pads a short version rather than going undefined', () => {
    expect(compareVersions('1', '1.0.0')).toBe(0);
    expect(compareVersions('1.1', '1.0.9')).toBeGreaterThan(0);
  });

  it('reads a corrupted stored value as zeroes instead of throwing', () => {
    expect(compareVersions('junk', '0.0.0')).toBe(0);
    expect(compareVersions('0.1.0', 'junk')).toBeGreaterThan(0);
  });
});

describe('releasesSince', () => {
  it('shows only the newest release to someone with nothing stored', () => {
    expect(releasesSince(null, FIXTURE)).toEqual([FIXTURE[0]]);
    expect(releasesSince(undefined, FIXTURE)).toEqual([FIXTURE[0]]);
  });

  it('shows nothing once the current version has been seen', () => {
    expect(releasesSince('2.0.0', FIXTURE)).toEqual([]);
  });

  it('shows everything newer than the seen version, newest first', () => {
    expect(releasesSince('1.1.0', FIXTURE)).toEqual([FIXTURE[0], FIXTURE[1]]);
  });

  it('shows nothing when a stored version is somehow ahead of the app', () => {
    expect(releasesSince('9.0.0', FIXTURE)).toEqual([]);
  });

  it('handles an empty release list', () => {
    expect(releasesSince(null, [])).toEqual([]);
    expect(releasesSince('1.0.0', [])).toEqual([]);
  });
});

describe('readSeen / markSeen', () => {
  it('round-trips the current version', () => {
    const storage = fakeStorage();
    markSeen(storage);
    expect(storage.getItem(CHANGELOG_SEEN_KEY)).toBe(APP_VERSION);
    expect(readSeen(storage)).toBe(APP_VERSION);
  });

  it('writes an explicit version when given one', () => {
    const storage = fakeStorage();
    markSeen(storage, '1.2.3');
    expect(readSeen(storage)).toBe('1.2.3');
  });

  it('reads null with no storage', () => {
    expect(readSeen(null)).toBeNull();
  });

  it('never throws on blocked storage', () => {
    expect(() => markSeen(null)).not.toThrow();
    expect(readSeen(hostileStorage())).toBeNull();
    expect(() => markSeen(hostileStorage())).not.toThrow();
  });
});

describe('formatReleaseDate', () => {
  it('reads an ISO date as a plain long date', () => {
    expect(formatReleaseDate('2026-09-02')).toBe('2 September 2026');
  });

  it('returns the input unchanged when it is not a date', () => {
    expect(formatReleaseDate('soon')).toBe('soon');
  });
});

// The release list is a shipped artefact, not just data — the same invariants
// `scripts/check-release.mjs` gates the build on, checked here so a bad entry
// fails in the test run too.
describe('RELEASES', () => {
  it('is not empty and APP_VERSION is its newest entry', () => {
    expect(RELEASES.length).toBeGreaterThan(0);
    expect(APP_VERSION).toBe(RELEASES[0]!.version);
  });

  it('descends strictly by version', () => {
    for (let i = 1; i < RELEASES.length; i += 1) {
      expect(compareVersions(RELEASES[i - 1]!.version, RELEASES[i]!.version)).toBeGreaterThan(0);
    }
  });

  it('never goes forwards in time as you read down', () => {
    for (let i = 1; i < RELEASES.length; i += 1) {
      expect(RELEASES[i - 1]!.date >= RELEASES[i]!.date).toBe(true);
    }
  });

  it('has an ISO date, a title and at least one item per release', () => {
    for (const release of RELEASES) {
      expect(release.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(release.title.trim().length).toBeGreaterThan(0);
      expect(release.items.length).toBeGreaterThan(0);
      expect(release.items.every((item) => item.trim().length > 0)).toBe(true);
    }
  });

  it('carries no emoji and no exclamation marks (the de-vibe rules)', () => {
    const copy = RELEASES.flatMap((release) => [release.title, ...release.items]).join('\n');
    expect(copy).not.toMatch(/!/);
    expect(copy).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
