# Hahap CA + Slayer tracker

Owner: Matteo (OSRS IGN **Hahap**). Goal: a repeatable tracker that (a) ingests Combat Achievement (CA) progress, (b) tells him which bosses are worth doing by route (slayer / Like a Boss / end-game / anytime), and (c) gives a slayer do/skip/block verdict per task that optimises for CA points toward **Master tier (1,965 pts)**.

Style: British English, no em dashes, terse. Pipeline-structured code: declare inputs, log each step, name missing inputs rather than assuming. Flag judgement calls in output.

## 1. Baseline (read from WikiSync + wiki tier pages, 2 Nov 2026)

| Tier | Done / total | Pts each |
|---|---|---|
| Easy | 34/41 | 1 |
| Medium | 39/64 | 2 |
| Hard | 44/89 | 3 |
| Elite | 65/166 | 4 |
| Master | 35/173 | 5 |
| Grandmaster | 9/122 | 6 |
| **Total** | **226/655, 733 pts** | |

Thresholds: Hard 436, Elite 1,100, Master 1,965 (= all non-GM points), GM 2,697 (all). Points are fungible across tiers.

Previous snapshot 25 Oct 2026: 174/655, 573 pts. The 52 IDs gained between snapshots are in `data/ids_2026-10-25.json` vs `data/ids_2026-11-02.json` (populate from the two JSONs Matteo pasted; the 2 Nov `combat_achievements` array is the source of truth).

`ca_baseline_2026-11-02.json` ships with this brief: every task with boss, tier, wiki completion %, and done flag as of 2 Nov. Treat it as the seed; replace with live data once the ID map exists.

Levels: Slayer 91, all combats 99, Farming 96, Herblore 93, Sailing 87. Notable KC: CG 4,517, Leviathan 4,410, Duke 1,740, Kraken 1,000, Vardorvis 984, Whisperer 742, Vorkath ~310, ToA 10, CoX 0, ToB 59, Nex 12.

## 2. Data sources

