// Dev-only: mint a 1-hour session cookie for an existing user so authed pages can be
// smoke-tested locally without the password flow. Prints NO hashes and never writes.
// Usage: node scripts/dev-session.mjs [username]
import { readFileSync } from 'node:fs';
import { SignJWT } from 'jose';
import { list } from '@vercel/blob';

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const ROOT = 'spoton/v1';
async function readDoc(prefix) {
  const { blobs } = await list({ prefix: `${ROOT}/${prefix}/`, limit: 1000 });
  if (blobs.length === 0) return null;
  const latest = blobs.sort((a, b) => (a.pathname < b.pathname ? -1 : 1)).at(-1);
  const res = await fetch(latest.url, {
    headers: { authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
  });
  return res.json();
}

const [usersDoc, indexDoc] = await Promise.all([readDoc('users'), readDoc('leagues-index')]);
const users = usersDoc?.users ?? [];
console.log('users:', users.map((u) => u.username).join(', '));

const username = process.argv[2] ?? 'matteo';
const user = users.find((u) => u.username === username);
if (!user) throw new Error(`user "${username}" not found`);

for (const [id, l] of Object.entries(indexDoc?.leagues ?? {})) {
  const meta = await readDoc(`leagues/${id}/meta`);
  const mine = l.memberIds.includes(user.id) ? ' [member]' : '';
  console.log(
    `league: ${l.name} (${id})${mine} — ${l.memberIds.length} players, comps ${meta?.competitionIds?.join('+')}, locks ${meta?.lockAt}`,
  );
}

const jwt = await new SignJWT({ userId: user.id, username: user.username, displayName: user.displayName })
  .setProtectedHeader({ alg: 'HS256' })
  .setIssuedAt()
  .setExpirationTime('1h')
  .sign(new TextEncoder().encode(process.env.AUTH_SECRET));
console.log('cookie:', `spoton_session=${jwt}`);
