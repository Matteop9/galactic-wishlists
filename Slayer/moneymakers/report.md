# OSRS money makers: profit, luck, effort, skill (2026-11-05)

Source: OSRS wiki bucket `money_making_guide`, Category:Worthwhile money making guides. 524 guides read (489 normal, 35 recurring); 489 normal guides after filters (none).

**Caveats (read every time)**

- gp/hr is **read** from the wiki: outputs after 2% GE tax minus inputs, at the guide's default kills/actions per hour, with prices frozen at the wiki's last page render. Run with `--reprice` for live GE prices.
- sd, cv, luck_share, hours_to_10pct are **derived** from a per-line drop model (`variance.model = refined`): per-kill drops with p<1 are Bernoulli per kill, guaranteed integer drops and per-hour production at >= 20/hr are deterministic, everything else Poisson. Inputs deterministic. This understates variance for stacked drops averaged into one line and ignores kph/death variance. Pure-Poisson figures are in report.json (`sd_poisson`, `cv_poisson`).
- hours_to_10pct = hours before realised gp/hr is within +-10% of expectation ~95% of the time = (1.96 cv / 0.10)^2.
- Effort (1-5) and Skill (1-5) are **assumed** mappings: effort from wiki intensity (Low 1 / Moderate 3 / High 5, category fallback if missing; text adjustments off, use `--details`); skill from the keyword table in `data/skill_tiers.json`. Bands, risk penalty (0.5 sd) and thresholds live in `data/config.json`.
- Recurring guides (birdhouses, herb runs, daily claims) are per run, not 'do it for 5 hours'; they are excluded from sections 1-4 and listed in section 5.
- Requirements and kph assume the guide author's setup (often max gear). Your rate will differ.

## 1. Top 40 by gp/hr

