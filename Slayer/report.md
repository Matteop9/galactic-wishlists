# Hahap CA + Slayer tracker, 2026-11-02

Provenance: `[read]` fetched this run, `[derived]` computed, `[assumed]` config/default. Never a guess as a fact.

Objective order: CA points first, XP/hr tiebreak, GP ignored unless asked. [assumed]

Caveat: comp% is population difficulty, not Matteo's. He is a CG/DT2 main (top-700 CG) and has never done CoX; weight accordingly when ordering. [assumed]

## Judgement calls and flags

- Live task table vs shipped baseline: 2 names differ (['3, 2, 1 -Mage', '3, 2, 1 -Range'] -> ['3, 2, 1 - Mage', '3, 2, 1 - Range']). Live table is source of truth.
- Buckets: Royal Titans and Shellbane gryphon moved to Slayer (wiki Boss Slayer page lists Eldric/Branda on ice/fire giant tasks and gryphons as a Duradel/Nieve/Konar task). Nex is not in the wiki Like a Boss pool, so it sits in Anytime. Brief said otherwise.
- Mortimer (new master, 29 Jul 2026 per wiki) exists with block cost 120 and modifier-based points; not modelled, brief predates him. Add to masters if relevant.
- Slayer-bucket bosses with NO eligible task at Slayer 91 (level or unlock gate): Alchemical Hydra 61 pts, Araxxor 60 pts, Thermonuclear Smoke Devil 12 pts = 133 of 302 Slayer-bucket pts.

## Missing inputs

- data/ids_2026-10-25.json (25 Oct id list) was never supplied, so the 25 Oct -> 2 Nov gain of 52 tasks / 160 pts in the brief cannot be reproduced. Paste it and re-run.
- data/task_rates.json: no measured baselines yet; 57 entries use wiki xp/gp figures, 18 are estimates, minutes per task are all estimates. Overwrite any entry and set source to measured.

## 1. Baseline

WikiSync snapshot 2026-11-02T12:32:50.253Z [read]. Slayer 91 [read].

| Tier | Done / total | Pts each | Pts earned |
|---|---|---|---|
| Easy | 34/41 | 1 | 34 |
| Medium | 39/64 | 2 | 78 |
| Hard | 44/89 | 3 | 132 |
| Elite | 65/166 | 4 | 260 |
| Master | 35/173 | 5 | 175 |
| Grandmaster | 9/122 | 6 | 54 |
| **Total** | **226/655** | | **733** [derived] |

Thresholds: Hard 436, Elite 1,100, Master 1,965, GM 2,697. Target 1965 [assumed], still needed 1232 [derived].

Previous snapshot: none found in data/snapshots, so no diff this run. This run's snapshot is the seed.

Boss KC [read]: The Corrupted Gauntlet 4,517, The Leviathan 4,410, Duke Sucellus 1,740, Kraken 1,000, Vardorvis 984, The Whisperer 742, Vorkath 324, Tombs of Amascut 10, Chambers of Xeric 0, Theatre of Blood 59, Nex 12, Cerberus 150, Zulrah 1

## 2. Required set (Master tier)

Forced includes found: 10 [assumed]; forced excludes: none [assumed].

Cutoff **6.1%** comp%, **298 tasks, 1233 pts** [derived] (needs 1232).

Last tasks inside the line:
- 6.2% General Graardor: Keep Away (Grandmaster, 6)
- 6.2% Kree'arra: Collateral Damage (Master, 5)
- 6.2% Doom of Mokhaiotl: Mokhaiotl Drift (Master, 5)
- 6.1% Chambers of Xeric: A Not So Special Lizard (Master, 5)

First tasks outside the line:
- 6.1% The Nightmare: Explosion! (Elite, 4)
- 6.0% Doom of Mokhaiotl: Mopping up (Grandmaster, 6)
- 6.0% TzTok-Jad: Fight Caves Speed-Chaser (Master, 5)
- 5.9% Vorkath: Vorkath Speed-Runner (Grandmaster, 6)

1-point-better alternative: swap the cutoff task for The Nightmare: Explosion! (Elite, 4 pts, 6.1%).

## 2b. Ordering for Matteo

Score = open pts x (1 + 0.5 x log10(1 + KC)) x access. KC [read]; weights, avoid list ['Chambers of Xeric', 'Chambers of Xeric: Challenge Mode'] (x0.25) and team list (x0.6) are [assumed]. Level-gated bosses score 0. This reorders the required set, it does not change it.

