# Acca Tracker — Build Spec for Claude Code

A web app for the 2026/27 Accumulator Challenge: weekly pick entry, results settlement, and leaderboards for a 12-man, two-team betting competition. Replaces `Odds.xlsx`. The spreadsheet's behaviour is the ground truth; this spec encodes it exactly, verified against the ledger (e.g. George's all-time score of 119.7279 reproduces from the seed data).

## 1. Stack

- **React + Vite + TypeScript + Tailwind**, deployed on **Vercel**.
- **Supabase**: Postgres, Auth, RLS. All derived stats computed in SQL views/functions, not client-side, so every surface agrees.
- Mobile-first: primary use is phones on a Friday evening and a Saturday sofa.

## 2. Domain model

```sql
-- Fixed reference data
create table acca_teams (
  id text primary key            -- 'VDL', 'JHP'
);

create table players (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,     -- Ausy, Fraser, Henry, Luke, Matteo, Tom (VDL);
                                 -- Dom, George, Harry, Matt, Sandy, Will (JHP)
  acca_team text not null references acca_teams(id),
  auth_user_id uuid references auth.users(id),  -- nullable until claimed
  is_admin boolean default false
);

create table seasons (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,     -- 'Season 1' … 'Season 7', 'World Cup 26', 'Easter Weekend'
  start_date date not null,
  end_date date not null,
  kind text not null default 'league'  -- 'league' | 'special'
);

create table gameweeks (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id),
  gw_date date unique not null,        -- the Saturday; matches ledger Date column
  window_opens timestamptz not null,   -- Thu 18:00 UK
  window_closes timestamptz not null,  -- Fri 20:00 UK
  status text not null default 'scheduled'  -- scheduled | open | closed | settled
);

create table picks (
  id uuid primary key default gen_random_uuid(),
  gameweek_id uuid not null references gameweeks(id),
  player_id uuid not null references players(id),
  method text not null,          -- 'Win' | 'BTTS' | 'N/A' (no pick) | future methods
  team text not null,            -- selection; 'N/A' when no pick
  second_team text,              -- BTTS opponent, else null
  odds numeric(6,2) not null check (odds >= 1.0),
  result smallint,               -- null = unsettled, 1 = won, 0 = lost
  submitted_at timestamptz default now(),
  locked boolean default false,  -- true once challenge window (1h) passes or GW closes
  unique (gameweek_id, player_id)
);

create table adjustments (      -- the Bonus/Minus log; mechanism existed in the sheet, never used to date
  id uuid primary key default gen_random_uuid(),
  gameweek_id uuid references gameweeks(id),
  player_id uuid references players(id),      -- null = team-level adjustment
  acca_team text references acca_teams(id),
  kind text not null,           -- 'Bonus' | 'Minus'
  reason text not null,
  score numeric(6,2) not null   -- signed contribution to Score
);
```

**Seed data** is provided alongside this spec:

- `seed/picks.csv` — all 1,287 historical picks (`date, player, acca_team, method, team, second_team, odds, win`). `second_team` is populated where the source workbook recorded it (Season 6 era); earlier BTTS picks have it blank.
- `seed/players.csv` — the 12 players and their teams.
- `seed/seasons.csv` — Seasons 1–6 plus World Cup 26 date ranges. Add **Season 7: 2026-08-22 → 2026-12-19** and **Season 8: 2027-01-02 → 2027-05-22**. Easter Weekend was a filtered view of Season 6 dates, not a distinct date range; model it as a `special` season with the two Easter GW dates or skip it.

Write a one-shot import script (`scripts/import.ts` or SQL `copy`) that creates gameweeks from distinct pick dates (assigning each to its season by date range) and inserts picks. **Validation gate: after import, assert these all-time figures before proceeding**, computed from `market_odds` with the 6/6 multiplier applied by the scoring function — George score 119.7279 / 108 entries / 66 wins; Ausy 118.5773; Matteo 101.8621; totals 1,287 picks, 108 gameweeks; team scores VDL 656.4740, JHP 599.2911. These match the workbook exactly (full recomputation in `score-reconciliation.md`).

## 3. Scoring rules (canonical — encode exactly)

1. **Score** (the ranking metric) = Σ(odds of winning picks) + Σ(adjustments). Losing picks and no-picks contribute 0 to Score.
2. **Score per Match** = Score ÷ Entries (entries = settled picks including no-picks).
3. **Team Score** = Σ over the six members.
4. **Weekly form value** per player per GW (display + form stats, *not* added to Score):
   - `2` if the player's acca team won all 6 that week;
   - else `+1` if their pick won, `−1` if it lost, and an **additional −1** if it was a no-pick (`method = 'N/A'`) — so a no-pick renders `−2`.
