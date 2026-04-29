# Changelog

## 2026-04-29 — Wellbeing Buddy Phase 1 (wellbeing-buddy/)

### Added
- pnpm monorepo scaffold: `apps/web` (Next.js shell), `apps/worker` (Cloudflare Worker), `packages/shared` (Zod schemas + TS types)
- Supabase schema: `user_preferences`, `health_metrics`, `daily_checkins`, `daily_plans`, `insights` — all RLS-enabled with `owner_all` policies and `updated_at` triggers
- Cloudflare Worker (`wellbeing-worker.matteo-pallot.workers.dev`) — receives Health Auto Export webhook at `POST /health`
  - Token auth via `?token=` query param
  - Parses HAE payload shape `{ data: { metrics: [...] } }` with Zod
  - Maps metric names to DB columns; converts kJ → kcal; rounds fractional step counts
  - Upserts to `health_metrics` via Supabase REST API with `on_conflict=user_id,date`
- End-to-end verified: real HAE export inserting 7 rows into Supabase

## 2026-04-20 — Altar wedding services site (altar/)

### Added
- `altar/index.html` — single-file wedding services landing page for Maddie & Sophie
- Services: Wedding Nannies, Cool Gel Nails, Wedding Photography, Wedding Hair — each with add-to-basket
- wobbl crossover section with jelly cube CSS grid (palette inversion: cream bg, red accent)
- Basket state in localStorage (`altar_basket`); floating basket button + slide-in drawer
- Enquiry checkout form — submits to Supabase `orders` table (anon insert, no auth)
- Settings modal for Supabase credentials (localStorage prefix `altar_`)
- `altar/schema.sql` — `orders` table with RLS (anon insert, authenticated read)
- Dark editorial aesthetic: near-black bg, champagne gold accents, Playfair Display + Inter

## 2026-04-20 — wobbl landing page (wobbl/)

### Added
- `wobbl/index.html` — single-file brand landing page for wobbl jelly business
- Sections: hero, product range (6 cards), brand collabs (confectionery / makeup / drinks), events (pop-ups + truck), retail preview, contact
- Dark chrome aesthetic: near-black background, animated chrome gradient wordmark, silver-bordered cards, CSS grid layout
- Fully responsive — 3-col range grid collapses to 1-col on mobile; burger nav on small screens
- No external dependencies — opens directly from `file://`

## 2026-03-31 — Task Tracker (task-tracker/)

### Added
- `task-tracker/task-tracker.html` — self-contained weekly task tracker app hosted on GitHub Pages at https://matteop9.github.io/task-tracker/
- Reads meeting transcripts (including Fireflies.ai export format) and calls Claude API (Haiku) to extract action items
- Tasks grouped by owner with checkboxes, due date badges (urgent/overdue highlighting), and KPI strip
- Week navigation with timezone-safe Monday-anchored date logic
- SharePoint List integration (optional) — when configured, tasks saved to and loaded from a SharePoint list (`WeeklyTasks`) via SharePoint REST API
- Optimistic UI updates on task completion; reverts on save failure
- First-time API key modal; settings panel for API key and SharePoint site URL/list name
- SharePoint/Local mode badge in header
- `task-tracker/meeting-transcript.txt` — sample Continuum Consulting team stand-up transcript for testing

### Notes
- SharePoint integration requires the file to be hosted on the same SharePoint site (same-origin auth) — CORS blocks it from GitHub Pages
- Teams Tab (website tab) works as a hosting workaround for team access without SharePoint hosting
- BrowserFileHandling PowerShell fix required if hosting directly on SharePoint: `Set-SPOSite -Identity <url> -BrowserFileHandling Permissive`

## 2026-03-31 — Animated space background

### Added
- Canvas-based space animation: twinkling stars, shooting stars, supernovas with glows and spikes, soft nebula blobs
- Header and cards use frosted glass effect (backdrop blur) over the animation

## 2026-03-31 — Config timestamp & HTML update

### Added
- `last_updated` field in `config.json` — displayed on the page so you can confirm when a new config has propagated
- "Config updated" timestamp shown below the header on the web page

## 2026-03-31 — Wishlist URL Update

### Changed
- Updated wishlist IDs for all 6 requests (Alpha, Bravo, Charlie, Tango, Void, Whiskey) to new URLs

## 2026-03-31 — Initial Release

### Added
- `galactic-wishlist.html` — mobile-friendly web page with a single button to fire all wishlist requests in parallel, showing per-request success/error status
- `config.json` — data-driven config file containing bearer token and all 6 wishlist requests (Alpha, Bravo, Charlie, Tango, Void, Whiskey)
- Hosted on GitHub Pages at https://matteop9.github.io/galactic-wishlists/galactic-wishlist.html