| # | Boss | Open pts | Tasks | KC | Lowest comp% | Score | Why |
|---|---|---|---|---|---|---|---|
| 1 | Tombs of Amascut | 73 | 16 | 10 | 8.2% | 111 | fresh target |
| 2 | Phantom Muspah | 52 | 11 | 7 | 6.9% | 75 | fresh target |
| 3 | Tombs of Amascut: Expert Mode | 69 | 13 | 0 | 6.5% | 69 | never killed |
| 4 | Corrupted Hunllef | 22 | 4 | 4,517 | 9.7% | 62 | grind, familiar |
| 5 | Theatre of Blood | 41 | 8 | 59 | 6.4% | 46 | team content |
| 6 | Zulrah | 40 | 9 | 1 | 16.0% | 46 | fresh target |
| 7 | K'ril Tsutsaroth | 30 | 7 | 4 | 8.6% | 40 | fresh target |
| 8 | Yama | 38 | 8 | 0 | 7.7% | 38 | never killed |
| 9 | General Graardor | 29 | 7 | 2 | 6.2% | 36 | fresh target |
| 10 | The Hueycoatl | 35 | 10 | 0 | 13.5% | 35 | never killed |
| 11 | Phosani's Nightmare | 35 | 7 | 0 | 6.7% | 35 | never killed |
| 12 | TzTok-Jad | 25 | 5 | 4 | 8.2% | 34 | fresh target |
| 13 | Crystalline Hunllef | 17 | 4 | 91 | 17.7% | 34 | fresh target |
| 14 | Kree'arra | 26 | 6 | 1 | 6.2% | 30 | fresh target |
| 15 | Duke Sucellus | 11 | 2 | 1,740 | 6.7% | 29 | grind, familiar |
| 16 | Commander Zilyana | 25 | 6 | 1 | 6.3% | 29 | fresh target |
| 17 | Theatre of Blood: Entry Mode | 25 | 6 | 59 | 10.9% | 28 | team content |
| 18 | Corporeal Beast | 17 | 4 | 14 | 10.9% | 27 | fresh target |
| 19 | Royal Titans | 15 | 7 | 35 | 17.7% | 27 | fresh target |
| 20 | Hespori | 12 | 3 | 49 | 10.0% | 22 | fresh target |
| 21 | Skotizo | 13 | 3 | 17 | 22.2% | 21 | fresh target |
| 22 | Maggot King | 21 | 5 | 0 | 2.5% | 21 | never killed |
| 23 | Mad Angel | 18 | 7 | 1 | 2.2% | 21 | fresh target |
| 24 | Nex | 22 | 4 | 12 | 8.6% | 21 | team content |
| 25 | Doom of Mokhaiotl | 19 | 4 | 0 | 6.2% | 19 | never killed |
| 26 | Moons of Peril | 12 | 4 | 10 | 31.1% | 18 | fresh target |
| 27 | Barrows | 10 | 4 | 27 | 29.1% | 17 | fresh target |
| 28 | Zalcano | 16 | 4 | 0 | 19.0% | 16 | never killed |
| 29 | The Nightmare | 16 | 4 | 0 | 7.5% | 16 | never killed |
| 30 | Dagannoth Rex | 15 | 5 | 0 | 8.7% | 15 | never killed |
| 31 | Chaos Elemental | 13 | 4 | 1 | 18.8% | 15 | fresh target |
| 32 | Scorpia | 13 | 4 | 1 | 18.2% | 15 | fresh target |
| 33 | TzHaar-Ket-Rak's Challenges | 13 | 3 | 1 | 6.4% | 15 | fresh target |
| 34 | Shellbane gryphon | 14 | 7 | 0 | 14.4% | 14 | never killed |
| 35 | Chambers of Xeric | 90 | 20 | 0 | 6.1% | 14 | avoid list, team content, never killed |
| 36 | Crazy Archaeologist | 9 | 4 | 7 | 35.8% | 13 | fresh target |
| 37 | Dagannoth Prime | 13 | 4 | 0 | 11.9% | 13 | never killed |
| 38 | Dagannoth Supreme | 13 | 4 | 0 | 9.1% | 13 | never killed |
| 39 | Kraken | 5 | 1 | 1,000 | 25.5% | 13 | grind, familiar |
| 40 | Chaos Fanatic | 10 | 4 | 1 | 19.6% | 12 | fresh target |
| 41 | Vorkath | 5 | 1 | 324 | 10.5% | 11 | fresh target |
| 42 | Grotesque Guardians | 6 | 1 | 50 | 9.4% | 11 | fresh target |
| 43 | Tombs of Amascut: Entry Mode | 7 | 2 | 10 | 23.0% | 11 | fresh target |
| 44 | Fortis Colosseum | 10 | 2 | 0 | 9.1% | 10 | never killed |
| 45 | Vet'ion | 7 | 2 | 6 | 32.6% | 10 | fresh target |
| 46 | Giant Mole | 6 | 2 | 14 | 28.4% | 10 | fresh target |
| 47 | Venenatis | 7 | 2 | 4 | 24.9% | 9 | fresh target |
| 48 | Tormented Demon | 8 | 2 | - | 6.3% | 8 | no KC tracked |
| 49 | Wintertodt | 4 | 2 | 76 | 39.8% | 8 | fresh target |
| 50 | Deranged Archaeologist | 7 | 4 | 0 | 35.2% | 7 | never killed |
| 51 | Amoxliatl | 4 | 1 | 20 | 7.6% | 7 | fresh target |
| 52 | Glough | 4 | 1 | - | 8.4% | 4 | no KC tracked |
| 53 | Galvek | 4 | 1 | - | 7.0% | 4 | no KC tracked |
| 54 | Fragment of Seren | 4 | 1 | - | 6.7% | 4 | no KC tracked |
| 55 | Chambers of Xeric: Challenge Mode | 25 | 5 | 0 | 8.3% | 4 | avoid list, team content, never killed |
| 56 | Alchemical Hydra | 61 | 12 | 0 | 6.2% | 0 | level-gated, never killed |
| 57 | Araxxor | 60 | 12 | 0 | 9.1% | 0 | level-gated, never killed |
| 58 | Thermonuclear Smoke Devil | 12 | 3 | 0 | 19.3% | 0 | level-gated, never killed |

Avoid-list cost [derived]: the required set holds 115 pts from ['Chambers of Xeric', 'Chambers of Xeric: Challenge Mode']. Excluding them entirely moves the cutoff from 6.1% to 4.6% (295 tasks, 1232 pts). Tasks that would come in instead, hardest first:
- 4.6% TzHaar-Ket-Rak's Challenges: TzHaar-Ket-Rak's Speed-Chaser (Master, 5)
- 4.9% TzHaar-Ket-Rak's Challenges: Supplies? Who Needs 'em? (Master, 5)
- 5.0% Vardorvis: Axe Enthusiast (Grandmaster, 6)
- 5.0% Kree'arra: Feather Hunter (Grandmaster, 6)
- 5.1% Doom of Mokhaiotl: Doom Chaser (Master, 5)
- 5.2% The Nightmare: Nightmare (Solo) Speed-Trialist (Elite, 4)
- 5.3% The Hueycoatl: Hueycoatl Speed-Runner (Grandmaster, 6)
- 5.3% Theatre of Blood: Hard Mode: Hard Mode? Completed It (Master, 5)
- 5.4% Theatre of Blood: Theatre (4-Scale) Speed-Chaser (Master, 5)
- 5.4% Doom of Mokhaiotl: Doom Crawler (Elite, 4)
- 5.4% The Nightmare: Sleep Tight (Elite, 4)
- 5.5% Phosani's Nightmare: Perfect Phosani's Nightmare (Grandmaster, 6)
- and 10 more

## 3. Route buckets

### Slayer: 18 bosses, 77 tasks, 302 pts [derived]

| Boss | Tasks | Pts | Lowest comp% |
|---|---|---|---|
| Alchemical Hydra | 12 | 61 | 6.2% |
| Araxxor | 12 | 60 | 9.1% |
| TzTok-Jad | 5 | 25 | 8.2% |
| Dagannoth Rex | 5 | 15 | 8.7% |
| Royal Titans | 7 | 15 | 17.7% |
| Shellbane gryphon | 7 | 14 | 14.4% |
| Dagannoth Prime | 4 | 13 | 11.9% |
| Dagannoth Supreme | 4 | 13 | 9.1% |
| Skotizo | 3 | 13 | 22.2% |
| Scorpia | 4 | 13 | 18.2% |
| TzHaar-Ket-Rak's Challenges | 3 | 13 | 6.4% |
| Thermonuclear Smoke Devil | 3 | 12 | 19.3% |
| Tormented Demon | 2 | 8 | 6.3% |
| Vet'ion | 2 | 7 | 32.6% |
| Grotesque Guardians | 1 | 6 | 9.4% |
| Kraken | 1 | 5 | 25.5% |
| Vorkath | 1 | 5 | 10.5% |
| Amoxliatl | 1 | 4 | 7.6% |

### Like a Boss: 14 bosses, 73 tasks, 289 pts [derived]

