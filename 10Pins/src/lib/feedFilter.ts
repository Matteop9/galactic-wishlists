/**
 * Home feed filter — pure (no React), same shape as `liveState.ts`'s
 * localStorage helpers: a `Storage | null` argument and every call swallows
 * storage exceptions (private mode / blocked storage just falls back to
 * "all").
 *
 * Persisted rather than a URL param (C2, feedback queue triage 2 Sept) — a
 * URL param would reset on every Home tab tap.
 */

/** 'all' or a group id. */
export type FeedFilter = 'all' | string;

export const FEED_FILTER_KEY = 'tenpins.feed.group';

/**
 * Reconcile a stored value against the groups this profile is actually in:
 * null/undefined/unknown id → 'all'; a known group id (or 'all' itself)
 * passes through unchanged.
 */
export function normaliseFeedFilter(
  stored: string | null | undefined,
  groupIds: string[],
): FeedFilter {
  if (!stored || stored === 'all') return 'all';
  return groupIds.includes(stored) ? stored : 'all';
}

export function readFeedFilter(storage: Storage | null, groupIds: string[]): FeedFilter {
  if (!storage) return 'all';
  try {
    return normaliseFeedFilter(storage.getItem(FEED_FILTER_KEY), groupIds);
  } catch {
    return 'all';
  }
}

export function writeFeedFilter(storage: Storage | null, value: FeedFilter): void {
  if (!storage) return;
  try {
    storage.setItem(FEED_FILTER_KEY, value);
  } catch {
    /* quota or blocked storage: filter still works in memory for this session */
  }
}
