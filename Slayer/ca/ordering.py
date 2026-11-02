"""Ordering view: rank the required set by Matteo's own standing, not population comp%.

Score per boss = open pts x familiarity x access, where
  familiarity = 1 + kc_weight * log10(1 + KC)          (KC read from hiscores)
  access      = 0 if level-gated, avoid_factor if on the avoid list, team_factor if team content, else 1.
Also re-runs the solver with avoid-list bosses excluded to price what avoiding them costs the cutoff.
"""
import math

from ca.solver import solve
from fetch.common import log

# CA boss name -> hiscores activity name, where they differ.
KC_ALIAS = {
    "Barrows": "Barrows Chests", "Corrupted Hunllef": "The Corrupted Gauntlet", "Crystalline Hunllef": "The Gauntlet",
    "Leviathan": "The Leviathan", "Whisperer": "The Whisperer", "Royal Titans": "The Royal Titans",
    "Shellbane gryphon": "Shellbane Gryphon", "Kree'arra": "Kree'Arra", "The Nightmare": "Nightmare",
    "Fortis Colosseum": "Sol Heredit", "The Mimic": "Mimic", "Moons of Peril": "Lunar Chests",
    "Tombs of Amascut: Entry Mode": "Tombs of Amascut", "Theatre of Blood: Entry Mode": "Theatre of Blood",
    "TzHaar-Ket-Rak's Challenges": "TzKal-Zuk", "Callisto": "Callisto", "Venenatis": "Venenatis", "Vet'ion": "Vet'ion",
}
# Wilderness bosses share KC with their singles-plus twin.
KC_SUM = {"Callisto": ["Callisto", "Artio"], "Venenatis": ["Venenatis", "Spindel"], "Vet'ion": ["Vet'ion", "Calvar'ion"]}
NO_KC = {"N/A", "Giants", "Fire Giant", "Hellhound", "Greater Demon", "Black Dragon", "Brutal Black Dragon",
         "Aberrant Spectre", "Bloodveld", "Gargoyle", "Kurask", "Skeletal Wyvern", "Wyrm", "Lizardman Shaman",
         "Demonic Gorilla", "Tormented Demon", "Basilisk Knight", "Fragment of Seren", "Galvek", "Glough"}


def kc_for(boss: str, kc: dict) -> int | None:
    if boss in KC_SUM:
        return sum(kc.get(n, 0) for n in KC_SUM[boss])
    name = KC_ALIAS.get(boss, boss)
    if name in kc:
        return kc[name]
    return 0 if boss not in NO_KC else None


def order(required: list[dict], tasks: list[dict], done_ids: set[int], *, kc: dict, gated: set[str],
          cfg: dict, solver_cfg: dict) -> dict:
    o = cfg
    by_boss = {}
    for t in required:
        b = by_boss.setdefault(t["boss"], {"boss": t["boss"], "tasks": [], "pts": 0})
        b["tasks"].append(t)
        b["pts"] += t["pts"]
    rows = []
    for b in by_boss.values():
        k = kc_for(b["boss"], kc)
        fam = 1 + o["kc_weight"] * math.log10(1 + (k or 0))
        why = []
        access = 1.0
        if b["boss"] in gated:
            access, why = 0.0, ["level-gated"]
        if b["boss"] in o["avoid_bosses"]:
            access *= o["avoid_factor"]
            why.append("avoid list")
        if b["boss"] in o["team_bosses"]:
            access *= o["team_factor"]
            why.append("team content")
        if k is None:
            why.append("no KC tracked")
        elif k == 0:
            why.append("never killed")
        elif k >= o["grind_kc"]:
            why.append("grind, familiar")
        rows.append({**b, "kc": k, "familiarity": fam, "access": access,
                     "score": b["pts"] * fam * access, "why": ", ".join(why) or "fresh target",
                     "min_pct": min((t["comp_pct"] or 0) for t in b["tasks"])})
    rows.sort(key=lambda r: (-r["score"], -r["pts"]))
    log("ordering", f"{len(rows)} bosses ranked; top: " + ", ".join(f"{r['boss']} {r['score']:.0f}" for r in rows[:5]))

    # Price the avoid list: solver with those bosses' tasks force-excluded.
    avoid_tasks = [t["task"] for t in tasks if t["boss"] in o["avoid_bosses"] and t["id"] not in done_ids]
    alt = solve(tasks, done_ids, target_total=solver_cfg["target_points"],
                forced_include=solver_cfg["forced_include"],
                forced_exclude=solver_cfg["forced_exclude"] + avoid_tasks) if avoid_tasks else None
    base_excl_pts = sum(t["pts"] for t in required if t["boss"] in o["avoid_bosses"])
    return {"rows": rows, "avoid_alt": alt, "avoid_pts_in_set": base_excl_pts, "avoid_bosses": o["avoid_bosses"]}
