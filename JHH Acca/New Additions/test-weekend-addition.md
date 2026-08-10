# Addition: Test Weekend — Sat 15 August 2026

**Purpose: a live end-to-end shakedown of the app one week before Season 7 kicks off (22 Aug), using VDL members only. This exercises every pipeline — pick entry, screenshot ingestion, live scores, settlement, graphics, leaderboards — against real matches with nothing at stake. Build as a reusable sandbox mode, not a one-off hack.**

## Concept: `test` season kind

Extend the existing `seasons.kind` enum with `'test'`. Test seasons:

- Are **completely excluded** from the All Time leaderboard, all-time stats, team records, win streaks, and form — the `leaderboard()` function and every stats query must filter `kind != 'test'` by default. This is the one hard requirement: a test pick must never touch the real ledger's numbers.
- Appear only under a **"Test Weekend"** entry in the leaderboard tabs, visually badged (e.g. amber "SANDBOX" chip) so nobody screenshots it as real.
- Support **arbitrary team compositions** — teams for a test season come from a `season_teams` mapping rather than the fixed `players.acca_team`:

```sql
create table season_team_members (
  season_id uuid not null references seasons(id),
  team_name text not null,
  player_id uuid not null references players(id),
  primary key (season_id, player_id)
);
-- League seasons don't need rows here (fall back to players.acca_team);
-- test/special seasons read team membership from this table.
```

This table incidentally future-proofs the World Cup / Easter-style side comps, which may also want ad-hoc teams.

## The Test Weekend setup (seed exactly this)

- **Season:** name `Test Weekend`, kind `test`, start/end `2026-08-15`, one gameweek dated `2026-08-15`, window opens Thu 13 Aug 18:00 UK, closes Fri 14 Aug 20:00 UK.
- **Participants:** VDL only. Randomly drawn into three pairs (draw performed 10 Aug 2026, locked):

| Team | Members |
|---|---|
| Team 1 | Matteo & Henry |
| Team 2 | Fraser & Ausy |
| Team 3 | Tom & Luke |

  Team names are placeholders — editable by admin; let the pairs christen themselves.
- **Rules in force:** standard Section 1–2 rules (Sat 14:00+ kickoffs, min odds 1.50, odds lock). Note the PL hasn't started on 15 Aug — the Championship and most of the EFL have, so picks will skew lower-league; that's a feature, since it stress-tests the "No live option" state and the covered-Championship live path simultaneously.
- **Scoring:** standard odds-sum. The "all legs win = double" rule applies at **team size = 2**, i.e. a pair going 2/2 doubles both members' odds that week — deliberately easy to trigger, so the multiplier code path actually gets tested. JHP members can view everything but cannot pick.

## What the weekend must exercise (checklist rendered in the Test Weekend UI, admin-tickable)

1. Magic-link auth + player claim for all six.
2. Pick entry within the window, including one deliberate edit and one odds challenge.
3. Screenshot ingestion: paste the WhatsApp picks thread, verify the review table catches at least one deliberate typo.
4. LLM fixture matching + admin confirm queue; confirm at least one "No live option" pick renders correctly.
5. Live poller running 14:00–19:30 Sat; live chips and the provisional live table toggle.
6. FT settlement assist pre-fill + manual settle of unmatched picks.
7. Announcement graphic generation (theme suggestion: "Preseason Friendly" / dress rehearsal motif) + re-roll + PNG share.
8. Test leaderboard renders; confirm All Time is byte-identical before and after the weekend (assert team and player Scores unchanged).

## Teardown

Nothing to delete: the test season stays in the database as kind `test`, permanently invisible to real stats. If the group would rather it vanish, admin gets a "archive test season" toggle that hides it from the UI entirely.