5. No pick submitted is stored as `method='N/A', team='N/A', result=0`, with odds set to the team's average pick odds that week (spreadsheet convention; it only affects Average Odds stats, never Score).
6. **6/6 double IS applied to Score, and matters.** Since the rules era (Season 5), a team winning all six sees every member's winning odds **doubled** for that week. Historically this was done by doubling the odds in the input sheet (three occurrences: 2025-12-13, 2026-02-07, 2026-02-28, all VDL). The site must instead store **market odds** and apply a `x2` multiplier at scoring time when the team's settled week is 6/6 — never mutate the stored odds. The seed carries both `odds_scored` (as-entered, pre-doubled) and `market_odds` + `doubled`; import `market_odds` as the pick odds and let the scoring function reproduce the doubled totals. Two 6/6 weeks from Seasons 1–2 predate the rule and must NOT be doubled — gate the multiplier on `gw_date >= '2025-08-16'` (a `season.double_rule` boolean).

## 4. Derived stats (per player and per team, over any date range)

Entries · Wins · Win % · Average Odds · Average Win Odds · Average Loss Odds · Last Win date · Last Loss date · Days Since Win · **Win Streak** (consecutive wins since last loss, by GW date) · **Form** (count of weekly form values ≥ 1 in the last 5 gameweeks) · Bonus · Minus · Score · Score per Match.

Implement as a SQL function `leaderboard(range_start date, range_end date)` returning one row per player, plus a team variant. The season, all-time, and any special-event leaderboard are then the same function with different ranges — this is how the sheet's All Time / Season 6 / World Cup 26 / Easter Weekend tabs all worked.

**Ranking metric:** season tables rank by **Score**; the all-time table ranks by **Score per Match** (entry counts differ — Luke joined in Season 2 and has 99 entries vs 108). Show both columns everywhere.

**Pre-team era:** Seasons 1–4 predate VDL/JHP; the team labels on those picks are a retrospective backfill. Store them as-is but let team views toggle "rules era only (Season 5+)".

## 5. Pages

1. **This Week** (home) — current GW status, countdown to Friday 20:00, both teams' six picks as acca cards with combined odds, live settle state. Before the window closes, other players' picks are visible (matches WhatsApp practice — picks are public on submission, with a 1-hour challenge window).
2. **Enter Pick** — form: method (Win/BTTS), team, second team (required iff BTTS), decimal odds. Validation: odds ≥ 1.50, window open, one pick per player per GW, edit allowed until window close. Show a "locked at submission" timestamp for the odds-movement rule.
3. **Leaderboards** — tabs: Current Season · All Time · Teams · Custom Range (this powers World Cup / Easter-style side comps for free). Sortable columns = the stats in §4. Include the **form grid**: players × last N gameweeks, cells coloured by weekly value (+1 green, 2 gold, −1 red, −2 dark red).
4. **Gameweek detail** — all 12 picks for a GW, settle controls (admin), team 6/6 flag, adjustments applied that week.
5. **Player profile** — full pick history, streaks, per-method splits (Win vs BTTS win rates), best/worst runs, head-to-head week record vs any other player.
6. **Admin** — settle results (tap win/loss per pick), create/skip gameweeks, add adjustments with reason, mark invalid picks, edit rules dates.
7. **Rules** — render `acca-rules-2026-27.md`.

## 6. Auth & permissions

- Supabase magic-link auth. Each auth user claims exactly one `players` row (invite flow: admin generates a claim link per player).
- RLS: any authenticated player can read everything; a player can insert/update **their own** pick only while the GW window is open and the pick is unlocked; only admins can settle results, manage gameweeks, and write adjustments.
- Matteo is the initial admin; make admin a flag so it can be shared.

## 7. Workflow automation

- A scheduled job (Supabase cron / pg_cron) flips GW status: `scheduled → open` Thursday 18:00 Europe/London, `open → closed` Friday 20:00 Europe/London. **Store UK-local rule times and compute UTC per week** — BST/GMT transitions will otherwise shift the deadline by an hour twice a year.
- On close: auto-insert `N/A` no-pick rows for anyone who missed, using the team's average odds that week (per §3.5).
- Settlement is manual (admin taps results Saturday night); no odds-feed or results-API integration in v1.

## 8. Non-functional

- British English throughout. Decimal odds to 2dp; scores to 2dp; tabular numerals in all tables.
- The form grid and acca cards are the flagship components — design them properly.
- Dark theme default.
- No betting-exchange or bookmaker API integration, no payments, no stake tracking in v1 (the £2.50 stake is placed at Bet365 outside the app).

## 9. Build order

1. Schema + RLS + seed import + **validation gate (§2)**.
2. `leaderboard()` SQL function + unit tests against known Season 6 figures (Henry 28.65, Will 16 wins, Matt 13.83).
3. Leaderboards + form grid (read-only app is already useful on day one).
4. Pick entry + window logic + cron.
5. Admin settlement + adjustments.
6. Player profiles + custom-range comps + polish.

## 10. Open questions baked in as config, not code

