import { readDoc, writeDoc, paths } from './store';

type CacheDoc<T> = { payload: T; fetchedAt: string };

// Lazy read-path cache over the blob store. football-data.org free tier allows
// 10 requests/minute, so pages must never call the API directly — always via this.
// Stale data is served on upstream failure rather than breaking a page view.
export async function getCached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const prefix = paths.cache(key);
  const cached = await readDoc<CacheDoc<T>>(prefix);
  const ageMs = cached ? Date.now() - new Date(cached.fetchedAt).getTime() : Infinity;
  if (cached && ageMs < ttlSeconds * 1000) {
    return cached.payload;
  }
  try {
    const payload = await fetcher();
    await writeDoc<CacheDoc<T>>(prefix, { payload, fetchedAt: new Date().toISOString() });
    return payload;
  } catch (err) {
    if (cached) {
      console.error(`cache: refresh failed for ${key}, serving stale`, err);
      return cached.payload;
    }
    throw err;
  }
}
