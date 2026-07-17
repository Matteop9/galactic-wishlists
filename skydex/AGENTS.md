<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# UI conventions (binding for every update)

1. **Every sighting photo opens the same card.** Any rendered sighting photo, on any page, must open the shared enriched Lightbox on tap — use `components/SightingPhoto.tsx` (wraps any thumbnail; `SightingCardZoom` for standalone cards) or `SightingCard`'s `onOpen`. The info shown comes from the shared `SightingSpecs` block in `components/SightingCard.tsx` — never hand-roll a second detail view.
2. **Every handle links to the profile.** Any rendered `@handle` must be a `<Link href={/u/${handle}}>`, with the avatar *inside* the link so avatar + handle are one target (see `SightingSpecs` for the canonical markup).
3. **Exceptions must be commented at the render site.** Only deliberate exceptions are allowed (e.g. `ReviewQueue` photos stay anonymous by design), and each carries a comment explaining why it opts out.

# Pushing an update (release runbook)

SkyDex is the Next.js app in this folder, live at **skydex-two.vercel.app** (Vercel project `skydex`, linked via `.vercel/project.json`; Supabase project `skydex`, id `iwfgwokchloeiyelpbec`).

## 1. Version + release notes (every user-facing release)

Semantic MAJOR.MINOR.PATCH — patch = feature/fix in-phase, minor = phase milestone, major = public launch.

- `lib/releases.ts` — prepend a `RELEASES` entry (user-friendly bullets; this renders on the home screen; `CURRENT_VERSION` derives from the top entry).
- `CHANGELOG.md` — mirror the release as a technical entry (files/migrations touched, the why). Uncommitted work-in-progress accumulates under `## Unreleased`; fold it into the version section on release.
- `package.json` — bump `"version"` to match.
- Check for surprises before writing: another session may have released the same day — read the top of `CHANGELOG.md` and `git log --oneline -3` first, and fold into the existing version entry rather than duplicating it.

## 2. Commit + push (GitHub)

- ⚠️ This folder is a subproject of ONE shared git repo (`Matteop9/galactic-wishlists`) with a **public remote**. **Never `git add -A` / `git add ..`** — stage explicit paths inside `skydex/` only, and never commit secrets (`.env*` stays untracked).
- Commit message style: `SkyDex v0.x.y — short description` (follow-ups: `SkyDex v0.x.y follow-up — ...`).
- `git push origin main`.

## 3. Deploy (Vercel) — pushing to GitHub does NOT deploy

There is no git→Vercel integration (deliberate: the monorepo is public and shared). Deploys are manual, from this folder:

```bash
npx vercel --prod --yes
```

- Auth: the Vercel CLI is logged in as `matteop9` (`npx vercel whoami` to confirm). CLI is not installed globally — use `npx`.
- The CLI uploads and builds the **local directory**, so make sure the working tree matches what you just committed (`git status --porcelain -- .` should be clean).
- Wait for `readyState: READY` in the output (takes a couple of minutes).

## 4. Verify live

- Home page shows the new version number + release notes (they render from `lib/releases.ts`).
- Spot-check whatever the release changed on **https://skydex-two.vercel.app** itself, not just localhost.

## Database changes

Schema/RPC changes go through Supabase MCP migrations (`apply_migration`) against project `iwfgwokchloeiyelpbec` — they are live the moment they're applied, independent of the Vercel deploy. Sequence carefully: ship backwards-compatible DB changes before the code that needs them.
