import { runExtraction, uploadScan, ScanError, type ScanResult } from './capture';

/**
 * The offline scan queue (spec §6, design §5.3b).
 *
 * Losing signal at the lane is normal, not an error: the photo goes into
 * IndexedDB with everything needed to finish the job, and the processor picks
 * it up on `online` or on app focus. It uploads and extracts — it never posts
 * a game, because a scan still has to be looked at by a human before it lands
 * on the board. A processed item waits at `ready` until you review it.
 */

const DB_NAME = '10pins-scans';
const STORE = 'scans';
const DB_VERSION = 1;

export type QueuedStatus = 'queued' | 'ready' | 'failed';

export interface QueuedScan {
  id: string;
  status: QueuedStatus;
  /** the compressed photo; kept until the game is confirmed so a retry needs no re-shoot */
  blob: Blob;
  queuedAt: string;
  playedAt: string;
  groupId: string | null;
  venueName: string | null;
  /** set once uploaded */
  photoPath?: string;
  /** set once the reader has run */
  result?: ScanResult;
  /** set when the reader gave up: a ScanErrorCode */
  error?: string;
}

export interface QueueSummary {
  waiting: number;
  ready: number;
  failed: number;
  /** the one-line status the Profile banner shows, or null when the queue is empty */
  line: string | null;
}

/** What the queue says about itself — pure, so the copy is testable. */
export function summariseQueue(items: QueuedScan[]): QueueSummary {
  const waiting = items.filter((i) => i.status === 'queued').length;
  const ready = items.filter((i) => i.status === 'ready').length;
  const failed = items.filter((i) => i.status === 'failed').length;

  let line: string | null = null;
  if (ready > 0) line = ready === 1 ? '1 scan ready to review' : `${ready} scans ready to review`;
  else if (waiting > 0) line = waiting === 1 ? '1 scan waiting for signal' : `${waiting} scans waiting for signal`;
  else if (failed > 0) line = failed === 1 ? "1 scan we couldn’t read" : `${failed} scans we couldn’t read`;

  return { waiting, ready, failed, line };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = run(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => db.close();
      }),
  );
}

export async function listQueuedScans(): Promise<QueuedScan[]> {
  try {
    const items = await tx<QueuedScan[]>('readonly', (store) => store.getAll() as IDBRequest<QueuedScan[]>);
    return items.sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
  } catch {
    return []; // private mode, storage blocked: the app still works, it just can’t queue
  }
}

export async function getQueuedScan(id: string): Promise<QueuedScan | null> {
  try {
    return (await tx<QueuedScan>('readonly', (store) => store.get(id) as IDBRequest<QueuedScan>)) ?? null;
  } catch {
    return null;
  }
}

export async function putQueuedScan(item: QueuedScan): Promise<void> {
  await tx('readwrite', (store) => store.put(item) as IDBRequest<IDBValidKey>);
}

export async function removeQueuedScan(id: string): Promise<void> {
  try {
    await tx('readwrite', (store) => store.delete(id) as IDBRequest<undefined>);
  } catch {
    /* nothing to clean up */
  }
}

export async function enqueueScan(opts: {
  blob: Blob;
  playedAt: string;
  groupId: string | null;
  venueName: string | null;
}): Promise<QueuedScan> {
  const item: QueuedScan = {
    id: crypto.randomUUID(),
    status: 'queued',
    blob: opts.blob,
    queuedAt: new Date().toISOString(),
    playedAt: opts.playedAt,
    groupId: opts.groupId,
    venueName: opts.venueName,
  };
  await putQueuedScan(item);
  return item;
}

/**
 * Work the queue once. Uploads anything not yet uploaded, then reads it.
 * Safe to call repeatedly — items already `ready` are left alone, and an
 * upload that already happened is not repeated.
 */
export async function processScanQueue(profileId: string): Promise<{ processed: number; ready: number }> {
  if (!navigator.onLine) return { processed: 0, ready: 0 };
  const items = (await listQueuedScans()).filter((i) => i.status === 'queued');
  let processed = 0;
  let ready = 0;

  for (const item of items) {
    try {
      const photoPath = item.photoPath ?? (await uploadScan(profileId, item.blob));
      if (!item.photoPath) await putQueuedScan({ ...item, photoPath });
      const result = await runExtraction(photoPath);
      await putQueuedScan({ ...item, photoPath, result, status: 'ready' });
      ready++;
    } catch (err) {
      // A reader that refuses the photo is final; anything else (signal,
      // server) stays queued for the next attempt.
      if (err instanceof ScanError && (err.code === 'unreadable' || err.code === 'daily_cap')) {
        await putQueuedScan({ ...item, status: 'failed', error: err.code });
      }
    }
    processed++;
  }

  return { processed, ready };
}
