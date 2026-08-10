# Addition Proposal: Live Scores & Live Table

**Status: proposed addition to the Acca Tracker (see `acca-tracker-build-spec.md`). Do not restructure existing scoring, settlement, or leaderboard code — this layers on top.**

## Summary

Join each gameweek's picks to live fixtures from **football-data.org v4** (free tier), show live scores and pick status on the This Week page, and offer a toggleable **live provisional leaderboard**. Picks that can't be matched to a covered fixture display a **"No live option"** state. An LLM performs the pick→fixture join once per week; live updates are then pure ID joins with no LLM in the hot path.

## Why the architecture matters more than the rate limit

football-data.org free tier allows **10 requests/minute**. The wrong design (each client polling the API) would blow that with 12 users instantly. The right design never comes close:

- **One server-side poller** (Supabase pg_cron → Edge Function) calls `GET /v4/matches?date={today}` — a single request returns all of the day's matches across the free-tier competitions.
- Poll every **60s during a live window** (Sat 14:00–19:30 UK, and only when the gameweek has ≥1 matched fixture). That's ~330 requests on a Saturday at **1 req/min — 10% of the limit**, sustained, with headroom for a second call if a fixture needs `/v4/matches/{id}` detail.
- Results land in a `live_scores` table; **all 12 clients read via Supabase Realtime subscriptions — zero client→API calls**.
- API token lives in the Edge Function env, never the client.
- On API error or 429: keep last-known scores, show a "last updated HH:MM" stamp, back off exponentially. Never fail the page.

## Coverage reality (measured against the actual ledger)

Free tier (TIER_ONE) covers: Premier League, Championship (ELC), Bundesliga, La Liga, Serie A, Ligue 1, Eredivisie, Primeira Liga, Champions League, plus World Cup/Euros. Analysed against Seasons 5–6 picks: **~47% of picks would be live-covered; ~53% fall outside** — dominated by League One/Two (Swindon, Bolton, Stockport, Gillingham, MK Dons, Lincoln, Mansfield...), Segunda, Scottish Premiership, and international-break multisport picks.

Consequence: **"No live option" is a first-class state, not an error.** The live table must degrade gracefully when half the legs are dark (see UI below). Future upgrade path if the group wants fuller coverage: API-Football (api-sports.io) covers English Leagues One/Two and 1,000+ competitions, but its free tier (100 req/day) cannot sustain live polling — it would need a paid plan. Not proposed for v1; revisit if the group cares enough to pay.

## Data model additions

```sql
create table fixtures (
  id bigint primary key,                 -- football-data.org match id
  gameweek_id uuid not null references gameweeks(id),
  competition text not null,             -- e.g. 'ELC', 'PD'
  home_team text not null,
  away_team text not null,
  kickoff timestamptz not null,
  status text not null default 'TIMED',  -- TIMED | IN_PLAY | PAUSED | FINISHED | POSTPONED | CANCELLED
  home_score int, away_score int,
  minute text,                           -- as reported
  last_polled timestamptz
);

alter table picks add column fixture_id bigint references fixtures(id);  -- null = no live option
alter table picks add column fixture_side text check (fixture_side in ('HOME','AWAY'));  -- which side the Win pick backs
alter table picks add column match_confidence numeric(3,2);              -- from the LLM join
alter table gameweeks add column live_enabled boolean default true;      -- admin kill switch
```

Per-user toggle: `players.live_table_default boolean` plus a session toggle in the UI.

## The LLM join (weekly, not live)

Runs once, on gameweek close (Friday 20:05), as part of the existing close job:

1. Edge Function fetches Saturday's fixtures: `GET /v4/matches?dateFrom={sat}&dateTo={sun}` (1 call).
2. Sends to the `pick_matching` LLM job (cheap tier, e.g. DeepSeek V4 Flash — add to `llm_config`): the fixture list (id, home, away, competition, kickoff) plus the 12 pick strings (team, second_team, method). Prompt requires strict JSON: `[{pick_id, fixture_id|null, side: HOME|AWAY|null, confidence}]`, with explicit instruction to return null rather than guess — pick strings are WhatsApp shorthand ("W.Ham", "MGB", "Hudds vs Mansfield"), which is precisely why this is an LLM job and not a string match.
3. Matches with confidence ≥ 0.8 auto-apply; lower-confidence matches queue on the Gameweek detail page for one-tap admin confirm/reject. Unmatched picks get `fixture_id = null`.
4. BTTS picks match on the fixture (both named teams); Win picks additionally record `fixture_side`.

Cost: one small LLM call per week. Effectively free.

## UI

**This Week page (live mode on):**
- Each acca leg shows: score, minute/FT, and a pick-status chip derived in SQL, no LLM —
  - Win pick: WINNING (backed side ahead) / LEVEL / LOSING / WON / LOST
  - BTTS: LANDED (both scored — irreversibly green the moment the second goal goes in) / WAITING / LOST (FT without both scoring)
  - Unmatched pick: a quiet **"No live option"** chip, styled neutral, never as an error
- Team acca cards: legs-standing count ("4/6 on track, 1 down, 1 no live") and a combined state bar.

**Live table (the toggle):**
- Off by default per user; toggle in the leaderboard header, state persisted.
- When on, the leaderboard adds a provisional column: current Score + odds of picks currently in a winning/landed state, marked clearly as provisional (italic, "LIVE" badge). 6/6 doubling applies provisionally only when all six matched legs are winning AND no leg is unmatched — with any dark leg, doubling is never provisionally shown (can't be known).
- Unsettled/unmatched legs contribute nothing to the provisional figure; a footnote counts them ("3 picks have no live data").

**Global controls:** `gameweeks.live_enabled` admin kill switch; poller only runs when true and within the live window.

## Settlement assist (the quiet win)

When a matched fixture hits FINISHED, pre-fill the pick's `result` (derived from FT score + method + side) as a **suggested** value on the admin settle screen — admin still confirms every pick, because Bet365 settlement can diverge from raw FT logic (abandonments, palps, extra-time markets). Unmatched picks settle manually exactly as today. This roughly halves Saturday-night admin work without ceding authority over the ledger.

## Build order

1. `fixtures` table + poller Edge Function + cron window logic (test with a hardcoded fixture list before touching the LLM).
2. LLM matching job + admin confirm queue on Gameweek detail.
3. Live chips on This Week.
4. Live provisional leaderboard + per-user toggle.
5. Settlement assist.

## Explicit non-goals

- No per-client API calls, ever.
- No live odds, xG, or commentary.
- No coverage promises for lower leagues in v1 — "No live option" is the honest answer.
- Free tier scores refresh at polling cadence (~60s) and the API itself is not a push feed; expect a minute or two of lag versus TV. Do not attempt to poll faster to fix this.
