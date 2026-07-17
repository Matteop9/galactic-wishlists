<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

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
