import { describe, expect, it } from 'vitest';
import {
  FEED_FILTER_KEY,
  normaliseFeedFilter,
  readFeedFilter,
  writeFeedFilter,
} from './feedFilter';

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

describe('normaliseFeedFilter', () => {
  it('treats null as all', () => {
    expect(normaliseFeedFilter(null, ['g1'])).toBe('all');
  });

  it('treats undefined as all', () => {
    expect(normaliseFeedFilter(undefined, ['g1'])).toBe('all');
  });

  it('falls back to all for an unknown group id', () => {
    expect(normaliseFeedFilter('ghost', ['g1', 'g2'])).toBe('all');
  });

  it('passes through a known group id', () => {
    expect(normaliseFeedFilter('g2', ['g1', 'g2'])).toBe('g2');
  });

  it('passes through the literal "all"', () => {
    expect(normaliseFeedFilter('all', ['g1'])).toBe('all');
  });
});

describe('readFeedFilter / writeFeedFilter', () => {
  it('round-trips a known group id through a fake Storage', () => {
    const storage = fakeStorage();
    writeFeedFilter(storage, 'g1');
    expect(storage.getItem(FEED_FILTER_KEY)).toBe('g1');
    expect(readFeedFilter(storage, ['g1', 'g2'])).toBe('g1');
  });

  it('reads back to all once the stored group is no longer known', () => {
    const storage = fakeStorage({ [FEED_FILTER_KEY]: 'g1' });
    expect(readFeedFilter(storage, ['g2'])).toBe('all');
  });

  it('read with null storage is all', () => {
    expect(readFeedFilter(null, ['g1'])).toBe('all');
  });

  it('write with null storage is a no-op', () => {
    expect(() => writeFeedFilter(null, 'g1')).not.toThrow();
  });
});