- 6/6 double (§3.6): a per-season boolean, **on** for Season 5 onwards, off for Seasons 1–4.
- No-pick penalty magnitude: config value defaulting to −2 form / 0 score, in case the group reinstates −3.
- Gameweek skip votes happen in WhatsApp; the app just needs admin skip/create.

## 11. AI pipeline — screenshot ingestion & announcement graphics

Both run through the **Anthropic Messages API** from a Supabase Edge Function (`ANTHROPIC_API_KEY` lives server-side only, never in the client). Model: `claude-sonnet-4-6` for both jobs.

### 11a. Pick ingestion from screenshots

Admin uploads one or more WhatsApp screenshots on the Enter Picks page. Edge Function sends the images (base64, `type: "image"` content blocks) with a prompt instructing Claude to return **strict JSON only**: `[{player, method, team, second_team, odds}]`, constrained to the 12 known player names and methods Win/BTTS. Client renders the parsed picks as a **review table with per-cell edit** before anything is committed — extraction is a draft, never auto-committed. Validation reuses the pick-entry rules (odds ≥ 1.50, one per player, window open). Handle multi-message screenshots by merging on player with last-write-wins and flagging conflicts.

### 11b. Weekly announcement graphic

Claude does not generate raster images via the API — it designs **HTML/SVG**, which the app renders to PNG. That is exactly how the reference graphics in `design-refs/` were produced (Easter Matchday Picks, London Marathon route map, Lib in the Square festival poster), so treat those three as the quality bar.

Flow:
1. Admin enters a theme prompt for the week ("London Marathon weekend", "Liberation Day Jersey", "Halloween") — or picks "surprise me".
2. Edge Function calls Claude with: the theme, the 12 confirmed picks (player, selection, method badge, odds), the two team groupings, the GW date, and a system prompt encoding the house style: bold single-screen composition at 1080×1920 or 1080×1080, team-grouped or theme-integrated layout, WIN/BTTS badges, odds right-aligned in a display face, a dated masthead, and a footer strapline. Instruct: self-contained HTML, inline CSS, no external assets, emoji allowed.
3. Client renders the returned HTML in a sandboxed hidden iframe at target dimensions and rasterises with `html-to-image` (or `satori` server-side if a no-client path is preferred — but satori supports only a CSS subset, so client-side rasterisation of full HTML is the primary path).
4. Admin previews, optionally hits "re-roll" (same data, new creative pass), then downloads/shares the PNG to WhatsApp.

Persist each week's generated HTML + PNG against the gameweek so the archive page doubles as a poster gallery.

Cost note: one extraction + one or two graphic generations per week is pennies; no caching or batching needed.


## 12. Multi-provider LLM strategy

Do not hard-code Anthropic. Route all LLM calls through a single Edge Function helper using either the **Vercel AI SDK** (provider adapters) or **OpenRouter** (one key, any model string — preferred for experimentation). Model per job lives in a `llm_config` table (`job text primary key, provider text, model text, max_tokens int`) so models can be swapped without redeploying.

All non-frontier jobs route via **OpenRouter** (one key, OpenAI-compatible, model per job swappable by string). Researched Aug 2026 — verify current model IDs and prices on openrouter.ai at build time, as both churn monthly.

Tiering (initial config, open-weight preferred):

| job | model (initial) | ~price in/out per M | notes |
|---|---|---|---|
| `graphic_design` | Claude Sonnet (Anthropic direct) | $3 / $15 | quality-sensitive; §11b; runs ~1–2×/week |
| `pick_extraction` | Qwen3.6 Flash (open-weight, multimodal) | $0.19 / $1.13 | strongest open VLM family for OCR; GLM-4.6V as fallback; review table is the safety net; §11a |
| `weekly_recap` | DeepSeek V4 Flash (open-weight) | $0.14 / $0.28 | Saturday-night match report: Hero + Villain of the week (villain = biggest short-odds loser), team acca fate, streak callouts. Auto-generated on GW settlement, editable by admin before publishing |
| `pick_hot_take` | DeepSeek V4 Flash | $0.14 / $0.28 | one-line pundit take per pick, shown on the This Week page after window close |
| `rival_roast` | DeepSeek V4 Flash | $0.14 / $0.28 | button on player profiles; prompt is fed real head-to-head stats from `leaderboard()` so the banter is factually grounded |

Guardrails for user-triggered features: server-side rate limit (e.g. 5 generations/user/day), keys never in the client, prompts include only data the user can already see, and outputs are plain text (no tool use, no SQL generation in v1 — canned insight templates instead of text-to-SQL). Log every call with job, model, and token counts to a `llm_usage` table; at this scale the bill is trivial (cheap-tier weekly load ≈ 50k tokens ≈ £0.01), but the log makes model comparisons and re-tiering evidence-based rather than vibes-based. During development, use OpenRouter's free-tier open models (Llama/Gemma/DeepSeek variants) so testing costs nothing; switch to the paid config table entries at launch.
