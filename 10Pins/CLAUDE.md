# CLAUDE.md — 10 Pins

Social bowling PWA. Live at https://10pins.vercel.app.

Stack: Vite + React + TS + Tailwind v4 + Supabase (the Acca project, `tenpins` schema — migrations are `tp_00xx`). Deploy with `npm run deploy` from this folder, never `vercel deploy --prod` on its own.

## Releasing

**Every release tells the players what changed.** There are two changelogs and they are not the same document:

| | file | audience | register |
|---|---|---|---|
| In-app | `src/lib/changelog.ts` → the What's new card + `/whats-new` | players | what changed *for you*, 2–5 plain lines |
| Repo | `CHANGELOG.md` | us | how it was built, what was measured, what was left |

`npm run check:release` runs as `prebuild`, so **a build fails unless `package.json`'s version, the newest entry in `src/lib/changelog.ts`, and the top `## ` heading of `CHANGELOG.md` all name the same version.** `npm run deploy` builds, so this cannot be skipped on the way to production.

### The routine, every time

1. **Bump `package.json`** — patch for a fix, minor for anything a player would notice.
2. **Add the entry to the top of `RELEASES` in `src/lib/changelog.ts`**: `version` (matching the bump), `date` (ISO, the day it goes live), a one-line sentence-case `title`, and 2–5 `items`. Write them from the player's side — "filter the feed to one group", not "`feed_events.group_id` filter". No emoji, no exclamation marks, no jargon; the gate enforces the first two.
3. **Add the `CHANGELOG.md` entry**, headed `## v<version> — <date> — <what shipped>`, with the technical detail.
4. `npm run check:release && npm test && npm run build`, then `npm run deploy`.
5. Update `CHANGELOG.md`'s heading to `— LIVE` and the memory file `project_10pins.md` if the state of the project moved.

`SKIP_RELEASE_CHECK=1` exists for a rebuild of an already-published version. It is not for "I'll write the notes later".

### Where the notes surface

- **Feed card** (`src/components/WhatsNewCard.tsx`, mounted by `WhatsNewBanner` in `Home.tsx`) — newest unseen release, dismissible, once.
- **`/whats-new`** (`src/features/whatsnew/WhatsNew.tsx`) — the full history; opening it marks the version seen.
- **Profile → What's new** — always reachable, and the only place the running version is stated.

Seen state is `tenpins.changelog.seen` in localStorage. `FirstRun` marks a brand-new account as seen so it doesn't open to a changelog; a missing key means "had the app before the page existed" and gets only the newest release.