| Boss | Tasks | Pts | Lowest comp% |
|---|---|---|---|
| Phantom Muspah | 11 | 52 | 6.9% |
| Zulrah | 9 | 40 | 16.0% |
| K'ril Tsutsaroth | 7 | 30 | 8.6% |
| General Graardor | 7 | 29 | 6.2% |
| Kree'arra | 6 | 26 | 6.2% |
| Commander Zilyana | 6 | 25 | 6.3% |
| Maggot King | 5 | 21 | 2.5% |
| Chaos Elemental | 4 | 13 | 18.8% |
| Duke Sucellus | 2 | 11 | 6.7% |
| Barrows | 4 | 10 | 29.1% |
| Chaos Fanatic | 4 | 10 | 19.6% |
| Crazy Archaeologist | 4 | 9 | 35.8% |
| Venenatis | 2 | 7 | 24.9% |
| Giant Mole | 2 | 6 | 28.4% |

### End-game: 19 bosses, 114 tasks, 532 pts [derived]

| Boss | Tasks | Pts | Lowest comp% |
|---|---|---|---|
| Chambers of Xeric | 20 | 90 | 6.1% |
| Tombs of Amascut | 16 | 73 | 8.2% |
| Tombs of Amascut: Expert Mode | 13 | 69 | 6.5% |
| Theatre of Blood | 8 | 41 | 6.4% |
| Yama | 8 | 38 | 7.7% |
| Phosani's Nightmare | 7 | 35 | 6.7% |
| Theatre of Blood: Entry Mode | 6 | 25 | 10.9% |
| Chambers of Xeric: Challenge Mode | 5 | 25 | 8.3% |
| Corrupted Hunllef | 4 | 22 | 9.7% |
| Doom of Mokhaiotl | 4 | 19 | 6.2% |
| Crystalline Hunllef | 4 | 17 | 17.7% |
| Corporeal Beast | 4 | 17 | 10.9% |
| Zalcano | 4 | 16 | 19.0% |
| The Nightmare | 4 | 16 | 7.5% |
| Fortis Colosseum | 2 | 10 | 9.1% |
| Tombs of Amascut: Entry Mode | 2 | 7 | 23.0% |
| Glough | 1 | 4 | 8.4% |
| Galvek | 1 | 4 | 7.0% |
| Fragment of Seren | 1 | 4 | 6.7% |

### Anytime: 7 bosses, 34 tasks, 110 pts [derived]

| Boss | Tasks | Pts | Lowest comp% |
|---|---|---|---|
| The Hueycoatl | 10 | 35 | 13.5% |
| Nex | 4 | 22 | 8.6% |
| Mad Angel | 7 | 18 | 2.2% |
| Hespori | 3 | 12 | 10.0% |
| Moons of Peril | 4 | 12 | 31.1% |
| Deranged Archaeologist | 4 | 7 | 35.2% |
| Wintertodt | 2 | 4 | 39.8% |

## 4. Slayer do/skip/block

Like a Boss unlocked: True [assumed]. Current master: Duradel [assumed]. Unlocks owned ['Like a Boss', 'Wings Spread'], assumed ['Reptile Got Ripped', 'Basilocked', 'Hot Stuff', 'I Wildy More Slayer', 'Seeing Red', 'Actual Vampyre Slayer', 'Stop the Wyvern'] [assumed]. Current blocks: {'Duradel': ['Metal Dragons', 'Dagannoth', 'Black Demons', 'Suqahs', 'Drakes', 'Wyrms', 'Greater Demons'], 'Nieve': [], 'Konar': [], 'Krystilia': []} [assumed]. Block slots 7 [assumed]. Skip 30 pts [assumed]. Verdict BLOCK needs roll chance >= 4.0% [assumed].

Master costs [read]: Turael 0 pts/task, block 40, Spria 0 pts/task, block 40, Krystilia 25 pts/task, block 100, Mazchna 6 pts/task, block 50, Vannaka 8 pts/task, block 60, Chaeldar 10 pts/task, block 70, Konar 18 pts/task, block 80, Nieve 12 pts/task, block 90, Duradel 15 pts/task, block 100, Mortimer 0 pts/task, block 120

Objective this run: **ca** weights {'ca': 1.0, 'xp': 0.0, 'gp': 0.0} [assumed]. Score = weighted sum of each task's CA open pts, xp/hr and gp/hr, each scaled 0..1 against the master's best. DO >= 0.5, BLOCK at or below the master's bottom 25% of scores (floor 0.15) with roll >= 4.0%. XP/GP come from data/task_rates.json: wiki Slayer training + Money making guide figures [read], estimates where the wiki has none [assumed]; minutes per task are [assumed].

### Duradel: per roll CA 3.76 -> 3.76, xp/hr 45,218 -> 45,218, gp/hr 1,052,978 -> 1,052,978 [derived]

Recommended blocks under ca (0 free slots): none; cost 0 slayer pts [derived]. 13 of the eligible rows still have an assumed xp or gp figure.

Block list by objective [derived]: **ca** ['Metal Dragons', 'Abyssal Demons', 'Dark Beasts', 'Hellhounds', 'Lizardmen', 'Black Dragons', 'Cave Kraken']; **xp** ['Cave Kraken']; **gp** ['Dark Beasts', 'TzHaar', 'Kalphite', 'Nechryael']; **balanced** ['Dark Beasts', 'Cave Kraken']

Blocked tasks worth freeing under ca: ['Black Demons', 'Dagannoth', 'Greater Demons']. Freeing lifts per roll to CA 7.11, xp/hr 46,198, gp/hr 1,203,985 [derived] (cancelling a block is free, re-blocking costs again).

Boss-task pool 32 bosses, mean open 11.9 CA pts [derived] (uniform pick [assumed]): Phantom Muspah 52, Zulrah 40, K'ril Tsutsaroth 30, General Graardor 29, Kree'arra 26, Commander Zilyana 25, Maggot King 21, Dagannoth Rex 15, Shellbane gryphon 14, Chaos Elemental 13, Dagannoth Prime 13, Dagannoth Supreme 13, Scorpia 13, Duke Sucellus 11, Barrows 10, Chaos Fanatic 10, Crazy Archaeologist 9, Venenatis 7, Vet'ion 7, Giant Mole 6, Grotesque Guardians 6, Kraken 5, Vorkath 5

