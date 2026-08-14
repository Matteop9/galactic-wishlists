// One-off: set a league's lockAt to 18:30 UK time on its current deadline date.
//
//   cd LeaguePredictor && vercel env pull .env.development.local
//   node scripts/set-deadline-1830.mjs [leagueId]
//
// leagueId is optional when exactly one league exists. Reads BLOB_READ_WRITE_TOKEN
// from the environment or .env.development.local / .env.local.

import { readFileSync } from 'node:fs';
import { list, put } from '@vercel/blob';

for (const file of ['.env.development.local', '.env.local']) {
  if (process.env.BLOB_READ_WRITE_TOKEN) break;
  try {
    for (const line of readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').split('\n')) {
      const m = line.match(/^BLOB_READ_WRITE_TOKEN="?([^"\s]+)"?/);
      if (m) process.env.BLOB_READ_WRITE_TOKEN = m[1];
    }
  } catch {}
}
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('BLOB_READ_WRITE_TOKEN not found — run `vercel env pull .env.development.local` first');
  process.exit(1);
}

const ROOT = 'spoton/v1';
const auth = { headers: { authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` } };

async function readDoc(prefix) {
  const { blobs } = await list({ prefix: `${ROOT}/${prefix}/`, limit: 1000 });
  if (blobs.length === 0) return null;
  const latest = blobs.sort((a, b) => (a.pathname < b.pathname ? -1 : 1)).at(-1);
  const res = await fetch(latest.url, { ...auth, cache: 'no-store' });
  if (!res.ok) throw new Error(`failed reading ${latest.pathname} (${res.status})`);
  return res.json();
}

async function writeDoc(prefix, data) {
  const ts = Date.now().toString().padStart(14, '0');
  await put(`${ROOT}/${prefix}/${ts}.json`, JSON.stringify(data), {
    access: 'private',
    addRandomSuffix: true,
    contentType: 'application/json',
  });
}

// minutes east of UTC for Europe/London at a given instant
function londonOffsetMin(ts) {
  const name = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', timeZoneName: 'longOffset' })
    .formatToParts(ts)
    .find((p) => p.type === 'timeZoneName').value; // "GMT" or "GMT+01:00"
  const m = name.match(/GMT([+-])(\d{2}):(\d{2})/);
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
}

// the current deadline's calendar date in London
const index = await readDoc('leagues-index');
if (!index) throw new Error('no leagues-index doc found');
let ids = Object.keys(index.leagues);
if (process.argv[2]) ids = ids.filter((id) => id === process.argv[2]);
if (ids.length !== 1) {
  console.error(`expected exactly one league, found ${ids.length}:`);
  for (const id of Object.keys(index.leagues)) console.error(`  ${id}  ${index.leagues[id].name}`);
  process.exit(1);
}

const league = await readDoc(`leagues/${ids[0]}/meta`);
const parts = Object.fromEntries(
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .formatToParts(new Date(league.lockAt))
    .map((p) => [p.type, p.value]),
);

// 18:30 London on that date → UTC instant (guess-then-correct for BST/GMT)
let ts = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 18, 30);
ts -= londonOffsetMin(ts) * 60000;
ts = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 18, 30) - londonOffsetMin(ts) * 60000;
const newLockAt = new Date(ts).toISOString();

console.log(`${league.name} (${league.id})`);
console.log(`  lockAt: ${league.lockAt} → ${newLockAt} (18:30 Europe/London)`);
await writeDoc(`leagues/${league.id}/meta`, { ...league, lockAt: newLockAt });
console.log('  written ✓');
