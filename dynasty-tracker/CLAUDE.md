# Dynasty Tracker — project bible

A dynasty fantasy football tracker built as a static web app. I manage five Sleeper dynasty leagues and want a site I can deploy and manually refresh each week with one command.

**Deployment (decided 2026-08-17):** lives in the Claude Projects monorepo; deploy via `vercel deploy --prod` from this subfolder (same pattern as Chelsea Tracker / The Acca). Weekly routine: `npm run refresh`, review, commit `data/` (specific paths only — the monorepo is public, never `git add -A`), deploy. The GitHub Action phone-refresh from the original brief is parked.

## Who I am

- Sleeper username `Matteop9`, user_id `1288931369333829632`
- All five leagues are superflex (SUPER_FLEX slot), PPR, dynasty (settings.type=2), pick trading enabled
- Playoffs start week 15, 6 teams qualify

## Leagues (2026 season)

| League | league_id | Teams | Scoring notes |
|---|---|---|---|
| Olympian League | 1362890836475404288 | 12 | TE prem +0.5, 6pt pass TD, taxi 5, FAAB 100 |
| The Syndicate | 1332929440778297344 | 12 | Yardage bonuses (100/200 rush+rec, 300/400 pass), TE prem, 6pt pass TD |
| Stars & Crown | 1313029614053892096 | 10 | 6pt pass TD, taxi 5 |
| The Kingsmen | 1312484177249079296 | 12 | 4pt pass TD, TE prem, taxi 4 |
| Raiders Still suck | 1307349910315618304 | 12 | 4pt pass TD, TE prem, FAAB 200, taxi 5 |

League IDs roll over each season (auto_continue on). At the start of a new season, re-resolve via `GET https://api.sleeper.app/v1/user/1288931369333829632/leagues/nfl/{season}` and update config.

## Data sources (all free, no auth, CORS-open)

**Sleeper API** (`https://api.sleeper.app/v1/...`):
- `/state/nfl` — current week/season. If `season_type` is `pre` or week 0, produce a preseason baseline instead of a gameweek review.
- `/league/{id}/rosters` — rosters; match me via `owner_id`. Includes wins/losses/fpts in `settings`. `taxi` and `reserve` arrays list taxi-squad and IR player_ids.
- `/league/{id}/users` — display names for owner_ids.
- `/league/{id}/matchups/{week}` — per-team and per-player points; `matchup_id` pairs opponents.
- `/league/{id}/transactions/{week}` — trades, waivers, FAAB spent.
- `/league/{id}/traded_picks` — pick capital.
- `/players/nfl` — ~5MB master dump (player_id → name, position, team, age, years_exp, injury_status). Cache to `data/{season}/players.json`; refresh at most weekly, never per page load.
- `/players/nfl/trending/add` and `/trending/drop` — market momentum.

**FantasyCalc API** (dynasty market values):
- `GET https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=2&numTeams=12&ppr=1` (and `numTeams=10` for Stars & Crown)
- Each entry: `player.sleeperId` (join key), `value`, `overallRank`, `positionRank`, `trend30Day`, `maybeTier`, `player.maybeAge`, `redraftValue`, `redraftDynastyValueDifference`
- `redraftValue >> value` = win-now asset. `value >> redraftValue` = future/youth asset.

## Architecture

Snapshot-based static site:

```
dynasty-tracker/
  CLAUDE.md                    # this brief, maintained as the project bible
  config/
    leagues.json               # league table above + per-league scoring adjustments
    thresholds.json            # all tunable numbers (see Methodology) — nothing hardcoded
  scripts/
    refresh.ts                 # pulls all Sleeper + FantasyCalc data, writes dated snapshot
    insights.ts                # Phase 4: YouTube transcript ingestion
  data/
    2026/
      players.json             # cached Sleeper player dump
      preseason.json
      week-01.json ...         # one snapshot per refresh
      insights/                # Phase 4 output
  src/                         # Vite + React app, reads snapshots from data/
```

- `npm run refresh` = full weekly update.
- The site reads the latest snapshot by default and diffs against the previous one for all delta displays. A snapshot picker lets me view any past week.
- Keep a "live fetch" fallback button in the UI that pulls current data client-side (both APIs are CORS-open) without writing a snapshot, for mid-week curiosity.
- Static hosting, no server, no API keys, no database. TypeScript throughout. Shared computation logic must live in one module used by both `scripts/refresh.ts` and `src/` — never duplicate the maths.

