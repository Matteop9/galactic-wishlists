# Chelsea Tracker

Supporters Club ticket application tracker. **Live at [chelsea-tracker.vercel.app](https://chelsea-tracker.vercel.app).**

Each season Chelsea publish "order periods" — windows during which the supporters club secretary accepts ticket applications. This app lets the group:

- Pick who they are on arrival (no logins — person picker overlay, remembered per device)
- Mark interest per game: **Definitely / Interested / If others go / Not interested**
- See everyone's answers in one grid (the "Everyone" tab), with per-game apply status
- Draft the application email in one click (`mailto:` from an editable template with `{count}`, `{opponent}`, `{date}`, `{members}`, `{applier}` placeholders)
- Record who has been applied for and the outcome (pending / successful / unsuccessful)
- Track the **8 games per member per season** supporters-club limit
- Edit every game and deadline individually (they're subject to change), add cup games, manage members, and leave feedback — all in the Settings tab

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4, deployed on Vercel
- **Vercel Blob** for storage — one JSON document, no database

### Storage design

All state lives in a single JSON document in Vercel Blob (`src/lib/store.ts`). Because Blob **overwrites are eventually consistent** (stale reads up to ~60s), every write creates a *new* blob with a timestamped pathname (`chelsea-tracker/data-<ms>-<rand>.json`); reads fetch the newest version, and writes prune all but the last 5. Updates are action-based patches (`POST /api/data`) applied server-side, so concurrent users editing different things don't clobber each other. True simultaneous writes are last-write-wins — acceptable at this group size.

Without `BLOB_READ_WRITE_TOKEN` the app runs in a clearly-bannered in-memory demo mode.

Note: the data blob is on a public (unguessable) URL and the app itself has no auth — don't put anything in it more sensitive than names + membership numbers.

## Development

```bash
npm run dev      # local dev (uses .env.local pulled via `vercel env pull` for real storage)
npm run build
npm run deploy   # vercel deploy --prod --yes
```

Season fixtures are seeded from the club's Order Periods PDF in `src/lib/seed.ts` (games only — members are added through the app so membership numbers stay out of the repo). The seed only applies when the Blob store is empty; "Start a new season" in Settings clears games/answers while keeping members.
