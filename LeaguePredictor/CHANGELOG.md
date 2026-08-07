# Changelog — Spot On

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
