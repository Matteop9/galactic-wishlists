// Local smoke test for the authed pages: mints a 1h session in-process (never printed),
// fetches each page from the dev server, and asserts on the rendered HTML.
// Usage: node scripts/smoke.mjs <leagueId> [username] [baseUrl]
import { readFileSync } from 'node:fs';
import { SignJWT } from 'jose';
import { list } from '@vercel/blob';

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const leagueId = process.argv[2];
const username = process.argv[3] ?? 'matteop9';
const base = process.argv[4] ?? 'http://localhost:3000';
if (!leagueId) throw new Error('usage: node scripts/smoke.mjs <leagueId>');

async function readDoc(prefix) {
  const { blobs } = await list({ prefix: `spoton/v1/${prefix}/`, limit: 1000 });
  if (blobs.length === 0) return null;
  const latest = blobs.sort((a, b) => (a.pathname < b.pathname ? -1 : 1)).at(-1);
  const res = await fetch(latest.url, {
    headers: { authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
  });
  return res.json();
}

const users = (await readDoc('users'))?.users ?? [];
const user = users.find((u) => u.username === username);
if (!user) throw new Error(`user ${username} not found`);
const jwt = await new SignJWT({ userId: user.id, username: user.username, displayName: user.displayName })
  .setProtectedHeader({ alg: 'HS256' })
  .setIssuedAt()
  .setExpirationTime('1h')
  .sign(new TextEncoder().encode(process.env.AUTH_SECRET));

let failures = 0;
async function page(path, checks) {
  const res = await fetch(`${base}${path}`, { headers: { cookie: `spoton_session=${jwt}` } });
  const html = await res.text();
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  console.log(`\n== ${path} → ${res.status} (${(html.length / 1024).toFixed(0)}kb)`);
  for (const [label, test] of Object.entries(checks)) {
    const ok = typeof test === 'function' ? test(html, text) : text.includes(test) || html.includes(test);
    if (!ok) failures++;
    console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}`);
  }
  return { html, text };
}

await page(`/leagues/${leagueId}`, {
  'league name renders': 'JSY London',
  'picks button': 'Everyone’s picks',
  'fixtures button': 'Who to cheer for',
  'leaderboard totals column': 'Total',
});

const picks = await page(`/leagues/${leagueId}/table`, {
  'grid heading': 'The grid',
  'tab: everyone’s picks': 'Everyone’s picks',
  'tab: vs actual table': 'vs the actual table',
  'consensus line': 'Title calls:',
  'scorer row present': '⚽',
  'crest images render': (h) => (h.match(/crests\.football-data\.org/g) ?? []).length > 80,
  'spot-on tint appears': 'bg-spot-bg',
  'cheer link': 'Who to cheer for',
});
const headerZone = picks.html.slice(0, picks.html.length);
console.log(
  '  columns:',
  [...headerZone.matchAll(/title="([^"]{2,30})">([^<]{1,12})</g)]
    .filter((m) => m[2].trim() && m[1].startsWith(m[2].replace('…', '')))
    .map((m) => m[1])
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 12)
    .join(', '),
);

await page(`/leagues/${leagueId}/table?view=table`, {
  'actual-table view renders team rows': (h, t) => /Arsenal|Liverpool|Man City/.test(t),
  'predicted-position cells': (h) => (h.match(/min-w-8/g) ?? []).length > 100,
});

const fx = await page(`/leagues/${leagueId}/fixtures`, {
  'heading': 'Who to cheer for',
  'day group heading': (h, t) => /(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day \d+ (August|September)/.test(t),
  'a verdict renders': (h, t) => /(Cheer for|Cheer against|draw suits|Torn|Happy either way)/.test(t),
  'stake chips render': (h, t) => /to (climb|drop)/.test(t) || t.includes('spot on'),
  'room line (post-lock)': 'The room —',
  'both comps present': (h, t) => t.includes('Premier League') && t.includes('Championship'),
});
const dayIdx = fx.text.search(/(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day \d+ (August|September)/);
console.log('  fixtures excerpt:', dayIdx >= 0 ? fx.text.slice(dayIdx, dayIdx + 700) : '(no day heading found)');

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);
