// Shared state API — versioned single-JSON-document store on Vercel Blob.
// Same pattern as Chelsea-Tracker: every save writes a NEW timestamped blob
// (Blob overwrites are eventually consistent; new names are immediate), reads
// return the newest. The password is checked here, server-side.
import { list, put, del } from '@vercel/blob';

const PREFIX = 'hmp/state-';
const KEEP = 50; // versions of history to retain

export default async function handler(req, res) {
  const expected = process.env.APP_PASSWORD || 'Barney';
  if ((req.headers['x-pass'] || '') !== expected) {
    res.status(401).json({ error: 'unauthorised' });
    return;
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    res.status(503).json({ error: 'blob store not configured' });
    return;
  }

  try {
    if (req.method === 'GET') {
      const { blobs } = await list({ prefix: PREFIX, limit: 1000 });
      if (!blobs.length) { res.status(404).json({ error: 'no state yet' }); return; }
      blobs.sort((a, b) => b.pathname.localeCompare(a.pathname)); // ISO timestamps sort lexically
      // private store: blob fetches need the token
      const r = await fetch(blobs[0].url, { headers: { authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` } });
      const data = await r.json();
      res.setHeader('cache-control', 'no-store');
      res.status(200).json(data);

    } else if (req.method === 'POST') {
      const body = typeof req.body === 'object' && req.body ? req.body : JSON.parse(req.body || 'null');
      if (!body || !body.version || !Array.isArray(body.properties)) {
        res.status(400).json({ error: 'not a HandymanPlan state document' });
        return;
      }
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      await put(`${PREFIX}${stamp}.json`, JSON.stringify(body), {
        access: 'private',
        addRandomSuffix: false,
        contentType: 'application/json',
      });
      // prune history beyond KEEP (best-effort)
      try {
        const { blobs } = await list({ prefix: PREFIX, limit: 1000 });
        const excess = blobs.sort((a, b) => b.pathname.localeCompare(a.pathname)).slice(KEEP);
        if (excess.length) await del(excess.map(b => b.url));
      } catch (e) { /* pruning failure is not a save failure */ }
      res.status(200).json({ ok: true, rev: body.rev || 0 });

    } else {
      res.status(405).json({ error: 'method not allowed' });
    }
  } catch (e) {
    res.status(500).json({ error: 'server error', detail: String(e && e.message || e) });
  }
}