| Task | Wt | Roll % | CA pts | XP/hr | GP/hr | Min | Score | ca/xp/gp | Counts | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| Greater Demons | 9 | 0.0 | 51 | 50,000 | 3,849,000 | 15* | 1.00 | 1.00/0.45/0.97 | Greater Demon, K'ril Tsutsaroth, Skotizo, Tormented Demon | **UNBLOCK?** |
| Dagannoth | 9 | 0.0 | 41 | 85,000 | 1,995,000 | 15* | 0.80 | 0.80/0.77/0.50 | Dagannoth Prime, Dagannoth Rex, Dagannoth Supreme | **UNBLOCK?** |
| TzHaar | 10 | 4.5 | 38 | 100,000 | 100,000* | 60* | 0.75 | 0.75/0.91/0.03 | TzHaar-Ket-Rak's Challenges, TzKal-Zuk, TzTok-Jad | **DO** |
| Fire Giants | 7 | 3.1 | 15 | 40,000 | 50,000* | 20* | 0.29 | 0.29/0.36/0.01 | Fire Giant, Giants, Royal Titans | **DO** |
| Gryphons | 7 | 3.1 | 14 | 50,000 | 150,000* | 25* | 0.27 | 0.27/0.45/0.04 | Shellbane gryphon | **DO** |
| Black Demons | 8 | 0.0 | 13 | 45,000 | 3,958,000 | 18* | 0.25 | 0.25/0.41/1.00 | Demonic Gorilla, Skotizo | **UNBLOCK?** |
| Boss | 12 | 5.4 | 11.88 | 40,000* | 3,118,000 | 40* | 0.23 | 0.23/0.36/0.79 | boss pool | **DO** |
| Gargoyles | 8 | 3.6 | 6 | 30,000 | 855,000 | 25* | 0.12 | 0.12/0.27/0.22 | Gargoyle, Grotesque Guardians | **DO** |
| Cave Kraken | 9 | 4.0 | 5 | 15,000 | 812,000 | 30* | 0.10 | 0.10/0.14/0.21 | Kraken | **DO** |
| Blue Dragons | 4 | 1.8 | 5 | 25,000 | 3,857,000 | 25* | 0.10 | 0.10/0.23/0.97 | Vorkath | **DO** |
| Metal Dragons | 14 | 0.0 | 0 | 30,000 | 1,627,000 | 45* | 0.00 | 0.00/0.27/0.41 | - | **BLOCKED** |
| Abyssal Demons | 12 | 5.4 | 0 | 80,000 | 2,307,000 | 18* | 0.00 | 0.00/0.73/0.58 | Abyssal Sire | **BLOCK** |
| Dark Beasts | 11 | 4.9 | 0 | 42,000 | 150,000* | 25* | 0.00 | 0.00/0.38/0.04 | - | **BLOCK** |
| Hellhounds | 10 | 4.5 | 0 | 40,000 | 2,785,000 | 20* | 0.00 | 0.00/0.36/0.70 | Cerberus, Hellhound | **BLOCK** |
| Lizardmen | 10 | 4.5 | 0 | 50,000 | 1,008,000 | 25* | 0.00 | 0.00/0.45/0.25 | Lizardman Shaman | **BLOCK** |
| Black Dragons | 9 | 4.0 | 0 | 30,000 | 1,535,000 | 35* | 0.00 | 0.00/0.27/0.39 | Black Dragon, Brutal Black Dragon, King Black Dragon | **BLOCK** |
| Kalphite | 9 | 4.0 | 0 | 75,000 | 474,000 | 15* | 0.00 | 0.00/0.68/0.12 | Kalphite Queen | **BLOCK** |
| Nechryael | 9 | 4.0 | 0 | 100,000 | 450,000* | 18* | 0.00 | 0.00/0.91/0.11 | - | **BLOCK** |
| Bloodveld | 8 | 3.6 | 0 | 100,000 | 150,000* | 15* | 0.00 | 0.00/0.91/0.04 | Bloodveld | **SKIP** |
| Drakes | 8 | 0.0 | 0 | 35,000 | 639,000 | 30* | 0.00 | 0.00/0.32/0.16 | - | **BLOCKED** |
| Red Dragons | 8 | 3.6 | 0 | 30,000 | 414,000 | 30* | 0.00 | 0.00/0.27/0.10 | - | **SKIP** |
| Suqahs | 8 | 0.0 | 0 | 55,000 | 50,000* | 20* | 0.00 | 0.00/0.50/0.01 | - | **BLOCKED** |
| Vampyres | 8 | 3.6 | 0 | 15,000 | 934,000 | 25* | 0.00 | 0.00/0.14/0.24 | - | **SKIP** |
| Wyrms | 8 | 0.0 | 0 | 53,000 | 645,000 | 25* | 0.00 | 0.00/0.48/0.16 | Wyrm | **BLOCKED** |
| Aberrant Spectres | 7 | 3.1 | 0 | 35,000 | 150,000* | 20* | 0.00 | 0.00/0.32/0.04 | Aberrant Spectre | **SKIP** |
| Basilisks | 7 | 3.1 | 0 | 15,000 | 1,008,000 | 30* | 0.00 | 0.00/0.14/0.25 | Basilisk Knight | **SKIP** |
| Fossil Island Wyverns | 7 | 3.1 | 0 | 15,000 | 1,122,000 | 30* | 0.00 | 0.00/0.14/0.28 | - | **SKIP** |
| Skeletal Wyverns | 7 | 3.1 | 0 | 15,000 | 1,312,000 | 35* | 0.00 | 0.00/0.14/0.33 | Skeletal Wyvern | **SKIP** |
| Spiritual Creatures | 7 | 3.1 | 0 | 25,000 | 312,000 | 25* | 0.00 | 0.00/0.23/0.08 | - | **SKIP** |
| Trolls | 6 | 2.7 | 0 | 50,000 | 463,000 | 15* | 0.00 | 0.00/0.45/0.12 | - | **SKIP** |
| Ankou | 5 | 2.2 | 0 | 55,000 | 128,000 | 12* | 0.00 | 0.00/0.50/0.03 | - | **SKIP** |
| Dust Devils | 5 | 2.2 | 0 | 110,000 | 250,000* | 12* | 0.00 | 0.00/1.00/0.06 | - | **SKIP** |
| Frost dragons | 5 | 2.2 | 0 | 30,000 | 1,971,000 | 30* | 0.00 | 0.00/0.27/0.50 | - | **SKIP** |
| Cave Horrors | 4 | 1.8 | 0 | 25,000 | 698,000 | 20* | 0.00 | 0.00/0.23/0.18 | - | **SKIP** |
| Elves | 4 | 1.8 | 0 | 25,000 | 200,000* | 20* | 0.00 | 0.00/0.23/0.05 | - | **SKIP** |
| Kurask | 4 | 1.8 | 0 | 20,000 | 1,044,000 | 20* | 0.00 | 0.00/0.18/0.26 | Kurask | **SKIP** |
| Mutated Zygomites | 2 | 0.9 | 0 | 10,000 | 30,000* | 10* | 0.00 | 0.00/0.09/0.01 | - | **SKIP** |
| Waterfiends | 2 | 0.9 | 0 | 15,000 | 30,000* | 10* | 0.00 | 0.00/0.14/0.01 | - | **SKIP** |
| Araxytes | 10 | - | - | - | - | - | - | - | needs Slayer 92 | N/A |
| Smoke Devils | 9 | - | - | - | - | - | - | - | needs Slayer 93 | N/A |
| Aviansie | 8 | - | - | - | - | - | - | - | needs unlock 'Watch the birdie' | N/A |
| Warped creatures | 8 | - | - | - | - | - | - | - | needs unlock 'Warped Reality' | N/A |
| Aquanites | 5 | - | - | - | - | - | - | - | needs unlock 'Lured In' | N/A |