| Source | URL | Gives |
|---|---|---|
| WikiSync (RuneLite plugin must be on) | `https://sync.runescape.wiki/runelite/player/Hahap/STANDARD` | `combat_achievements` = array of task IDs done; levels; quests; diaries |
| Hiscores lite | `https://secure.runescape.com/m=hiscore_oldschool/index_lite.ws?player=Hahap` | skills + boss KCs (CSV, `rank,level,xp` then `rank,score`; activity order is alphabetical with new bosses inserted, parse by position against the wiki's documented order, do not hardcode) |
| CA task table | `https://oldschool.runescape.wiki/w/Combat_Achievements/All_tasks` | 655 rows; task ID is an HTML attribute on each row (expected `data-ca-task-id`, verify). Also per-task pages show "ID n" in the infobox. Alternative: wiki API `api.php` with `action=parse` or the Lua module behind the page |
| Tier pages | `.../w/Easy_Combat_Achievements` etc. | boss, name, type, tier, comp% |
| Slayer task weights | wiki pages for Duradel, Nieve, Konar, Krystilia, Turael, and `Slayer task weight` | per-master assignment tables, quantities, requirements |
| Slayer rewards | `.../w/Slayer_Rewards` | block/skip/storage costs |

Known ID anchors to validate the map against: 51 = Cerberus Veteran, 268 = Vorkath Veteran, 183 = Nightmare Adept. IDs 51-56 are the six Cerberus tasks; 270-278 are Vorkath.

## 3. Modules

```
fetch/      wikisync.py, hiscores.py, ca_table.py, slayer_tables.py   (cache raw responses with date stamps)
ca/         idmap.py (id -> boss, task, tier, pts, comp%)
            solver.py (required set, see §4)
            buckets.py (boss -> route bucket, see §5)
slayer/     model.py (per task: weight, qty, CA pts still open on it, verdict, cost)
report/     build.py -> report.md (and optional HTML)
data/       snapshots by date, baseline json, config.yaml
```

Each run: fetch → diff IDs against last snapshot → recompute required set → regroup → write report and a dated snapshot. Never overwrite a prior snapshot.

## 4. Required-set solver

Inputs: undone tasks with points and comp%, target = 1,965 − earned, forced-include list, forced-exclude list.

Algorithm (keep it this simple unless told otherwise): add forced-includes, then take remaining undone tasks in descending comp% until the target is met. Report the cutoff comp% and the first few tasks either side of it. Also show what would change with a 1-point-better alternative (next task below the line).

Config (current):
- forced_include: Mad Angel Adept, Mad Angel Veteran, Mad Angel Speed-Runner, Dancing Queen, Juggling Act, Smite Fight, This Is Madness, Camping the King, King-sized clobbering, Trying to fit in (new-boss tasks whose comp% is deflated by release date, not difficulty).
- forced_exclude: none yet. Candidates Matteo may add: ToB team perfections.
- As of 2 Nov: cutoff 6.2%, 298 tasks, 1,233 pts.

Caveat to print on every report: comp% is population difficulty, not Matteo's. He is a CG/DT2 main (top-700 CG) and has never done CoX; weight accordingly when he asks for ordering.

## 5. Route buckets

- **Slayer (regular task)**: Hydra (95), Araxxor (92), Thermy (93), Cerberus, Sire, Kraken, GG, Skotizo (totems), DKs (dagannoth), KQ (kalphite), KBD/brutal blacks (black dragon), Vorkath (blue dragon), Jad/Zuk/Ket-Rak (TzHaar), Scurrius (rats), Vet'ion (skeletons), Scorpia (scorpions), Callisto (bears), Tormented Demon, Basilisk Knight, Demonic Gorilla (black demons), Lizardman Shaman. Verify Royal Titans and Shellbane Gryphon against current task lists; currently treated as not on-task.
- **Like a Boss only**: GWD four, Phantom Muspah, Zulrah, Nex, Chaos Elemental, Chaos Fanatic, Crazy Archaeologist, Giant Mole, Sarachnis, Barrows, Venenatis/Spindel, Duke/Leviathan/Vardorvis/Whisperer (also regular bosses, but no regular task). Verify the current Like a Boss pool on the wiki.
- **End-game**: CoX, ToA, ToB (all modes), Gauntlet/CG, Yama, Nightmare, Phosani's, Doom, Corp, Colosseum, Zalcano, quest bosses.
- **Anytime**: everything else (Hueycoatl, Moons, Amoxliatl, Maggot King, Mad Angel, Royal Titans, Shellbane, Hespori, Obor, Bryophyta, Deranged Arch, Wintertodt, Tempoross, Brutus, Giants).

Report format per bucket: boss, tasks remaining in required set, points, lowest comp% required. No task-level listing by default; `--tasks` flag expands.

## 6. Slayer do/skip/block model

Rules in force (Jagex "Summer Sweep Up: Slayer & More", 27 Aug 2025; re-check the wiki for anything after 6 Oct 2026):
- Per-master block lists; Turael/Aya/Spria share one. Block cost: Turael/Aya/Spria 40, Mazchna 50, Vannaka 60, Chaeldar 70, Konar 80, Nieve/Steve 90, Duradel/Kuradal 100, Krystilia 100.
- Skip 30 pts, streak preserved. Task storage 500 pts, works for Wilderness tasks.
- Turael/Aya/Spria tasks award 0 pts but count toward streak (Turael boosting still functions; wiki now advises against it versus on-streak skipping). Milestone bonuses at 10/50/100/250/1000.
- Metal dragons merged into one task. Mazchna 6 / Vannaka 8 pts per task.

Per master (Duradel, Nieve, Konar, Krystilia), for each assignable task compute:
- weight and probability of roll (after current blocks)
- CA points still open on that task's boss or monster (from the solver output), and whether the boss counts on that task
- verdict: DO (open CA points or on the 99 route), SKIP (no CA value, low weight), BLOCK (no CA value, high weight, cost justified)
- expected CA points per roll for the master, before and after the recommended block list, priced in slayer points at that master's rate.

Turael-boost calculator: given current points, streak and target task, expected cost in time/points to fish for it via Turael vs skipping at 30; output a recommendation. Parameterise task durations (Turael task ~3 min default; Matteo to override).

Objective order: CA points first, XP/hr tiebreak, GP ignored unless asked. State this on the report.

## 7. Open questions for Matteo

1. Is Like a Boss unlocked, and which blocks are currently set per master?
2. Which master is he using now (Duradel vs Konar for KC-weighted rolls)?
3. Should the solver carry a forced_exclude for ToB/ToA team perfections, or leave them in and let the ordering view handle it?

## 8. Provenance tags in output

Mark every number as read (fetched), derived (computed) or assumed (config/default). Never present a guess as a read fact.

## 9. Status and how to run (added 2 Nov 2026)

Scaffold built and run end to end on 2 Nov 2026. Stdlib + `requests` only, Python 3.11. No YAML module on this machine, so config is `data/config.json`.

```
python run.py            # fetch (cached per day in data/raw/, gitignored) -> solve -> buckets -> slayer -> report.md + data/snapshots/<date>.json
python run.py --tasks    # expand task rows under each boss
python run.py --force    # refetch today's cache
python run.py --turael-target "Greater Demons" --turael-master Duradel --streak 37
```

Findings from the first run that change the brief:
- Hydra (95), Araxxor (92), smoke devils (93) are above Slayer 91, so 133 of the 302 Slayer-bucket points are level-gated today. The report flags this each run.
- Royal Titans count on fire/ice giant tasks and Shellbane gryphon is a gryphon task (needs the Wings Spread unlock). Both moved to the Slayer bucket. Nex is not in the wiki Like a Boss pool, so it is Anytime.
- New master Mortimer (29 Jul 2026, block 120, modifier points) is not modelled. Krystilia now pays 25 pts/task.
- WikiSync needs a User-Agent header or it 403s. Hiscores: use `index_lite.json`, activities arrive named.
- `data/ids_2026-10-25.json` was never supplied; the diff step seeds from this run's snapshot instead.
- Duradel blocks as of 2 Nov: Metal Dragons, Dagannoth, Black Demons, Suqahs, Drakes, Wyrms, Greater Demons. Three of them (Greater Demons 51, Dagannoth 41, Black Demons 13 open pts) are flagged UNBLOCK?; EV 3.76 -> 7.11 per roll if freed.
- v0.3.0: slayer verdicts now take `--objective ca|xp|gp|balanced`; XP/GP/minutes per assignment live in `data/task_rates.json` (all seeded estimates until Matteo marks entries `measured`). Under xp, Nechryael/Abyssal demons/Dust devils/Bloodveld lead at Duradel; four of his seven blocks (Dagannoth, Greater/Black demons, Suqahs) are UNBLOCK? under xp.
