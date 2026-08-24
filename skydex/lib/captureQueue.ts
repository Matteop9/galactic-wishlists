// Offline capture queue (IndexedDB).
//
// When a capture can't reach the server at the shutter — no signal, a timeout, a
// 5xx, a 429 — we stash the photo + meta here and a background flusher uploads
// it once connectivity returns, so a catch is never lost to a dodgy signal. The
// shutter's `capturedAt` travels inside `meta`, so a late upload still stamps the
// card with when you actually saw the plane (the server widens its accepted
// capture-age window for exactly this). Verification of a late upload leans on
// the live feed as usual — if the plane has since gone, it lands unverified and
// goes to community review rather than being discarded.
//
// Browser-only: every function touches `indexedDB`, so only call these from
// client effects / event handlers (never during SSR). Module scope touches nothing.

export type QueuedCapture = {
  id: string;
  blob: Blob;
  meta: string; // the exact JSON string sent as the `meta` form field
  createdAt: number;
};

const DB_NAME = "skydex";
const DB_VERSION = 1;
const STORE = "capture_queue";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      }),
  );
}

/** Stash a capture for later upload. Returns the number now queued. */
export async function enqueueCapture(blob: Blob, meta: string): Promise<number> {
  const id = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  await run("readwrite", (s) => s.put({ id, blob, meta, createdAt: Date.now() } as QueuedCapture));
  return countCaptures();
}

/** All queued captures, oldest first. */
export async function listCaptures(): Promise<QueuedCapture[]> {
  const all = await run<QueuedCapture[]>("readonly", (s) => s.getAll());
  return (all ?? []).sort((a, b) => a.createdAt - b.createdAt);
}

export async function removeCapture(id: string): Promise<void> {
  await run("readwrite", (s) => s.delete(id));
}

export async function countCaptures(): Promise<number> {
  return run<number>("readonly", (s) => s.count());
}