`*` = assumed rate, not measured.

### Nieve: per roll CA 6.09 -> 6.38, xp/hr 46,291 -> 47,779, gp/hr 1,096,015 -> 1,047,515 [derived]

Recommended blocks under ca (7 free slots): ['Metal dragons']; cost 90 slayer pts [derived], funded by 8 tasks at 12 pts. 16 of the eligible rows still have an assumed xp or gp figure.

Block list by objective [derived]: **ca** ['Metal dragons']; **xp** none; **gp** none; **balanced** none

Boss-task pool 32 bosses, mean open 11.9 CA pts [derived] (uniform pick [assumed]): Phantom Muspah 52, Zulrah 40, K'ril Tsutsaroth 30, General Graardor 29, Kree'arra 26, Commander Zilyana 25, Maggot King 21, Dagannoth Rex 15, Shellbane gryphon 14, Chaos Elemental 13, Dagannoth Prime 13, Dagannoth Supreme 13, Scorpia 13, Duke Sucellus 11, Barrows 10, Chaos Fanatic 10, Crazy Archaeologist 9, Venenatis 7, Vet'ion 7, Giant Mole 6, Grotesque Guardians 6, Kraken 5, Vorkath 5

| Task | Wt | Roll % | CA pts | XP/hr | GP/hr | Min | Score | ca/xp/gp | Counts | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| Greater demons | 7 | 2.7 | 51 | 50,000 | 3,849,000 | 15* | 1.00 | 1.00/0.45/0.97 | Greater Demon, K'ril Tsutsaroth, Skotizo, Tormented Demon | **DO** |
| Dagannoth | 8 | 3.1 | 41 | 85,000 | 1,995,000 | 15* | 0.80 | 0.80/0.77/0.50 | Dagannoth Prime, Dagannoth Rex, Dagannoth Supreme | **DO** |
| TzHaar | 10 | 3.8 | 38 | 100,000 | 100,000* | 60* | 0.75 | 0.75/0.91/0.03 | TzHaar-Ket-Rak's Challenges, TzKal-Zuk, TzTok-Jad | **DO** |
| Fire giants | 9 | 3.4 | 15 | 40,000 | 50,000* | 20* | 0.29 | 0.29/0.36/0.01 | Fire Giant, Giants, Royal Titans | **DO** |
| Gryphons | 7 | 2.7 | 14 | 50,000 | 150,000* | 25* | 0.27 | 0.27/0.45/0.04 | Shellbane gryphon | **DO** |
| Black demons | 9 | 3.4 | 13 | 45,000 | 3,958,000 | 18* | 0.25 | 0.25/0.41/1.00 | Demonic Gorilla, Skotizo | **DO** |
| Boss | 8 | 3.1 | 11.88 | 40,000* | 3,118,000 | 40* | 0.23 | 0.23/0.36/0.79 | boss pool | **DO** |
| Gargoyles | 6 | 2.3 | 6 | 30,000 | 855,000 | 25* | 0.12 | 0.12/0.27/0.22 | Gargoyle, Grotesque Guardians | **DO** |
| Cave kraken | 6 | 2.3 | 5 | 15,000 | 812,000 | 30* | 0.10 | 0.10/0.14/0.21 | Kraken | **DO** |
| Blue dragons | 4 | 1.5 | 5 | 25,000 | 3,857,000 | 25* | 0.10 | 0.10/0.23/0.97 | Vorkath | **DO** |
| Metal dragons | 12 | 4.6 | 0 | 30,000 | 1,627,000 | 45* | 0.00 | 0.00/0.27/0.41 | - | **BLOCK** |
| Abyssal demons | 9 | 3.4 | 0 | 80,000 | 2,307,000 | 18* | 0.00 | 0.00/0.73/0.58 | Abyssal Sire | **SKIP** |
| Bloodveld | 9 | 3.4 | 0 | 100,000 | 150,000* | 15* | 0.00 | 0.00/0.91/0.04 | Bloodveld | **SKIP** |
| Kalphite | 9 | 3.4 | 0 | 75,000 | 474,000 | 15* | 0.00 | 0.00/0.68/0.12 | Kalphite Queen | **SKIP** |
| Custodian stalker | 8 | 3.1 | 0 | 35,000* | 100,000* | 20* | 0.00 | 0.00/0.32/0.03 | - | **SKIP** |
| Hellhounds | 8 | 3.1 | 0 | 40,000 | 2,785,000 | 20* | 0.00 | 0.00/0.36/0.70 | Cerberus, Hellhound | **SKIP** |
| Lizardmen | 8 | 3.1 | 0 | 50,000 | 1,008,000 | 25* | 0.00 | 0.00/0.45/0.25 | Lizardman Shaman | **SKIP** |
| Suqahs | 8 | 3.1 | 0 | 55,000 | 50,000* | 20* | 0.00 | 0.00/0.50/0.01 | - | **SKIP** |
| Drakes | 7 | 2.7 | 0 | 35,000 | 639,000 | 30* | 0.00 | 0.00/0.32/0.16 | - | **SKIP** |
| Nechryael | 7 | 2.7 | 0 | 100,000 | 450,000* | 18* | 0.00 | 0.00/0.91/0.11 | - | **SKIP** |
| Wyrms | 7 | 2.7 | 0 | 53,000 | 645,000 | 25* | 0.00 | 0.00/0.48/0.16 | Wyrm | **SKIP** |
| Aberrant spectres | 6 | 2.3 | 0 | 35,000 | 150,000* | 20* | 0.00 | 0.00/0.32/0.04 | Aberrant Spectre | **SKIP** |
| Basilisks | 6 | 2.3 | 0 | 15,000 | 1,008,000 | 30* | 0.00 | 0.00/0.14/0.25 | Basilisk Knight | **SKIP** |
| Black dragons | 6 | 2.3 | 0 | 30,000 | 1,535,000 | 35* | 0.00 | 0.00/0.27/0.39 | Black Dragon, Brutal Black Dragon, King Black Dragon | **SKIP** |
| Dust devils | 6 | 2.3 | 0 | 110,000 | 250,000* | 12* | 0.00 | 0.00/1.00/0.06 | - | **SKIP** |
| Spiritual creatures | 6 | 2.3 | 0 | 25,000 | 312,000 | 25* | 0.00 | 0.00/0.23/0.08 | - | **SKIP** |
| Trolls | 6 | 2.3 | 0 | 50,000 | 463,000 | 15* | 0.00 | 0.00/0.45/0.12 | - | **SKIP** |
| Vampyres | 6 | 2.3 | 0 | 15,000 | 934,000 | 25* | 0.00 | 0.00/0.14/0.24 | - | **SKIP** |
| Ankou | 5 | 1.9 | 0 | 55,000 | 128,000 | 12* | 0.00 | 0.00/0.50/0.03 | - | **SKIP** |
| Cave horrors | 5 | 1.9 | 0 | 25,000 | 698,000 | 20* | 0.00 | 0.00/0.23/0.18 | - | **SKIP** |
| Dark beasts | 5 | 1.9 | 0 | 42,000 | 150,000* | 25* | 0.00 | 0.00/0.38/0.04 | - | **SKIP** |
| Fossil Island Wyverns | 5 | 1.9 | 0 | 15,000 | 1,122,000 | 30* | 0.00 | 0.00/0.14/0.28 | - | **SKIP** |
| Frost dragons | 5 | 1.9 | 0 | 30,000 | 1,971,000 | 30* | 0.00 | 0.00/0.27/0.50 | - | **SKIP** |
| Red dragons | 5 | 1.9 | 0 | 30,000 | 414,000 | 30* | 0.00 | 0.00/0.27/0.10 | - | **SKIP** |
| Skeletal Wyverns | 5 | 1.9 | 0 | 15,000 | 1,312,000 | 35* | 0.00 | 0.00/0.14/0.33 | Skeletal Wyvern | **SKIP** |
| Elves | 4 | 1.5 | 0 | 25,000 | 200,000* | 20* | 0.00 | 0.00/0.23/0.05 | - | **SKIP** |
| Scabarites | 4 | 1.5 | 0 | 30,000* | 50,000* | 20* | 0.00 | 0.00/0.27/0.01 | - | **SKIP** |
| Brine rats | 3 | 1.1 | 0 | 25,000* | 501,000 | 10* | 0.00 | 0.00/0.23/0.13 | - | **SKIP** |
| Kurask | 3 | 1.1 | 0 | 20,000 | 1,044,000 | 20* | 0.00 | 0.00/0.18/0.26 | Kurask | **SKIP** |
| Turoth | 3 | 1.1 | 0 | 35,000* | 80,000* | 15* | 0.00 | 0.00/0.32/0.02 | - | **SKIP** |
| Mutated Zygomites | 2 | 0.8 | 0 | 10,000 | 30,000* | 10* | 0.00 | 0.00/0.09/0.01 | - | **SKIP** |
| Araxytes | 8 | - | - | - | - | - | - | - | needs Slayer 92 | N/A |
| Smoke devils | 7 | - | - | - | - | - | - | - | needs Slayer 93 | N/A |
| Aviansie | 6 | - | - | - | - | - | - | - | needs unlock 'Watch the birdie' | N/A |
| Warped creatures | 6 | - | - | - | - | - | - | - | needs unlock 'Warped Reality' | N/A |
| Aquanites | 5 | - | - | - | - | - | - | - | needs unlock 'Lured In' | N/A |

