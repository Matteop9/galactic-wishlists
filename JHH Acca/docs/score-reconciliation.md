# Score Reconciliation — as at end of Season 6 (23 May 2026)

Recomputed independently from the pick ledger (1,287 picks, 108 gameweeks) and reconciled against the workbook's All Time Ranking. **Every player and both teams reconcile to zero difference.**

## Method confirmed

- Score = sum of decimal odds of winning picks. No adjustments have ever been posted (Bonus/Minus log empty), consistent with no minuses since the rules were formalised in Season 5.
- The 6/6 double is implemented by **doubling the odds in the input sheet** for that week. Three such weeks exist, all VDL, all post-rules: 13 Dec 2025, 7 Feb 2026, 28 Feb 2026. The two 6/6 weeks from Seasons 1–2 (13 Jan 2024 JHP, 2 Mar 2024 VDL) are stored at market odds — the rule postdates them.
- All-time ranking is by **Score per Match** (Luke has 99 entries — he joined in Season 2 — vs 108 for everyone else); season rankings are by raw Score.
- Seasons 1–4 predate the VDL/JHP team structure; team labels on those picks are a retrospective backfill of the current rosters. All-time team totals therefore include the pre-team era.

## All-time individual standings

| # | Player | Entries | Wins | Score | Sheet | Diff | Score/Match | of which 6/6 double bonus |
|---|--------|--------:|-----:|------:|------:|-----:|------------:|------------:|
| 1 | George | 108 | 66 | 119.73 | 119.73 | 0.00 | 1.1086 | – |
| 2 | Ausy | 108 | 60 | 118.58 | 118.58 | 0.00 | 1.0979 | 5.40 |
| 3 | Henry | 108 | 61 | 117.95 | 117.95 | 0.00 | 1.0922 | 5.25 |
| 4 | Luke | 99 | 59 | 105.23 | 105.23 | 0.00 | 1.0630 | 5.41 |
| 5 | Fraser | 108 | 56 | 110.56 | 110.56 | 0.00 | 1.0237 | 5.77 |
| 6 | Dom | 108 | 60 | 102.76 | 102.76 | 0.00 | 0.9515 | – |
| 7 | Tom | 108 | 55 | 102.29 | 102.29 | 0.00 | 0.9471 | 5.80 |
| 8 | Matteo | 108 | 56 | 101.86 | 101.86 | 0.00 | 0.9432 | 5.27 |
| 9 | Matt | 108 | 57 | 96.41 | 96.41 | 0.00 | 0.8927 | – |
| 10 | Sandy | 108 | 57 | 95.50 | 95.50 | 0.00 | 0.8843 | – |
| 11 | Will | 108 | 53 | 94.05 | 94.05 | 0.00 | 0.8708 | – |
| 12 | Harry | 108 | 51 | 90.84 | 90.84 | 0.00 | 0.8411 | – |

The double-bonus column is the extra score each VDL player banked from the three doubled weeks (their market odds again, since every leg won). Collectively that's **33.0 of VDL's lead** — the rules-era gap (Seasons 5+6) is VDL 273.04 v JHP 203.39, so VDL lead by 69.65 even before doubling and by ~36.7 at market odds.

## Per-season scores

| Player | S1 | S2 | S3 | S4 | S5 | S6 |
|--------|---:|---:|---:|---:|---:|---:|
| George | 11.72 | 22.84 | 22.64 | 25.76 | 17.16 | 19.61 |
| Ausy | 7.38 | 24.26 | 13.06 | 26.14 | 21.80 | 25.94 |
| Henry | 9.67 | 18.59 | 16.81 | 26.51 | 17.72 | 28.65 |
| Luke | – | 18.64 | 18.47 | 18.29 | 23.27 | 26.56 |
| Fraser | 5.61 | 19.82 | 19.96 | 23.09 | 19.57 | 22.51 |
| Dom | 7.76 | 26.26 | 15.14 | 23.02 | 8.74 | 21.84 |
| Tom | 5.76 | 12.36 | 17.64 | 18.44 | 23.37 | 24.72 |
| Matteo | 8.57 | 13.75 | 15.51 | 25.11 | 17.25 | 21.68 |
| Matt | 8.60 | 20.85 | 21.59 | 18.18 | 13.36 | 13.83 |
| Sandy | 6.18 | 18.13 | 14.56 | 21.88 | 15.39 | 19.37 |
| Will | 3.45 | 13.19 | 17.98 | 19.47 | 12.97 | 26.99 |
| Harry | 6.68 | 14.70 | 13.67 | 21.66 | 14.45 | 19.68 |

Season winners: S1 George · S2 Dom · S3 George · S4 Henry · S5 Tom (by Score; the workbook's S5 tab ranks by wins, where Luke leads 13–12) · S6 Henry.

## Teams

| Team | All-time Score | Sheet | Diff | Rules era (S5+S6) |
|------|---:|---:|---:|---:|
| VDL | 656.47 | 656.47 | 0.00 | 273.04 |
| JHP | 599.29 | 599.29 | 0.00 | 203.39 |

## Carried into the site build

`seed/picks.csv` now carries both `odds_scored` (as-entered, doubled where applicable — reproduces the sheet exactly) and `market_odds` + `doubled` flag (true odds), so the site can display either view and applies doubling as a scoring rule rather than by mutating odds.