**Implementation notes (as built):**
- Snapshots store raw API data only; all analytics run at view time in `src/lib/engine/` (pure functions) so retuning `config/thresholds.json` re-grades history without re-fetching.
- Fetch clients + snapshot assembly live in `src/lib/api/` (pure `fetch`, works in node via tsx and in the browser for the live-fetch button).
- Snapshots are bundled at build time via `import.meta.glob` in `src/lib/snapshots.ts` — deploy after each refresh to publish.
- Config JSON uses `_`-prefixed comment keys, stripped and zod-validated in `src/lib/config.ts`.
- UI (per user feedback, v0.2.0): league tabs rather than stacked sections; verdicts as three columns (Sell / Unsure / Hold — `Unsure` is a real engine verdict for borderline calls); any team's direction can be manually overridden via dropdowns (persisted in localStorage under `dynasty_` keys, threaded into `buildReport` so verdicts/counterparties/buy targets follow the override).
- Training loop (v0.4.0): any verdict card can be disputed in the UI — the card re-files under the user's verdict with a note, the engine's view stays visible, and the dispute (with frozen decision context) persists in localStorage (`dynasty_verdict_disputes`). "Copy training report" in the header exports all disputes as markdown addressed to Claude. **When a training report is pasted into a session, the obligations are:** (1) fix the number in `config/thresholds.json` or the rule in `src/lib/engine/verdicts.ts` (or reject the dispute with reasoning); (2) append the entry to STRATEGY.md's Training log; (3) add a regression case to `tests/verdicts.test.ts` reproducing the dispute; (4) never regress STRATEGY.md's hard rules. Once the engine agrees, the card shows "Engine now agrees" and the user clears it.

## Methodology (the analytical core)

### League-adjusted values
FantasyCalc values are league-agnostic. Before any ranking or lineup maths, adjust per league (multipliers in `config/thresholds.json`, sensible defaults, easily tuned):
- TE premium leagues: multiply TE values by ~1.1
- 4pt pass TD leagues: multiply QB values by ~0.92 relative to the 6pt baseline
- Yardage-bonus league (Syndicate): small boost to high-volume RB/WR (optional, low priority)

