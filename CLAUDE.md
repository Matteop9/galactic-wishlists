# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Each project lives in its own subfolder. Standalone HTML/JS tools — no build process, no dependencies.

### Personal (public exposure fine, any tech stack)
- **`galactic-wishlist/`** — Batch-adds items to 6 Galactic Tycoons game wishlists via API, driven by `config.json`
- **`us-trip/`** — Interactive US road trip planner (Sept 2025) — Leaflet map, day-by-day navigation, animated character marker
- **`wobbl/`** — Jelly business landing page: brand showcase, product range, collab pitching, events. Dark chrome aesthetic. Single-file, no dependencies.
- **`altar/`** — Wedding services site for Maddie & Sophie. Services: nannies, gel nails, photography, hair + wobbl favours crossover. Basket + enquiry checkout, Supabase order submission (anon insert). Dark editorial aesthetic. LocalStorage prefix `altar_`. Stack: Supabase CDN + Google Fonts (Playfair Display, Inter, Nunito).
- **`rent-finder/`** — London rental tracker: saved searches + new-listing email alerts. Sources individual listings via Apify scrapers (Rightmove + Zoopla) because no clean rental-listings API exists. Stack: Next.js 16 (App Router) + Supabase (Postgres + magic-link auth) + Apify REST API + Vercel Cron + Resend. Pluggable `RentalSource` adapter; "new" = unseen `(search, portal, external_id)`.
- **`lms/`** — Last Man Standing football survivor game (freemium, web-now/iOS-later). Organiser creates a league, picks competitions + house rules (lives, draws, missed-pick, all-out), players pick one team per game week to win; no team re-use; last survivor wins. Stack: Next.js 16 (App Router) + Supabase (Postgres + RLS + magic-link) + api.football-data.org + Vercel Cron. All rules live on the `leagues` row. Settlement engine in `src/lib/rules.ts`; `/api/cron/settle` locks + resolves rounds. Freemium = 1 free league per owner per year.
- **`Chelsea-Tracker/`** — Chelsea Supporters Club ticket application tracker, live at chelsea-tracker.vercel.app. No logins (person picker), per-game interest levels, apply-email drafting from template, outcome + 8-game-limit tracking, in-app deadline editing. Stack: Next.js 16 (App Router) + Vercel Blob (versioned single-JSON-document store — writes create new timestamped blobs because Blob overwrites are eventually consistent). Members are seeded via the live API, never committed (public repo).

### Work (keep private, target enterprise stack)
- **`alteryx-documenter/`** — Parses Alteryx workflow XML files and generates plain-text documentation
- **`task-tracker/`** — Task tracking tool, live at matteop9.github.io/task-tracker
- **`hubspot-task-creator/`** — Extracts tasks from Teams transcripts via Claude, interactive review/edit with knowledge base, sends to HubSpot. Stack: Supabase (auth + PostgreSQL) + Claude Haiku + HubSpot Tasks API

> **Convention:** Every new project gets its own subfolder here. All new projects must be classified as personal or work.

## Running Locally

HTML files with `fetch()` calls must be served over HTTP (not `file://`):

```bash
python -m http.server 8000
# or
npx http-server
```

## Architecture

### galactic-wishlist/galactic-wishlist.html + config.json

`config.json` is the single source of truth — it contains the bearer token, all 6 wishlist API endpoints, and item lists. The HTML loads this file at runtime (with `?v=Date.now()` cache-busting) and auto-generates the UI from it.

Request flow: user clicks "Run All" → `runAll()` marks all rows as loading → `Promise.allSettled()` fires all 6 POST requests in parallel → per-row status updates as each settles.

The canvas animation (stars, shooting stars, supernovas, nebulas) sits behind the UI via `pointer-events: none`.

### alteryx-documenter/alteryx-documenter.html

Self-contained XML parser and doc generator:

1. User uploads `.yxmd`/`.yxwz`/`.yxmc` file
2. `walkNodes()` recursively traverses XML, building a tool registry with parent/child relationships
3. `extractDetail()` handles 20+ tool-specific configurations (Join, Filter, Formula, Summarize, etc.)
4. `buildExecutiveSummary()` + per-tool sections produce the formatted output text

### hubspot-task-creator/index.html

Single-file app. No build process. Supabase JS loaded via CDN.

Flow: login → paste/upload transcript → Claude extracts tasks (owner, description, company, due) → knowledge base corrections auto-applied (highlighted amber) → user reviews/edits inline → send to HubSpot Tasks API → corrections learned and saved back to Supabase.

**Supabase tables:** `owner_map`, `name_corrections`, `sessions`, `tasks`. Schema in `schema.sql`.

**All keys** (Supabase URL/key, Anthropic key, HubSpot token) stored in browser `localStorage` with prefix `htc_`. No secrets in the repo.

**Transcript formats supported:** Teams WebVTT (`.vtt`), Fireflies tab-separated (`.txt`), plain text.

**HubSpot:** Uses CRM v3 Tasks API (`POST /crm/v3/objects/tasks`). Designed to add company/contact/deal associations later without restructuring.

## config.json Schema (galactic-wishlist)

```json
{
  "last_updated": "<ISO datetime>",
  "bearer_token": "Bearer <token>",
  "requests": [
    { "name": "<wishlist name>", "url": "<API endpoint>", "items": [{ "id": <int>, "am": <int> }] }
  ]
}
```

When updating `config.json`, always update `last_updated` to the current datetime.

## Changelog

Keep `CHANGELOG.md` updated with every meaningful change. Commit messages for config updates follow the pattern: `Update config — YYYY-MM-DD HH:MM:SS`.