`*` = assumed rate, not measured.

### Konar: per roll CA 3.23 -> 4.74, xp/hr 41,399 -> 37,938, gp/hr 1,313,092 -> 1,458,814 [derived]

Recommended blocks under ca (7 free slots): ['Metal dragons', 'Drakes', 'Wyrms', 'Abyssal demons', 'Bloodveld', 'Fire giants', 'Kalphite']; cost 560 slayer pts [derived], funded by 31 tasks at 18 pts. 13 of the eligible rows still have an assumed xp or gp figure.

Block list by objective [derived]: **ca** ['Metal dragons', 'Drakes', 'Wyrms', 'Abyssal demons', 'Bloodveld', 'Cave kraken', 'Fire giants']; **xp** ['Cave kraken']; **gp** ['Bloodveld', 'Fire giants', 'Kalphite']; **balanced** ['Drakes', 'Cave kraken', 'Fire giants']

Boss-task pool 32 bosses, mean open 11.9 CA pts [derived] (uniform pick [assumed]): Phantom Muspah 52, Zulrah 40, K'ril Tsutsaroth 30, General Graardor 29, Kree'arra 26, Commander Zilyana 25, Maggot King 21, Dagannoth Rex 15, Shellbane gryphon 14, Chaos Elemental 13, Dagannoth Prime 13, Dagannoth Supreme 13, Scorpia 13, Duke Sucellus 11, Barrows 10, Chaos Fanatic 10, Crazy Archaeologist 9, Venenatis 7, Vet'ion 7, Giant Mole 6, Grotesque Guardians 6, Kraken 5, Vorkath 5

