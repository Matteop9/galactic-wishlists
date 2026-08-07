import { put, list, del } from '@vercel/blob';

// Versioned-document store on Vercel Blob (same pattern as Chelsea-Tracker):
// blob overwrites are eventually consistent (CDN-cached), so every write creates a
// NEW blob at {ROOT}/{prefix}/{timestamp}-{suffix}.json and reads resolve the
// lexicographically-latest pathname. Older versions are pruned best-effort.

const ROOT = 'spoton/v1';

const KEEP_VERSIONS = 3;

function fullPrefix(prefix: string): string {
  return `${ROOT}/${prefix}/`;
}

async function listVersions(prefix: string) {
  const { blobs } = await list({ prefix: fullPrefix(prefix), limit: 1000 });
  // timestamps are fixed-width (padded), so pathname sort = chronological sort
  return blobs.sort((a, b) => (a.pathname < b.pathname ? -1 : 1));
}

export async function readDoc<T>(prefix: string): Promise<T | null> {
  const versions = await listVersions(prefix);
  if (versions.length === 0) return null;
  const latest = versions[versions.length - 1];
  // private store: blob reads require the RW token as a bearer credential
  const res = await fetch(latest.url, {
    cache: 'no-store',
    headers: { authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
  });
  if (!res.ok) throw new Error(`store: failed reading ${latest.pathname} (${res.status})`);
  return (await res.json()) as T;
}

export async function writeDoc<T>(prefix: string, data: T): Promise<void> {
  const ts = Date.now().toString().padStart(14, '0');
  await put(`${fullPrefix(prefix)}${ts}.json`, JSON.stringify(data), {
    access: 'private',
    addRandomSuffix: true,
    contentType: 'application/json',
  });
  void pruneOld(prefix).catch(() => {});
}

// Read-modify-write. No CAS on Blob, so concurrent writers can race — acceptable at
// friends-scale for the rare-write docs this is used on (users, league meta, index).
export async function updateDoc<T>(prefix: string, fn: (current: T | null) => T): Promise<T> {
  const current = await readDoc<T>(prefix);
  const next = fn(current);
  await writeDoc(prefix, next);
  return next;
}

async function pruneOld(prefix: string): Promise<void> {
  const versions = await listVersions(prefix);
  if (versions.length <= KEEP_VERSIONS) return;
  const stale = versions.slice(0, versions.length - KEEP_VERSIONS);
  await del(stale.map((b) => b.url));
}

// ---- document path helpers ----

export const paths = {
  users: 'users',
  leaguesIndex: 'leagues-index',
  code: (code: string) => `codes/${code.toUpperCase()}`,
  leagueMeta: (leagueId: string) => `leagues/${leagueId}/meta`,
  prediction: (leagueId: string, userId: string) => `leagues/${leagueId}/pred/${userId}`,
  cache: (key: string) => `cache/${key.replace(/[^a-zA-Z0-9:_-]/g, '_')}`,
};
