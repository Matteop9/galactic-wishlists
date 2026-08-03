import { del, list, put } from "@vercel/blob";
import { AppData } from "./types";
import { seedData } from "./seed";

// Every write creates a NEW blob (timestamped pathname) instead of overwriting
// one file: Vercel Blob overwrites are eventually consistent (stale reads for
// up to ~60s), which loses rapid successive updates. Fresh pathnames are
// always read back immediately. Reads pick the newest version; writes prune
// old versions, keeping a small safety margin.
const PREFIX = "chelsea-tracker/data-";
const KEEP_VERSIONS = 5;

function hasBlob(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

// Dev fallback when no Blob store is connected: in-memory only, not persistent.
type GlobalWithMemory = typeof globalThis & { __ctMemory?: AppData };

export interface StoreResult {
  data: AppData;
  persistent: boolean;
}

async function listVersions() {
  const { blobs } = await list({ prefix: PREFIX, limit: 1000 });
  // Pathnames embed a zero-padded ms timestamp, so lexicographic = chronological.
  return blobs.sort((a, b) => b.pathname.localeCompare(a.pathname));
}

export async function readData(): Promise<StoreResult> {
  if (!hasBlob()) {
    const g = globalThis as GlobalWithMemory;
    if (!g.__ctMemory) g.__ctMemory = seedData();
    return { data: g.__ctMemory, persistent: false };
  }
  const versions = await listVersions();
  if (versions.length === 0) {
    const data = seedData();
    await writeData(data);
    return { data, persistent: true };
  }
  const res = await fetch(`${versions[0].url}?t=${Date.now()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to read data blob (${res.status})`);
  const data = (await res.json()) as AppData;
  // Older documents may predate newer fields.
  if (!data.feedback) data.feedback = [];
  return { data, persistent: true };
}

export async function writeData(data: AppData): Promise<void> {
  if (!hasBlob()) {
    (globalThis as GlobalWithMemory).__ctMemory = data;
    return;
  }
  const stamp = String(Date.now()).padStart(14, "0");
  const rand = crypto.randomUUID().slice(0, 8);
  await put(`${PREFIX}${stamp}-${rand}.json`, JSON.stringify(data), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
  // Prune old versions; tolerate failures (next write will retry).
  try {
    const versions = await listVersions();
    const stale = versions.slice(KEEP_VERSIONS);
    if (stale.length > 0) await del(stale.map((b) => b.url));
  } catch {
    // best effort
  }
}