| Task | Wt | Roll % | CA pts | XP/hr | GP/hr | Min | Score | ca/xp/gp | Counts | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| Dagannoth | 8 | 3.6 | 41 | 85,000 | 1,995,000 | 15* | 1.00 | 1.00/0.77/0.50 | Dagannoth Prime, Dagannoth Rex, Dagannoth Supreme | **DO** |
| Black demons | 9 | 4.0 | 13 | 45,000 | 3,958,000 | 18* | 0.32 | 0.32/0.41/1.00 | Skotizo | **DO** |
| Greater demons | 7 | 3.1 | 13 | 50,000 | 3,849,000 | 15* | 0.32 | 0.32/0.45/0.97 | Greater Demon, Skotizo | **DO** |
| Bosses | 8 | 3.6 | 11.88 | 40,000* | 3,118,000 | 40* | 0.29 | 0.29/0.36/0.79 | boss pool | **DO** |
| Gargoyles | 6 | 2.7 | 6 | 30,000 | 855,000 | 25* | 0.15 | 0.15/0.27/0.22 | Gargoyle, Grotesque Guardians | **DO** |
| Cave kraken | 9 | 4.0 | 5 | 15,000 | 812,000 | 30* | 0.12 | 0.12/0.14/0.21 | Kraken | **DO** |
| Lesser Nagua | 2 | 0.9 | 4 | 30,000* | 504,000 | 10* | 0.10 | 0.10/0.27/0.13 | Amoxliatl | **DO** |
| Metal dragons | 15 | 6.7 | 0 | 30,000 | 1,627,000 | 45* | 0.00 | 0.00/0.27/0.41 | - | **BLOCK** |
| Drakes | 10 | 4.5 | 0 | 35,000 | 639,000 | 30* | 0.00 | 0.00/0.32/0.16 | - | **BLOCK** |
| Wyrms | 10 | 4.5 | 0 | 53,000 | 645,000 | 25* | 0.00 | 0.00/0.48/0.16 | Wyrm | **BLOCK** |
| Abyssal demons | 9 | 4.0 | 0 | 80,000 | 2,307,000 | 18* | 0.00 | 0.00/0.73/0.58 | Abyssal Sire | **BLOCK** |
| Bloodveld | 9 | 4.0 | 0 | 100,000 | 150,000* | 15* | 0.00 | 0.00/0.91/0.04 | Bloodveld | **BLOCK** |
| Fire giants | 9 | 4.0 | 0 | 40,000 | 50,000* | 20* | 0.00 | 0.00/0.36/0.01 | Fire Giant, Giants | **BLOCK** |
| Kalphite | 9 | 4.0 | 0 | 75,000 | 474,000 | 15* | 0.00 | 0.00/0.68/0.12 | Kalphite Queen | **BLOCK** |
| Hellhounds | 8 | 3.6 | 0 | 40,000 | 2,785,000 | 20* | 0.00 | 0.00/0.36/0.70 | Cerberus, Hellhound | **SKIP** |
| Lizardmen | 8 | 3.6 | 0 | 50,000 | 1,008,000 | 25* | 0.00 | 0.00/0.45/0.25 | Lizardman Shaman | **SKIP** |
| Nechryael | 7 | 3.1 | 0 | 100,000 | 450,000* | 18* | 0.00 | 0.00/0.91/0.11 | - | **SKIP** |
| Aberrant spectres | 6 | 2.7 | 0 | 35,000 | 150,000* | 20* | 0.00 | 0.00/0.32/0.04 | Aberrant Spectre | **SKIP** |
| Black dragons | 6 | 2.7 | 0 | 30,000 | 1,535,000 | 35* | 0.00 | 0.00/0.27/0.39 | Black Dragon, Brutal Black Dragon | **SKIP** |
| Dust devils | 6 | 2.7 | 0 | 110,000 | 250,000* | 12* | 0.00 | 0.00/1.00/0.06 | - | **SKIP** |
| Jellies | 6 | 2.7 | 0 | 45,000* | 80,000* | 15* | 0.00 | 0.00/0.41/0.02 | - | **SKIP** |
| Trolls | 6 | 2.7 | 0 | 50,000 | 463,000 | 15* | 0.00 | 0.00/0.45/0.12 | - | **SKIP** |
| Ankou | 5 | 2.2 | 0 | 55,000 | 128,000 | 12* | 0.00 | 0.00/0.50/0.03 | - | **SKIP** |
| Basilisks | 5 | 2.2 | 0 | 15,000 | 1,008,000 | 30* | 0.00 | 0.00/0.14/0.25 | Basilisk Knight | **SKIP** |
| Dark beasts | 5 | 2.2 | 0 | 42,000 | 150,000* | 25* | 0.00 | 0.00/0.38/0.04 | - | **SKIP** |
| Fossil Island Wyverns | 5 | 2.2 | 0 | 15,000 | 1,122,000 | 30* | 0.00 | 0.00/0.14/0.28 | - | **SKIP** |
| Red dragons | 5 | 2.2 | 0 | 30,000 | 414,000 | 30* | 0.00 | 0.00/0.27/0.10 | - | **SKIP** |
| Skeletal Wyverns | 5 | 2.2 | 0 | 15,000 | 1,312,000 | 35* | 0.00 | 0.00/0.14/0.33 | Skeletal Wyvern | **SKIP** |
| Blue dragons | 4 | 1.8 | 0 | 25,000 | 3,857,000 | 25* | 0.00 | 0.00/0.23/0.97 | - | **SKIP** |
| Vampyres | 4 | 1.8 | 0 | 15,000 | 934,000 | 25* | 0.00 | 0.00/0.14/0.24 | - | **SKIP** |
| Kurask | 3 | 1.3 | 0 | 20,000 | 1,044,000 | 20* | 0.00 | 0.00/0.18/0.26 | Kurask | **SKIP** |
| Turoth | 3 | 1.3 | 0 | 35,000* | 80,000* | 15* | 0.00 | 0.00/0.32/0.02 | - | **SKIP** |
| Brine rats | 2 | 0.9 | 0 | 25,000* | 501,000 | 10* | 0.00 | 0.00/0.23/0.13 | - | **SKIP** |
| Mutated Zygomites | 2 | 0.9 | 0 | 10,000 | 30,000* | 10* | 0.00 | 0.00/0.09/0.01 | - | **SKIP** |
| Waterfiends | 2 | 0.9 | 0 | 15,000 | 30,000* | 10* | 0.00 | 0.00/0.14/0.01 | - | **SKIP** |
| Hydras | 10 | - | - | - | - | - | - | - | needs Slayer 95 | N/A |
| Smoke devils | 7 | - | - | - | - | - | - | - | needs Slayer 93 | N/A |
| Aviansie | 6 | - | - | - | - | - | - | - | needs unlock 'Watch the birdie' | N/A |
| Warped creatures | 4 | - | - | - | - | - | - | - | needs unlock 'Warped Reality' | N/A |

`*` = assumed rate, not measured.

### Krystilia: per roll CA 1.28 -> 1.33, xp/hr 38,420 -> 37,954, gp/hr 1,466,952 -> 1,371,255 [derived]

Recommended blocks under ca (7 free slots): ['Greater demons']; cost 100 slayer pts [derived], funded by 4 tasks at 25 pts. 29 of the eligible rows still have an assumed xp or gp figure.

Block list by objective [derived]: **ca** ['Greater demons']; **xp** ['Wilderness bosses / demi-bosses']; **gp** none; **balanced** none

Boss-task pool 32 bosses, mean open 11.9 CA pts [derived] (uniform pick [assumed]): Phantom Muspah 52, Zulrah 40, K'ril Tsutsaroth 30, General Graardor 29, Kree'arra 26, Commander Zilyana 25, Maggot King 21, Dagannoth Rex 15, Shellbane gryphon 14, Chaos Elemental 13, Dagannoth Prime 13, Dagannoth Supreme 13, Scorpia 13, Duke Sucellus 11, Barrows 10, Chaos Fanatic 10, Crazy Archaeologist 9, Venenatis 7, Vet'ion 7, Giant Mole 6, Grotesque Guardians 6, Kraken 5, Vorkath 5