### Team profile (per team, per league)
1. Join roster player_ids to FantasyCalc (via sleeperId) and the player dump (age, injury).
2. Compute: total roster value; starter value (best legal lineup by adjusted value, using the league's actual `roster_positions`); depth value (rest); age-weighted split (share of value in ≤25 / 26–28 / 29+); pick capital.
3. Taxi and IR handling: taxi players are excluded from starter-value calculation but included in total value and youth share. IR players excluded from starter value.
4. Pick capital: value traded + native picks for the next two drafts. 1sts slotted early/mid/late using the current standings of the team that owes the pick (early ≈ top-15 player value, mid ≈ rank-18, late ≈ rank-30); 2nds ≈ rank-60 value; picks two seasons out discounted 15%.

### Direction classification
- **Contender**: top-3 starter value, high win-now share, competitive record
- **Ascending**: high total value, high ≤25 share, thin starters — 1 to 2 moves from contending
- **Mushy middle**: mid-table on both — flag as the danger zone, recommend picking a lane
- **Rebuilding**: low starter value, high pick capital or youth share

My team gets a full profile; opponents get one-line classifications (they are the trade market).

### Player archetypes
- **Win-now vet**: age 27+, redraftValue > value
- **Youth asset**: age ≤24 (age alone — a rookie is a youth asset regardless of FantasyCalc's redraft split)
- **Prime**: 25–27, balanced
- **Declining**: past the position's age cliff (QB 33 / RB 28 / WR 28 / TE 31, `decliningMinAgeByPosition`) with a negative trend30Day

### Verdicts (my roster, per league)

Direction-first — the same player gets a different verdict on different teams. The full rules and
their sourcing live in `STRATEGY.md` (distilled from the `transcripts/` research, 2026-08-17);
the two hard rules that must never regress:

1. **A youth asset on a rebuild is never sold as duplicate depth.** Bench time is irrelevant to a
   rebuild; value growth is the job. (The old engine told a rebuild to sell a 22-year-old rookie
   WR4 as "real value doing nothing on the bench" — that was the bug.)
2. **An ageing producer who starts for a contender is a Hold** (the Henry rule: production
   outweighs value bleed while you contend). Contenders only sell ageing vets who don't crack the
   lineup.

Other headline rules: rebuilds sell every realised-ceiling asset (vets, declining, redraft-dominant
primes) into the August window; contenders consolidate valuable bench youth up-tier (never into a
falling trend — no selling the bottom); backup QBs are never depth-sold in superflex; ascending
teams sell vets (Unsure — push-year exception) and buy prime/youth, not ageing producers; buy
targets for contenders must raise starter value, while youth buys for rebuilds are ranked by asset
value (a stash doesn't need to start).

## Features by phase

### Phase 1 — Foundation (CURRENT)
- `refresh.ts`, snapshot format, config files
- Preseason baseline view: cross-league summary (direction, starter rank, youth share, pick capital per league), then per-league sections with my full profile, verdict table (Player | Pos | Age | Adj value | 30d | Verdict | Counterparty), buy targets, opponent one-liners
- League-adjusted values applied everywhere
- Markdown export of the full report (copy button)

### Phase 2 — Deltas and history
- Week-over-week diffs: player value change, team rank movement, direction changes prominently flagged
- Snapshot picker
- Auto-generated "what changed this week" markdown section

### Phase 3 — Player Fit Finder (a headline feature)
Search any player (index built from the snapshot, instant picker). Selecting one shows a card with one row per league:

| Column | Content |
|---|---|
| Status | Owned by me / owned by {owner} ({direction}) / free agent |
| Fit | Archetype × my direction in that league: Strong buy fit / Fits / Wrong fit — sell / No fit |
| Lineup impact | Run the lineup optimiser with and without the player using league-adjusted values; report marginal starter value added (zero = bench depth, say so bluntly) |
| Tradeability | Easy / Moderate / Hard with stated reasons |
| Route | If not owned: opening offer anchored in pick equivalents ("≈ mid 1st + early 2nd here") and why the holder sells. If owned and wrong fit: the natural buyers (opposite phase + he'd crack their optimal lineup) and which of my leagues offers the best sale price given scoring context |

Tradeability score from four weighted signals on the holder's side (weights in config):
1. Phase mismatch (rebuilder holding a win-now vet = motivated seller) — heaviest weight
2. Positional surplus (player not in the holder's optimal lineup = much easier)
3. Trend (falling value = willing seller; a rising youth asset on a rebuilder = Hard regardless of everything else)
4. Roster pressure (holder at roster/taxi limits with rookie picks incoming)

Cross-league arbitrage must be visible: if I hold the same player in multiple leagues, the card should make clear where to sell and where to keep (e.g. sell the TE in the TE-prem league).

### Phase 4 — In-season weekly review
- Per league: result and score vs opponent, updated record and standings, playoff picture (simple Monte Carlo over remaining schedule using points-for distributions)
- Top scorer, biggest bust vs positional expectation, bench points left on bench
- Transaction ledger since last snapshot; one-line grades on any trades
- FAAB dashboard: budget remaining vs league median, trending adds crossed with my roster gaps, suggested bids
- Injury flags from the player dump
- Playoff picture (simple Monte Carlo over remaining schedule using points-for distributions)

### Phase 5 — Extras (in rough priority order)
- Content insights: `scripts/insights.ts` pulls recent video transcripts from the Dynasty Domain YouTube channel (channel_id `UCy6AzBHW2_w3lyA_AqUTTmg`, RSS feed `https://www.youtube.com/feeds/videos.xml?channel_id=UCy6AzBHW2_w3lyA_AqUTTmg`) using `youtube-transcript-api` or `yt-dlp --write-auto-sub`, extracts per-player buy/sell/hold sentiment, stores tags in the snapshot; UI shows "DD: buy" beside my verdicts. Design it so more channels can be added in config.
- Cross-league exposure view: players held in 2+ of my leagues (correlated injury risk)
- Watchlist with flags: value crossed a threshold, appeared in trending adds since last snapshot
- Contention window chart: youth share vs starter rank scatter per league over time

## Conventions
- UK spelling in all UI copy and reports. No emojis anywhere.
- Verdicts are opinionated: lead with the recommendation, never a neutral menu.
- Every tunable number (age bands, value floors, direction cutoffs, tradeability weights, scoring multipliers, pick valuations) lives in `config/thresholds.json` with a comment on what it does.
- Dark, football-adjacent aesthetic: field-green/chalk/amber palette with Barlow Condensed headers.
- Mobile-friendly.
- Do not build ahead of the current phase without asking.
