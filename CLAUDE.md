# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Each project lives in its own subfolder. Standalone HTML/JS tools — no build process, no dependencies.

- **`galactic-wishlist/`** — Batch-adds items to 6 Galactic Tycoons game wishlists via API, driven by `config.json`
- **`alteryx-documenter/`** — Parses Alteryx workflow XML files and generates plain-text documentation
- **`task-tracker/`** — Task tracking tool, live at matteop9.github.io/task-tracker
- **`us-trip/`** — Interactive US road trip planner (Sept 2025) — Leaflet map, day-by-day navigation, animated character marker

> **Convention:** Every new project gets its own subfolder here.

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