| Task | Wt | Roll % | CA pts | XP/hr | GP/hr | Min | Score | ca/xp/gp | Counts | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| Scorpions | 6 | 3.1 | 13 | 25,000* | 1,762,000 | 10* | 1.00 | 1.00/0.23/0.33 | Scorpia | **DO** |
| Wilderness bosses / demi-bosses | 8 | 4.1 | 11.88 | 30,000* | 2,134,000 | 30* | 0.91 | 0.91/0.27/0.40 | boss pool | **DO** |
| Spiders | 6 | 3.1 | 7 | 25,000* | 5,370,000 | 10* | 0.54 | 0.54/0.23/1.00 | Venenatis | **DO** |
| Skeletons | 5 | 2.6 | 7 | 30,000* | 4,200,000 | 10* | 0.54 | 0.54/0.27/0.78 | Vet'ion | **DO** |
| Greater demons | 8 | 4.1 | 0 | 50,000 | 3,849,000 | 15* | 0.00 | 0.00/0.45/0.72 | - | **BLOCK** |
| Aviansie | 7 | 3.6 | 0 | 10,000 | 4,349,000 | 25* | 0.00 | 0.00/0.09/0.81 | - | **SKIP** |
| Black demons | 7 | 3.6 | 0 | 45,000 | 3,958,000 | 18* | 0.00 | 0.00/0.41/0.74 | - | **SKIP** |
| Fire giants | 7 | 3.6 | 0 | 40,000 | 50,000* | 20* | 0.00 | 0.00/0.36/0.01 | - | **SKIP** |
| Hellhounds | 7 | 3.6 | 0 | 40,000 | 2,785,000 | 20* | 0.00 | 0.00/0.36/0.52 | - | **SKIP** |
| Ice warriors | 7 | 3.6 | 0 | 30,000* | 20,000* | 10* | 0.00 | 0.00/0.27/0.00 | - | **SKIP** |
| Magic axes | 7 | 3.6 | 0 | 30,000* | 50,000* | 10* | 0.00 | 0.00/0.27/0.01 | - | **SKIP** |
| Ankou | 6 | 3.1 | 0 | 55,000 | 128,000 | 12* | 0.00 | 0.00/0.50/0.02 | - | **SKIP** |
| Bears | 6 | 3.1 | 0 | 30,000* | 15,000 | 10* | 0.00 | 0.00/0.27/0.00 | Callisto | **SKIP** |
| Earth warriors | 6 | 3.1 | 0 | 30,000* | 20,000* | 10* | 0.00 | 0.00/0.27/0.00 | - | **SKIP** |
| Ice giants | 6 | 3.1 | 0 | 40,000* | 30,000* | 15* | 0.00 | 0.00/0.36/0.01 | - | **SKIP** |
| Lesser demons | 6 | 3.1 | 0 | 40,000* | 30,000* | 15* | 0.00 | 0.00/0.36/0.01 | - | **SKIP** |
| Mammoths | 6 | 3.1 | 0 | 35,000* | 50,000* | 15* | 0.00 | 0.00/0.32/0.01 | - | **SKIP** |
| Spiritual creatures | 6 | 3.1 | 0 | 25,000 | 312,000 | 25* | 0.00 | 0.00/0.23/0.06 | - | **SKIP** |
| Abyssal demons | 5 | 2.6 | 0 | 80,000 | 2,307,000 | 18* | 0.00 | 0.00/0.73/0.43 | - | **SKIP** |
| Chaos druids | 5 | 2.6 | 0 | 25,000* | 100,000 | 10* | 0.00 | 0.00/0.23/0.02 | - | **SKIP** |
| Dust devils | 5 | 2.6 | 0 | 110,000 | 250,000* | 12* | 0.00 | 0.00/1.00/0.05 | - | **SKIP** |
| Ents | 5 | 2.6 | 0 | 30,000* | 321,000 | 15* | 0.00 | 0.00/0.27/0.06 | - | **SKIP** |
| Jellies | 5 | 2.6 | 0 | 45,000* | 80,000* | 15* | 0.00 | 0.00/0.41/0.01 | - | **SKIP** |
| Nechryael | 5 | 2.6 | 0 | 100,000 | 450,000* | 18* | 0.00 | 0.00/0.91/0.08 | - | **SKIP** |
| Revenants | 5 | 2.6 | 0 | 25,000* | 3,861,000 | 25* | 0.00 | 0.00/0.23/0.72 | - | **SKIP** |
| Rogues | 5 | 2.6 | 0 | 25,000* | 20,000* | 10* | 0.00 | 0.00/0.23/0.00 | - | **SKIP** |
| Bandits | 4 | 2.0 | 0 | 30,000* | 20,000* | 10* | 0.00 | 0.00/0.27/0.00 | - | **SKIP** |
| Black dragons | 4 | 2.0 | 0 | 30,000 | 1,535,000 | 35* | 0.00 | 0.00/0.27/0.29 | King Black Dragon | **SKIP** |
| Bloodveld | 4 | 2.0 | 0 | 100,000 | 150,000* | 15* | 0.00 | 0.00/0.91/0.03 | - | **SKIP** |
| Dark warriors | 4 | 2.0 | 0 | 25,000* | 20,000* | 10* | 0.00 | 0.00/0.23/0.00 | - | **SKIP** |
| Green dragons | 4 | 2.0 | 0 | 30,000* | 914,000 | 25* | 0.00 | 0.00/0.27/0.17 | - | **SKIP** |
| Moss giants | 4 | 2.0 | 0 | 35,000* | 20,000* | 12* | 0.00 | 0.00/0.32/0.00 | - | **SKIP** |
| Black Knights | 3 | 1.5 | 0 | 30,000* | 20,000* | 10* | 0.00 | 0.00/0.27/0.00 | - | **SKIP** |
| Hill Giants | 3 | 1.5 | 0 | 35,000* | 61,000 | 12* | 0.00 | 0.00/0.32/0.01 | - | **SKIP** |
| Lava dragons | 3 | 1.5 | 0 | 30,000* | 1,501,000 | 25* | 0.00 | 0.00/0.27/0.28 | - | **SKIP** |
| Pirates | 3 | 1.5 | 0 | 25,000* | 20,000* | 10* | 0.00 | 0.00/0.23/0.00 | - | **SKIP** |
| Zombies | 3 | 1.5 | 0 | 30,000* | 20,000* | 10* | 0.00 | 0.00/0.27/0.00 | - | **SKIP** |

`*` = assumed rate, not measured.

## 5. Turael boost example

Target TzHaar at Duradel (roll 4.5%): expected rolls 22.3, skip cost 639 pts vs Turael 64 min and a streak reset worth ~75 pts (next milestone 10). Recommendation **TURAEL** [derived]. Streak 0 and Turael 3 min/task are [assumed].

## 6. Open questions for Matteo

- Answered 2 Nov: LaB unlocked, Duradel, Wings Spread owned, 7 Duradel blocks, no forced excludes.
- Still open: blocks at Nieve/Konar/Krystilia (modelled as none); unlocks in config unlocks_assumed (Reptile Got Ripped, Basilocked, Hot Stuff, wildy ones) are assumed owned; Mortimer unmodelled.