| # | Method | gp/hr | sd/hr | cv | band | luck share | hrs to +-10% | effort | skill | risk-adj | category | req skills | mem |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | [Completing The Fractured Archive (Trio)](https://oldschool.runescape.wiki/w/Money_making_guide/The_Fractured_Archive_%28Trio%29) | 22.81m | 208.26m | 9.13 | lottery | 96% | 32,016 | 5 | 4 | -81.32m | Combat/High | Str 95, Rng 95, Mag 94, Att 90, HP 90, ~ | Y |
| 2 | [Completing the Fortis Colosseum (Wave 12)](https://oldschool.runescape.wiki/w/Money_making_guide/Completing_the_Fortis_Colosseum_%28Wave_12%29) | 13.77m | 30.76m | 2.23 | lottery | 42% | 1,918 | 5 | 5 | -1.61m | Combat/High | Att 95, Str 95, HP 95, Mag 94, Def 90, ~ | Y |
| 3 | [Killing The Doom of Mokhaiotl (Delve 1-16)](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_the_Doom_of_Mokhaiotl_%28Delve_1-16%29) | 12.78m | 34.20m | 2.68 | lottery | 83% | 2,752 | 5 | 5 | -4.32m | Combat/High | Rng 90, HP 90, Mag 80, Pray 77, Def 70 | Y |
| 4 | [Completing the Contract of Shard Acquisition (d~](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Yama_%28Contract_of_Shard_Acquisition,_duo%29) | 11.78m | 11.21m | 0.95 | lucky | 8% | 348 | 5 | 5 | 6.17m | Combat/High | Mag 99, HP 99, Pray 77, Def 75 | Y |
| 5 | [Killing Nex (Duo)](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Nex_%28Duo%29) | 10.30m | 45.66m | 4.43 | lottery | 91% | 7,545 | 5 | 4 | -12.53m | Combat/High | Str 95, Rng 95, Att 90, Def 90, Mag 90,~ | Y |
| 6 | [Killing the Maggot King](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_the_Maggot_King) | 9.82m | 31.02m | 3.16 | lottery | 94% | 3,830 | 5 | 4 | -5.69m | Combat/High | Mag 95, Att 90, Str 90, Craft 84, Pray ~ | Y |
| 7 | [Killing The Doom of Mokhaiotl (Delve 1-8)](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_the_Doom_of_Mokhaiotl_%28Delve_1-8%29) | 9.51m | 29.22m | 3.07 | lottery | 77% | 3,628 | 5 | 5 | -5.10m | Combat/High | Rng 90, HP 90, Mag 80, Pray 77, Def 70 | Y |
| 8 | [Killing Phosani's Nightmare](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Phosani's_Nightmare) | 9.40m | 38.73m | 4.12 | lottery | 95% | 6,518 | 5 | 5 | -9.96m | Combat/High | HP 90, Mag 90, Pray 70, Att ?, Str ?, D~ | Y |
| 9 | [Chambers of Xeric (Challenge Mode)](https://oldschool.runescape.wiki/w/Money_making_guide/Chambers_of_Xeric_%28Challenge_Mode%29) | 9.32m | 93.24m | 10.00 | lottery | 93% | 38,450 | 5 | 5 | -37.30m | Combat/High | Att 95, Pray 85, WC 84, Mining 80, Herb~ | Y |
| 10 | [Killing the Maggot King (Ranged)](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_the_Maggot_King_%28Ranged%29) | 8.08m | 27.75m | 3.44 | lottery | 94% | 4,534 | 5 | 4 | -5.80m | Combat/High | Str 85, Craft 84, Att 80, Rng 80, Pray ~ | Y |
| 11 | [Completing the Theatre of Blood (trio)](https://oldschool.runescape.wiki/w/Money_making_guide/Theatre_of_Blood) | 8.00m | 76.77m | 9.60 | lottery | 89% | 35,402 | 5 | 5 | -30.39m | Combat/High | Str 99, Rng 99, Att 95, Def 95, HP 95, ~ | Y |
| 12 | [Chambers of Xeric (Normal Mode)](https://oldschool.runescape.wiki/w/Money_making_guide/Chambers_of_Xeric_%28Normal_Mode%29) | 7.79m | 87.37m | 11.21 | lottery | 92% | 48,308 | 5 | 5 | -35.89m | Combat/High | Att 90, Herb 78, Pray 74, WC 70, Mining~ | Y |
| 13 | [Completing solo Tombs of Amascut at raid level ~](https://oldschool.runescape.wiki/w/Money_making_guide/Tombs_of_Amascut_%28solo_545_raid_level%29) | 7.75m | 63.93m | 8.25 | lottery | 97% | 26,152 | 5 | 5 | -24.22m | Combat/High | Att 95, Str 95, HP 95, Mag 94, Def 90, ~ | Y |
| 14 | [Killing Duke Sucellus](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Duke_Sucellus) | 6.72m | 16.82m | 2.50 | lottery | 69% | 2,403 | 5 | 4 | -1.68m | Combat/High | Str 90, Att 90, Def 90, Pray 70 | Y |
| 15 | [Killing Vardorvis](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Vardorvis) | 6.62m | 20.98m | 3.17 | lottery | 79% | 3,864 | 5 | 4 | -3.88m | Combat/High | Str 90, Att 90, Def 90, Pray 70 | Y |
| 16 | [Killing Phantom Muspah (Twisted Bow)](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Phantom_Muspah_%28Twisted_bow%29) | 6.19m | 8.06m | 1.30 | lottery | 58% | 650 | 5 | 3 | 2.16m | Combat/High | Rng 90, Mag 85, Def 80, Pray 74 | Y |
| 17 | [Killing Nex](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Nex_%28Team%29) | 6.01m | 35.32m | 5.88 | lottery | 92% | 13,283 | 5 | 4 | -11.65m | Combat/High | Rng 90, Def 90, Mag 85, Pray 74 | Y |
| 18 | [Killing The Leviathan](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_The_Leviathan) | 5.71m | 16.30m | 2.86 | lottery | 74% | 3,133 | 5 | 4 | -2.44m | Combat/High | Rng 90, Pray 74, Def 70 | Y |
| 19 | [Completing solo Tombs of Amascut at raid level ~](https://oldschool.runescape.wiki/w/Money_making_guide/Tombs_of_Amascut_%28solo_450_raid_level%29) | 5.55m | 51.10m | 9.21 | lottery | 97% | 32,605 | 5 | 5 | -20.00m | Combat/High | Att 95, Str 95, HP 95, Mag 94, Def 90, ~ | Y |
| 20 | [Killing Venenatis](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Venenatis) | 5.43m | 7.98m | 1.47 | lottery | 39% | 829 | 5 | 3 | 1.44m | Combat/High | Str 80, Att 80, Pray 70 | Y |
| 21 | [Killing zombie pirates](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_zombie_pirates_%28Max_efficiency%29) | 4.95m | 303k | 0.06 | steady | 2% | 1 | 5 | 2 | 4.80m | Combat/Low | Rng 80, Pray 37 | Y |
| 22 | [Killing The Whisperer](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_The_Whisperer) | 4.89m | 15.22m | 3.11 | lottery | 67% | 3,713 | 5 | 4 | -2.71m | Combat/High | Mag 90, Pray 77 | Y |
| 23 | [Killing Yama (solo)](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Yama_%28solo%29) | 4.87m | 14.82m | 3.04 | lottery | 69% | 3,559 | 5 | 5 | -2.54m | Combat/High | Mag 82, Att 80, Str 80, HP 80, Pray 77,~ | Y |
| 24 | [Killing Vet'ion](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Vet'ion) | 4.18m | 463k | 0.11 | some luck | 6% | 5 | 5 | 3 | 3.95m | Combat/High | Pray 43 | Y |
| 25 | [Killing Kree'arra](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Kree'arra) | 4.11m | 11.08m | 2.69 | lottery | 93% | 2,787 | 5 | 3 | -1.43m | Combat/High | Rng 80, Mag 80, Pray 77, Def ? | Y |
| 26 | [Completing the Contract of Catalyst Acquisition~](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Yama_%28Contract_of_Catalyst_Acquisition,_duo%29) | 4.08m | 11.01m | 2.70 | lottery | 46% | 2,799 | 5 | 5 | -1.43m | Combat/High | Mag 99, HP 99, Pray 77, Def 75 | Y |
| 27 | [Killing The Nightmare](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_The_Nightmare) | 3.93m | 24.94m | 6.35 | lottery | 92% | 15,481 | 5 | 4 | -8.54m | Combat/High | Att 85, Str 85, Def 85, Mag 85, HP 85, ~ | Y |
| 28 | [Killing demonic gorillas](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_demonic_gorillas) | 3.92m | 5.94m | 1.52 | lottery | 73% | 884 | 5 | 3 | 946k | Combat/High | Str 85, Rng 85, Att 80, Def 80, HP 80, ~ | Y |
| 29 | [Killing Vorkath using Dragon hunter lance](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Vorkath_%28Dragon_hunter_lance%29) | 3.91m | 808k | 0.21 | some luck | 11% | 16 | 5 | 3 | 3.51m | Combat/High | Att 90, Def 85, Pray 70, Str ?, HP ? | Y |
| 30 | [Killing Spindel](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Spindel) | 3.91m | 7.62m | 1.95 | lottery | 50% | 1,462 | 5 | 3 | 96k | Combat/High | Str 80, Att 80, Pray 70 | Y |
| 31 | [Killing revenants (Craw's bow)](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_revenants_%28Craw's_bow%29) | 3.85m | 3.41m | 0.88 | lucky | 36% | 301 | 5 | 3 | 2.15m | Combat/Mid | Rng 90, Agil 65, Def 45, Pray 43 | Y |
| 32 | [Pickpocketing Elves](https://oldschool.runescape.wiki/w/Money_making_guide/Pickpocketing_elves) | 3.85m | 2.97m | 0.77 | lucky | 0% | 229 | 5 | 1 | 2.36m | Skilling | Herb 93, Thiev 85, Agil 50, Mag 47, HP ? | Y |
| 33 | [Killing Araxxor](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Araxxor) | 3.85m | 7.84m | 2.04 | lottery | 74% | 1,596 | 5 | 4 | -73k | Combat/High | Slayer 92, Str 90, Rng 86, Craft 86, At~ | Y |
| 34 | [Killing Tormented Demons](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Tormented_Demons) | 3.74m | 9.58m | 2.56 | lottery | 82% | 2,517 | 5 | 3 | -1.05m | Combat/High | Str 85, Rng 85, Mag 82, Att 80, Def 80,~ | Y |
| 35 | [Completing The Corrupted Gauntlet](https://oldschool.runescape.wiki/w/Money_making_guide/Completing_The_Corrupted_Gauntlet) | 3.69m | 10.69m | 2.90 | lottery | 51% | 3,222 | 5 | 4 | -1.65m | Combat/High | Str 85, Rng 85, Att 80, Mag 80, Pray 77 | Y |
| 36 | [Killing the Alchemical Hydra](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_the_Alchemical_Hydra) | 3.64m | 6.00m | 1.65 | lottery | 41% | 1,048 | 5 | 4 | 633k | Combat/High | Slayer 95, HP 85, Rng 75, Pray 74 | Y |
| 37 | [Crafting double nature runes with the achieveme~](https://oldschool.runescape.wiki/w/Money_making_guide/Crafting_double_nature_runes_%28Achievement_Diary_Cape_teleport%29) | 3.60m | 0 | 0.00 | steady | 0% | <1 | 5 | 1 | 3.60m | Skilling | RC 91, FM 90 | Y |
| 38 | [Killing Vorkath using Dragon hunter crossbow](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Vorkath_%28Dragon_hunter_crossbow%29) | 3.50m | 808k | 0.23 | some luck | 11% | 21 | 5 | 3 | 3.09m | Combat/High | Rng 90, Def 80, Pray 74, HP ? | Y |
| 39 | [Creating crystal keys](https://oldschool.runescape.wiki/w/Money_making_guide/Creating_crystal_keys) | 3.38m | 0 | 0.00 | steady | 0% | <1 | 5 | 1 | 3.38m | Processing | - | Y |
| 40 | [Crafting blood runes](https://oldschool.runescape.wiki/w/Money_making_guide/Crafting_blood_runes) | 3.29m | 20k | 0.01 | steady | 0% | <1 | 5 | 1 | 3.28m | Skilling | Agil 93, Mining 78, RC 77, FM 62 | Y |

## 2. Effort x skill matrix (best 5 by gp/hr per cell)

| effort \ skill | easy (1-2) | mid (3) | hard (4) | elite (5) |
|---|---|---|---|---|
| **low (1-2)** | [Killing Frost dragons (on-task)](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Frost_dragons_%28on-task%29) 1.98m<br>[Picking up drops from Araxytes](https://oldschool.runescape.wiki/w/Money_making_guide/Sac_jacking) 1.89m<br>[Killing Frost dragons (off-task)](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Frost_dragons_%28off-task%29) 1.71m<br>[Smithing rune items (Player-to-pl~](https://oldschool.runescape.wiki/w/Money_making_guide/Smithing_rune_items_%28Player-to-player_trading%29) 1.54m<br>[Killing brutal black dragons](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_brutal_black_dragons) 1.52m | [Killing Dagannoth Kings (Rex only)](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Dagannoth_Kings_%28Rex_only%29) 878k<br>[Creating Barrows teleport tablets](https://oldschool.runescape.wiki/w/Money_making_guide/Creating_Barrows_teleport_tablets) 838k<br>[Killing the Kraken boss.](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_the_Kraken) 817k | - | - |
| **mid (3)** | [Cutting raw marlin](https://oldschool.runescape.wiki/w/Money_making_guide/Cutting_raw_marlin) 3.18m<br>[Slaying venators](https://oldschool.runescape.wiki/w/Money_making_guide/Slaying_Venators) 2.37m<br>[Making Sanfew serum(4)](https://oldschool.runescape.wiki/w/Money_making_guide/Making_sanfew_serum%284%29) 2.29m<br>[Deep sea trawling Marlin shoals](https://oldschool.runescape.wiki/w/Money_making_guide/Deep_sea_trawling_for_marlin) 2.04m<br>[Crafting death runes through the ~](https://oldschool.runescape.wiki/w/Money_making_guide/Crafting_death_runes_through_the_Abyss) 2.02m | [Killing Dagannoth Kings (Solo tri~](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Dagannoth_Kings_%28Solo_tribrid%29) 2.01m<br>[Killing Scorpia](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Scorpia) 1.77m<br>[Mining and crushing infernal shal~](https://oldschool.runescape.wiki/w/Money_making_guide/Mining_and_crushing_infernal_shale_%28Tick_manipulation%29) 1.17m<br>[Killing the Mad Angel](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_the_Mad_Angel) 937k<br>[Killing Amoxliatl](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Amoxliatl) 520k | - | - |
| **high (4-5)** | [Killing zombie pirates](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_zombie_pirates_%28Max_efficiency%29) 4.95m<br>[Pickpocketing Elves](https://oldschool.runescape.wiki/w/Money_making_guide/Pickpocketing_elves) 3.85m<br>[Crafting double nature runes with~](https://oldschool.runescape.wiki/w/Money_making_guide/Crafting_double_nature_runes_%28Achievement_Diary_Cape_teleport%29) 3.60m<br>[Creating crystal keys](https://oldschool.runescape.wiki/w/Money_making_guide/Creating_crystal_keys) 3.38m<br>[Crafting blood runes](https://oldschool.runescape.wiki/w/Money_making_guide/Crafting_blood_runes) 3.29m | [Killing Phantom Muspah (Twisted B~](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Phantom_Muspah_%28Twisted_bow%29) 6.19m<br>[Killing Venenatis](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Venenatis) 5.43m<br>[Killing Vet'ion](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Vet'ion) 4.18m<br>[Killing Kree'arra](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Kree'arra) 4.11m<br>[Killing demonic gorillas](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_demonic_gorillas) 3.92m | [Completing The Fractured Archive ~](https://oldschool.runescape.wiki/w/Money_making_guide/The_Fractured_Archive_%28Trio%29) 22.81m<br>[Killing Nex (Duo)](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Nex_%28Duo%29) 10.30m<br>[Killing the Maggot King](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_the_Maggot_King) 9.82m<br>[Killing the Maggot King (Ranged)](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_the_Maggot_King_%28Ranged%29) 8.08m<br>[Killing Duke Sucellus](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Duke_Sucellus) 6.72m | [Completing the Fortis Colosseum (~](https://oldschool.runescape.wiki/w/Money_making_guide/Completing_the_Fortis_Colosseum_%28Wave_12%29) 13.77m<br>[Killing The Doom of Mokhaiotl (De~](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_the_Doom_of_Mokhaiotl_%28Delve_1-16%29) 12.78m<br>[Completing the Contract of Shard ~](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Yama_%28Contract_of_Shard_Acquisition,_duo%29) 11.78m<br>[Killing The Doom of Mokhaiotl (De~](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_the_Doom_of_Mokhaiotl_%28Delve_1-8%29) 9.51m<br>[Killing Phosani's Nightmare](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Phosani's_Nightmare) 9.40m |

## 3. Top 20 steady methods (cv < 0.10) by gp/hr

| # | Method | gp/hr | cv | effort | skill | category | req skills |
|---|---|---|---|---|---|---|---|
| 1 | [Killing zombie pirates](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_zombie_pirates_%28Max_efficiency%29) | 4.95m | 0.061 | 5 | 2 | Combat/Low | Rng 80, Pray 37 |
| 2 | [Crafting double nature runes with the achieveme~](https://oldschool.runescape.wiki/w/Money_making_guide/Crafting_double_nature_runes_%28Achievement_Diary_Cape_teleport%29) | 3.60m | 0.000 | 5 | 1 | Skilling | RC 91, FM 90 |
| 3 | [Creating crystal keys](https://oldschool.runescape.wiki/w/Money_making_guide/Creating_crystal_keys) | 3.38m | 0.000 | 5 | 1 | Processing | - |
| 4 | [Crafting blood runes](https://oldschool.runescape.wiki/w/Money_making_guide/Crafting_blood_runes) | 3.29m | 0.006 | 5 | 1 | Skilling | Agil 93, Mining 78, RC 77, FM 62 |
| 5 | [Cutting raw marlin](https://oldschool.runescape.wiki/w/Money_making_guide/Cutting_raw_marlin) | 3.18m | 0.000 | 3 | 1 | Processing | Cooking ?, Sailing ? |
| 6 | [Crafting sunfire runes](https://oldschool.runescape.wiki/w/Money_making_guide/Crafting_sunfire_runes) | 3.04m | 0.003 | 5 | 1 | Skilling | RC 98, FM 75 |
| 7 | [Smelting runite bars at the Blast Furnace (Play~](https://oldschool.runescape.wiki/w/Money_making_guide/Smelting_runite_bars_at_Blast_Furnace_%28Player-to-player_trading%29) | 3.01m | 0.000 | 5 | 1 | Skilling | Smith 85 |
| 8 | [Crafting wrath runes](https://oldschool.runescape.wiki/w/Money_making_guide/Crafting_wrath_runes) | 2.83m | 0.007 | 5 | 1 | Skilling | RC 95 |
| 9 | [Crafting blood runes through the Abyss](https://oldschool.runescape.wiki/w/Money_making_guide/Crafting_blood_runes_through_the_Abyss) | 2.59m | 0.014 | 5 | 1 | Skilling | RC 77, HP 70, FM 62, Mining 21, Agil ? |
| 10 | [Smithing runite bars at the Blast Furnace](https://oldschool.runescape.wiki/w/Money_making_guide/Smelting_runite_bars_at_Blast_Furnace) | 2.56m | 0.000 | 5 | 1 | Skilling | Smith 85 |
| 11 | [Cutting raw yellowfin](https://oldschool.runescape.wiki/w/Money_making_guide/Cutting_raw_yellowfin) | 2.39m | 0.000 | 5 | 1 | Processing | Cooking ?, Sailing ? |
| 12 | [Stealing from Rogues' Castle chests](https://oldschool.runescape.wiki/w/Money_making_guide/Stealing_from_Rogues'_Castle_chests) | 2.32m | 0.096 | 5 | 1 | Skilling | Thiev 84, Pray 43 |
| 13 | [Making Sanfew serum(4)](https://oldschool.runescape.wiki/w/Money_making_guide/Making_sanfew_serum%284%29) | 2.29m | 0.000 | 3 | 1 | Skilling | Herb 65 |
| 14 | [Degriming grimy snapdragon](https://oldschool.runescape.wiki/w/Money_making_guide/Degriming_grimy_snapdragon) | 2.26m | 0.000 | 5 | 1 | Skilling | Mag 70, Herb 59 |
| 15 | [Smithing adamantite bars at the Blast Furnace](https://oldschool.runescape.wiki/w/Money_making_guide/Smelting_adamantite_bars_at_Blast_Furnace) | 2.24m | 0.000 | 5 | 1 | Skilling | Smith 70 |
| 16 | [Degriming grimy toadflax](https://oldschool.runescape.wiki/w/Money_making_guide/Degriming_grimy_toadflax) | 2.13m | 0.000 | 5 | 1 | Skilling | Mag 70, Herb 50 |
| 17 | [Crafting astral runes](https://oldschool.runescape.wiki/w/Money_making_guide/Crafting_astral_runes) | 2.03m | 0.005 | 5 | 1 | Skilling | RC 85, FM 75, Mag 69 |
| 18 | [Crafting death runes through the Abyss](https://oldschool.runescape.wiki/w/Money_making_guide/Crafting_death_runes_through_the_Abyss) | 2.02m | 0.015 | 3 | 1 | Skilling | FM 75, HP 70, RC 65, Mining 21, Agil ?,~ |
| 19 | [Completing Wilderness Agility Course with a 61+~](https://oldschool.runescape.wiki/w/Money_making_guide/Wilderness_Agility_Course) | 2.02m | 0.092 | 5 | 1 | Skilling | Agil 52 |
| 20 | [Crafting Aether runes using Scarred extract](https://oldschool.runescape.wiki/w/Money_making_guide/Crafting_aether_runes_using_scarred_extract) | 2.00m | 0.018 | 5 | 1 | Skilling | RC 90, Mag 82, Con 80, FM 75, Agil 66 |

## 4. Top 20 lottery methods (cv >= 1.0) by gp/hr

| # | Method | gp/hr | sd/hr | cv | hrs to +-10% | main variance item | its share of var | its rate/hr |
|---|---|---|---|---|---|---|---|---|
| 1 | [Completing The Fractured Archive (Trio)](https://oldschool.runescape.wiki/w/Money_making_guide/The_Fractured_Archive_%28Trio%29) | 22.81m | 208.26m | 9.13 | 32,016 | Obligator (uncharged) | 95% | 0.0050 |
| 2 | [Completing the Fortis Colosseum (Wave 12)](https://oldschool.runescape.wiki/w/Money_making_guide/Completing_the_Fortis_Colosseum_%28Wave_12%29) | 13.77m | 30.76m | 2.23 | 1,918 | Tonalztics of Ralos (uncharged) | 100% | 0.0300 |
| 3 | [Killing The Doom of Mokhaiotl (Delve 1-16)](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_the_Doom_of_Mokhaiotl_%28Delve_1-16%29) | 12.78m | 34.20m | 2.68 | 2,752 | Avernic treads | 89% | 0.0527 |
| 4 | [Killing Nex (Duo)](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Nex_%28Duo%29) | 10.30m | 45.66m | 4.43 | 7,545 | Nihil horn | 65% | 0.0132 |
| 5 | [Killing the Maggot King](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_the_Maggot_King) | 9.82m | 31.02m | 3.16 | 3,830 | Elder venator fang | 89% | 0.0735 |
| 6 | [Killing The Doom of Mokhaiotl (Delve 1-8)](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_the_Doom_of_Mokhaiotl_%28Delve_1-8%29) | 9.51m | 29.22m | 3.07 | 3,628 | Avernic treads | 88% | 0.0376 |
| 7 | [Killing Phosani's Nightmare](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Phosani's_Nightmare) | 9.40m | 38.73m | 4.12 | 6,518 | Harmonised orb | 33% | 0.0059 |
| 8 | [Chambers of Xeric (Challenge Mode)](https://oldschool.runescape.wiki/w/Money_making_guide/Chambers_of_Xeric_%28Challenge_Mode%29) | 9.32m | 93.24m | 10.00 | 38,450 | Twisted bow | 98% | 0.0043 |
| 9 | [Killing the Maggot King (Ranged)](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_the_Maggot_King_%28Ranged%29) | 8.08m | 27.75m | 3.44 | 4,534 | Elder venator fang | 89% | 0.0588 |
| 10 | [Completing the Theatre of Blood (trio)](https://oldschool.runescape.wiki/w/Money_making_guide/Theatre_of_Blood) | 8.00m | 76.77m | 9.60 | 35,402 | Scythe of Vitur (uncharged) | 99% | 0.0058 |
| 11 | [Chambers of Xeric (Normal Mode)](https://oldschool.runescape.wiki/w/Money_making_guide/Chambers_of_Xeric_%28Normal_Mode%29) | 7.79m | 87.37m | 11.21 | 48,308 | Twisted bow | 98% | 0.0038 |
| 12 | [Completing solo Tombs of Amascut at raid level ~](https://oldschool.runescape.wiki/w/Money_making_guide/Tombs_of_Amascut_%28solo_545_raid_level%29) | 7.75m | 63.93m | 8.25 | 26,152 | Tumeken's shadow (uncharged) | 98% | 0.0088 |
| 13 | [Killing Duke Sucellus](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Duke_Sucellus) | 6.72m | 16.82m | 2.50 | 2,403 | Eye of the Duke | 89% | 0.0472 |
| 14 | [Killing Vardorvis](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Vardorvis) | 6.62m | 20.98m | 3.17 | 3,864 | Ultor ring | 62% | 0.0294 |
| 15 | [Killing Phantom Muspah (Twisted Bow)](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Phantom_Muspah_%28Twisted_bow%29) | 6.19m | 8.06m | 1.30 | 650 | Venator shard | 100% | 0.2500 |
| 16 | [Killing Nex](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Nex_%28Team%29) | 6.01m | 35.32m | 5.88 | 13,283 | Nihil horn | 65% | 0.0079 |
| 17 | [Killing The Leviathan](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_The_Leviathan) | 5.71m | 16.30m | 2.86 | 3,133 | Leviathan's lure | 63% | 0.0312 |
| 18 | [Completing solo Tombs of Amascut at raid level ~](https://oldschool.runescape.wiki/w/Money_making_guide/Tombs_of_Amascut_%28solo_450_raid_level%29) | 5.55m | 51.10m | 9.21 | 32,605 | Tumeken's shadow (uncharged) | 98% | 0.0056 |
| 19 | [Killing Venenatis](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_Venenatis) | 5.43m | 7.98m | 1.47 | 829 | Voidwaker gem | 100% | 0.0722 |
| 20 | [Killing The Whisperer](https://oldschool.runescape.wiki/w/Money_making_guide/Killing_The_Whisperer) | 4.89m | 15.22m | 3.11 | 3,713 | Siren's staff | 90% | 0.0391 |

## 5. Recurring guides (per run)

| # | Method | profit/run | run time (min) | gp/hr of play | recurrence | effort | category | req skills |
|---|---|---|---|---|---|---|---|---|
| 1 | [Buying battlestaves from Zaff](https://oldschool.runescape.wiki/w/Money_making_guide/Buying_battlestaves_from_Zaff) | 83k | 0.5 | 9.91m | 1440 minutes | 2 | Recurring | - |
| 2 | [Planting Celastrus sapling](https://oldschool.runescape.wiki/w/Money_making_guide/Planting_Celastrus_sapling) | 49k | 0.8 | 3.94m | 800 minutes | 2 | Farming | Farming 85 |
| 3 | [Exchanging mole parts](https://oldschool.runescape.wiki/w/Money_making_guide/Exchanging_mole_parts) | 96k | 1.5 | 3.86m | 240 minutes | 3 | Processing | - |
| 4 | [Managing Miscellania](https://oldschool.runescape.wiki/w/Money_making_guide/Managing_Miscellania) | 24k | 0.5 | 2.89m | 1440 minutes | 2 | Collecting | WC 45, Herb 35, Farming 10 |
| 5 | [Growing magic saplings](https://oldschool.runescape.wiki/w/Money_making_guide/Growing_magic_saplings) | 454k | 10.0 | 2.72m | 240 minutes | 3 | Processing (Sapling) | Combat 85, Farming 75, Mag 68 |
| 6 | [Growing coral](https://oldschool.runescape.wiki/w/Money_making_guide/Growing_coral) | 97k | 2.2 | 2.59m | 160 minutes | 2 | Farming | Farming 28 |
| 7 | [Opening 15 herb boxes](https://oldschool.runescape.wiki/w/Money_making_guide/Opening_herb_boxes) | 84k | 2.0 | 2.53m | 1440 minutes | 3 | Minigame | - |
| 8 | [Bird house trapping](https://oldschool.runescape.wiki/w/Money_making_guide/Bird_house_trapping) | 55k | 1.4 | 2.34m | 50 minutes | 3 | Hunter | Mag 49, Con 25, Craft 5, Hunter ? |
| 9 | [Dying black robes into blue wizard robes](https://oldschool.runescape.wiki/w/Money_making_guide/Dying_blue_wizard_robes) | 348k | 11.0 | 1.90m | 24 hours (or 4 hours at less ~ | 3 | Processing | - |
| 10 | [Farming huasca](https://oldschool.runescape.wiki/w/Money_making_guide/Farming_huasca) | 169k | 6.0 | 1.69m | 90 minutes | 2 | Farming (Herb) | Agil 73, Farming 65, Mag 61 |
| 11 | [Farming ranarr weed](https://oldschool.runescape.wiki/w/Money_making_guide/Farming_ranarr_weed) | 167k | 6.0 | 1.67m | 90 minutes | 2 | Farming (Herb) | Agil 73, Mag 61, Farming 32 |
| 12 | [Farming torstol](https://oldschool.runescape.wiki/w/Money_making_guide/Farming_torstol) | 167k | 6.0 | 1.67m | 90 minutes | 2 | Farming (Herb) | Farming 85, Agil 73, Mag 61 |
| 13 | [Farming snapdragon](https://oldschool.runescape.wiki/w/Money_making_guide/Farming_snapdragon) | 166k | 6.0 | 1.66m | 90 minutes | 2 | Farming (Herb) | Agil 73, Farming 62, Mag 61 |
| 14 | [Growing palm saplings](https://oldschool.runescape.wiki/w/Money_making_guide/Growing_palm_saplings) | 251k | 10.0 | 1.51m | 240 minutes | 3 | Processing (Sapling) | Combat 85, Farming 68, Mag 68 |
| 15 | [Farming kwuarm](https://oldschool.runescape.wiki/w/Money_making_guide/Farming_kwuarm) | 148k | 6.0 | 1.48m | 90 minutes | 2 | Farming (Herb) | Agil 73, Mag 61, Farming 56 |
| 16 | [Farming toadflax](https://oldschool.runescape.wiki/w/Money_making_guide/Farming_toadflax) | 141k | 6.0 | 1.41m | 90 minutes | 2 | Farming (Herb) | Agil 73, Mag 61, Farming 38 |
| 17 | [Farming cadantine](https://oldschool.runescape.wiki/w/Money_making_guide/Farming_cadantine) | 137k | 6.0 | 1.37m | 90 minutes | 2 | Farming (Herb) | Agil 73, Farming 67, Mag 61 |
| 18 | [Picking cactus spines](https://oldschool.runescape.wiki/w/Money_making_guide/Picking_cactus_spines) | 23k | 1.0 | 1.36m | 60 minutes | 2 | Farming | Farming 55 |
| 19 | [Farming hemp](https://oldschool.runescape.wiki/w/Money_making_guide/Farming_hemp) | 110k | 5.0 | 1.32m | 80 minutes | 2 | Farming (Hop) | Farming 37 |
| 20 | [Brewing chef's delight(m)](https://oldschool.runescape.wiki/w/Money_making_guide/Brewing_chef's_delight%28m%29) | 532k | 25.0 | 1.28m | 2880 minutes | 3 | Cooking (Brewing) | Cooking 54 |
| 21 | [Brewing greenman's ale(m)](https://oldschool.runescape.wiki/w/Money_making_guide/Brewing_greenman's_ale%28m%29) | 500k | 25.0 | 1.20m | 2880 minutes | 3 | Cooking (Brewing) | Cooking 40 |
| 22 | [Claiming runes from Lundail](https://oldschool.runescape.wiki/w/Money_making_guide/Claiming_runes_from_Lundail) | 19k | 1.0 | 1.12m | 1440 minutes | 2 | Recurring | Agil ?, Cooking ?, FM ?, Fishing ?, Fle~ |
| 23 | [Farming jute fibre](https://oldschool.runescape.wiki/w/Money_making_guide/Farming_jute_fibre) | 89k | 5.0 | 1.07m | 50 minutes | 2 | Farming (Hop) | Farming 80 |
| 24 | [Picking papayas](https://oldschool.runescape.wiki/w/Money_making_guide/Picking_papayas) | 49k | 3.0 | 976k | 180 minutes | 2 | Farming (Picking Fruit tree) | Farming 57 |
| 25 | [Claiming dynamite from Thirus](https://oldschool.runescape.wiki/w/Money_making_guide/Claiming_Dynamite_from_Thirus) | 7k | 0.5 | 893k | 1440 minutes | 2 | Recurring | - |
| 26 | [Farming irit leaves](https://oldschool.runescape.wiki/w/Money_making_guide/Farming_irit_leaves) | 88k | 6.0 | 881k | 90 minutes | 2 | Farming (Herb) | Agil 73, Mag 61, Farming 44 |
| 27 | [Farming avantoe](https://oldschool.runescape.wiki/w/Money_making_guide/Farming_avantoe) | 83k | 6.0 | 832k | 90 minutes | 2 | Farming (Herb) | Agil 73, Mag 61, Farming 50 |
| 28 | [Farming cotton bolls](https://oldschool.runescape.wiki/w/Money_making_guide/Farming_cotton_bolls) | 67k | 5.0 | 800k | 100 minutes | 2 | Farming (Hop) | Farming 71 |
| 29 | [Farming dwarf weed](https://oldschool.runescape.wiki/w/Money_making_guide/Farming_dwarf_weed) | 79k | 6.0 | 787k | 90 minutes | 2 | Farming (Herb) | Farming 79, Agil 73, Mag 61 |
| 30 | [Picking coconuts](https://oldschool.runescape.wiki/w/Money_making_guide/Picking_coconuts) | 37k | 3.0 | 732k | 270 minutes | 2 | Farming (Picking Fruit tree) | Farming 68 |
| 31 | [Planting Crystal acorn](https://oldschool.runescape.wiki/w/Money_making_guide/Planting_Crystal_acorn) | 60k | 5.0 | 719k | 480 minutes | 3 | Processing | Herb 97, Farming 74 |
| 32 | [Farming Yanillian hops](https://oldschool.runescape.wiki/w/Money_making_guide/Farming_Yanillian_hops) | 72k | 6.0 | 716k | 60 minutes | 2 | Farming (Hop) | Farming 80 |
| 33 | [Farming lantadyme](https://oldschool.runescape.wiki/w/Money_making_guide/Farming_lantadyme) | 62k | 6.0 | 619k | 90 minutes | 2 | Farming (Herb) | Farming 73, Agil 73, Mag 61 |
| 34 | [Selling hardleather bodies to the Al Kharid Gen~](https://oldschool.runescape.wiki/w/Money_making_guide/Selling_hardleather_bodies) | 625 | 1.0 | 38k | 20 hours | 2 | Collecting | - |
| 35 | [Claiming pure essence from Wizard Cromperty](https://oldschool.runescape.wiki/w/Money_making_guide/Claiming_pure_essence_from_Wizard_Cromperty) | 250 | 1.0 | 15k | 1440 minutes | 2 | Recurring | Agil ?, Att ?, Craft ?, Con ?, Cooking ~ |

## 6. Data quality

- Profit recompute vs wiki `value`: 524/524 within 2%; 0 mismatches.

- Normal guides with no intensity (effort from category fallback): 0. All 35 recurring guides lack intensity by template design.
- Unparsed skill strings: 1
  - [Opening 15 herb boxes](https://oldschool.runescape.wiki/w/Money_making_guide/Opening_herb_boxes): `''For getting [[Nightmare Zone]] points, see [[Nightmare Zone/Strategies#Setups|this section]].''`
- Guides with gp/hr <= 0 (cv undefined): 0
- Skill tier unverified (content not known to the keyword table author): [Completing The Fractured Archive (Trio)](https://oldschool.runescape.wiki/w/Money_making_guide/The_Fractured_Archive_%28Trio%29) -> 4

_Generated by moneymakers/run.py in 0.3s. Objective: gp/hr; luck, effort and skill are context, not filters._
