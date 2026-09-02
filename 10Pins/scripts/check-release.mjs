/**
 * Release gate — runs as `prebuild`, so it fires on `npm run build`, on
 * `npm run deploy` (which builds) and on any Vercel build. A release cannot
 * ship without telling the players what changed.
 *
 * It checks three things line up:
 *   1. package.json `version`
 *   2. the newest entry in `src/lib/changelog.ts` (the in-app What's new page)
 *   3. the top heading of `CHANGELOG.md` (the technical write-up)
 *
 * plus the shape rules for the in-app list: unique, strictly descending
 * versions, ISO dates that never go forwards as you read down, a title and at
 * least one item per release, and no emoji or exclamation marks (the de-vibe
 * pass, 2 Sept).
 *
 * Escape hatch, for a build that genuinely is not a release (a hotfix rebuild
 * of an already-published version, a CI experiment): SKIP_RELEASE_CHECK=1.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const fail = (message) => problems.push(message);

if (process.env.SKIP_RELEASE_CHECK === '1') {
  console.log('check-release: skipped (SKIP_RELEASE_CHECK=1)');
  process.exit(0);
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const source = readFileSync(join(root, 'src/lib/changelog.ts'), 'utf8');
const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');

/**
 * Pull the RELEASES array literal out of the TypeScript source by matching
 * brackets, then evaluate it. The literal is plain data — no types, no calls —
 * so this stays a parse rather than running the app's code.
 */
function readReleases(ts) {
  const marker = 'export const RELEASES: Release[] = ';
  const start = ts.indexOf(marker);
  if (start === -1) throw new Error('RELEASES array not found in src/lib/changelog.ts');
  // ...the `[` of the array literal, not the one in the `Release[]` annotation.
  const open = start + marker.length;
  if (ts[open] !== '[') throw new Error('RELEASES is not an array literal');
  let depth = 0;
  for (let i = open; i < ts.length; i += 1) {
    if (ts[i] === '[') depth += 1;
    else if (ts[i] === ']') {
      depth -= 1;
      if (depth === 0) {
        const literal = ts.slice(open, i + 1);
        return new Function(`return ${literal};`)();
      }
    }
  }
  throw new Error('RELEASES array is not closed in src/lib/changelog.ts');
}

const releases = readReleases(source);
const SEMVER = /^\d+\.\d+\.\d+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMOJI = /\p{Extended_Pictographic}/u;

const compare = (a, b) => {
  const parse = (v) => v.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i += 1) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
};

if (releases.length === 0) fail('src/lib/changelog.ts: RELEASES is empty.');

releases.forEach((release, i) => {
  const at = `release ${i} (${release.version ?? 'no version'})`;
  if (!SEMVER.test(release.version ?? '')) fail(`${at}: version must be x.y.z.`);
  if (!ISO_DATE.test(release.date ?? '')) fail(`${at}: date must be YYYY-MM-DD.`);
  if (!release.title?.trim()) fail(`${at}: needs a title.`);
  if (!Array.isArray(release.items) || release.items.length === 0)
    fail(`${at}: needs at least one item.`);
  const copy = [release.title ?? '', ...(release.items ?? [])].join('\n');
  if (copy.includes('!')) fail(`${at}: no exclamation marks in release copy.`);
  if (EMOJI.test(copy)) fail(`${at}: no emoji in release copy.`);
  if (i > 0) {
    const prev = releases[i - 1];
    if (compare(prev.version, release.version) <= 0)
      fail(`${at}: versions must descend strictly (after ${prev.version}).`);
    if (prev.date < release.date) fail(`${at}: dated after the release above it.`);
  }
});

const latest = releases[0];

if (latest && latest.version !== pkg.version) {
  fail(
    `package.json is ${pkg.version} but the newest entry in src/lib/changelog.ts is ${latest.version}.\n` +
      '  Bump one to match the other: every version bump needs a release note, and every note needs a bump.',
  );
}

// The repo changelog's top heading carries the version from this release on.
// Older headings are date-only and deliberately not touched.
const heading = changelog.split('\n').find((line) => line.startsWith('## '));
if (!heading) {
  fail('CHANGELOG.md has no "## " entry.');
} else if (latest && !heading.includes(`v${latest.version}`)) {
  fail(
    `CHANGELOG.md's top entry does not mention v${latest.version}.\n` +
      `  Top entry: ${heading.trim()}\n` +
      `  Add the release entry, headed "## v${latest.version} — ${latest.date} — <what shipped>".`,
  );
}

if (problems.length > 0) {
  console.error('\ncheck-release failed:\n');
  for (const problem of problems) console.error(`- ${problem}`);
  console.error(
    '\nThe release routine is in CLAUDE.md ("Releasing"). If this build is genuinely not a\n' +
      'release, re-run with SKIP_RELEASE_CHECK=1.\n',
  );
  process.exit(1);
}

console.log(
  `check-release: v${latest.version} (${latest.date}) — "${latest.title}", ${latest.items.length} note${
    latest.items.length === 1 ? '' : 's'
  }.`,
);
