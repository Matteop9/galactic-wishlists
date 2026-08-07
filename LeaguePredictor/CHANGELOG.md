# Changelog — Spot On

## v0.2.0 — 2026-08-07

Design system v2 integrated (ClaudeDesign/ — brand kit, share cards, and 5 new assets):

- **OG share cards** ported to `next/og` per the share-card spec: `/api/og/join/[code]`
  renders the league invite card (name, competition chip, avatar-initial stack, +n
  overflow) and `/api/og/default` the generic card; invite pages now render publicly
  with sign-in CTAs so WhatsApp/iMessage/Slack unfurls get the card instead of a
  redirect to the login page
- **Season states** on the league page: locked-but-not-kicked-off shows the countdown
  "waiting" illustration with links to everyone's picks (no more placeholder-data
  leaderboard); season complete crowns the winner with the inverted-podium illustration
- Hero floodlight background on the landing page, ambient 22px dot grid under app
  pages, "no leagues yet" illustration with the kit's copy
- Brand-kit corrections: wordmark is Archivo 800 uppercase with a hairspace,
  diff chips now go amber 1–4 and red 5+ (was 4+)

## v0.1.1 — 2026-08-07

Claude Design system integrated (from `Spot on design system.zip`):

- Palette swapped to the branded tokens: near-black `#0B0F12` bg, neutral surfaces,
  electric lime `#C6FA3F` primary/celebration colour, teal accent, and the semantic
  spot-on/close/way-off trio with dedicated chip backgrounds; light-theme tokens
  included behind `[data-theme="light"]` (no toggle yet)
- Type: Archivo (display) + IBM Plex Sans (UI) + IBM Plex Mono for every score,
  position and diff number
- Target-motif brand mark in the header and landing hero; SVG favicon + app icon
  replace the scaffold defaults

## v0.1.0 — 2026-08-07

First release, live at https://spot-on-liart.vercel.app

**The game** (digitised from the House Picks Excel): predict the complete final league
table before the season starts, plus a top scorer per competition. 1 point per position
off, per team; −5 per competition for calling the top scorer; lowest total wins.

- Accounts: username + password (bcrypt + JWT cookie), no email required
- Leagues: create with a per-league pick of competitions (9 domestic leagues from
  football-data.org free tier; PL + Championship pre-ticked) and a prediction deadline
- Invites: 6-char code / shareable `/join/[code]` link, with login-redirect preserved
- Prediction editor: drag-and-drop (dnd-kit) + ▲▼ nudge buttons, squad-sourced top
  scorer combobox with free-text fallback, explicit save + 3s debounce autosave
- Privacy: everyone's picks hidden until the deadline, then frozen and public
- Live leaderboard: joint ranks on ties, per-competition breakdown, picks-vs-actual
  detail pages with diff chips (● spot on / N off)
- Scoring engine: pure + unit-tested (Vitest, 14 tests), including a golden test that
  reproduces last season's Excel totals exactly (Will 197, Dom 211, Luke 218, Matteo 219)
- Storage: Vercel Blob private store, versioned-JSON-document pattern (writes create new
  timestamped blobs; reads resolve latest; old versions pruned)
- football-data.org calls cached in the store (standings 15 min, scorers 1 h, teams 7 d)
  — never called per page view, safe within the 10 req/min free tier
- DESIGN_BRIEF.md written for Claude Design (logo, palette, fonts, backgrounds, OG
  templates); app ships on a placeholder dark theme wired entirely through CSS variables
