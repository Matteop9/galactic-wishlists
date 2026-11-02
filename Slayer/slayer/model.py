"""Per-master slayer model: roll probability, open CA points, DO/SKIP/BLOCK verdicts, block EV."""
import re

from fetch.common import log

# CA-table boss name -> extra names to look for in a master's monster/alternatives text.
ALIASES = {
    "Dagannoth Prime": ["dagannoth kings"], "Dagannoth Rex": ["dagannoth kings"], "Dagannoth Supreme": ["dagannoth kings"],
    "Royal Titans": ["branda the fire queen", "eldric the ice king", "royal titans"],
    "TzHaar-Ket-Rak's Challenges": ["tzhaar"], "TzTok-Jad": ["tzhaar"], "TzKal-Zuk": ["tzhaar"],
    "Leviathan": ["the leviathan"], "Whisperer": ["the whisperer"],
    "Giants": ["hill giants", "moss giants", "fire giants"],
    "Wyrm": ["wyrms"],
}
# Krystilia's table has no alternatives column; this is the wiki's Wilderness task -> boss mapping. ASSUMED.
KRYSTILIA_ALTS = {
    "Bears": ["Callisto"], "Scorpions": ["Scorpia"], "Skeletons": ["Vet'ion"], "Spiders": ["Venenatis"],
    "Black dragons": ["King Black Dragon"], "Hellhounds": [], "Greater demons": [], "Fire giants": [],
    "Wilderness bosses / demi-bosses": ["Callisto", "Scorpia", "Vet'ion", "Venenatis", "Chaos Elemental",
                                        "Chaos Fanatic", "Crazy Archaeologist", "King Black Dragon"],
    "Hill Giants": [], "Moss giants": [], "Ice giants": [],
}
BOSS_ROWS = {"boss", "bosses", "wilderness bosses / demi-bosses"}
# Boss-table bosses that are NOT in the wiki pool but a CA boss name maps onto a pool name.
POOL_ALIASES = {"Barrows brothers": "Barrows", "Crazy archaeologist": "Crazy Archaeologist",
                "The Leviathan": "Leviathan", "The Whisperer": "Whisperer",
                "Dagannoth Kings": ["Dagannoth Prime", "Dagannoth Rex", "Dagannoth Supreme"]}


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", s.lower().replace("’", "'")).strip()


def bosses_on_assignment(master: str, a: dict, ca_bosses: set[str]) -> list[str]:
    """CA bosses that count while on this assignment."""
    if master == "Krystilia":
        return KRYSTILIA_ALTS.get(a["monster"], [])
    text = _norm(a["monster"] + " | " + " | ".join(a["alts"]))
    hits = []
    for boss in ca_bosses:
        names = [_norm(boss)] + ALIASES.get(boss, [])
        if boss in ("N/A",):
            continue
        if any(n and n in text for n in names):
            hits.append(boss)
    return sorted(hits)


def pool_bosses(boss_slayer: dict, ca_bosses: set[str], slayer_level: int) -> list[str]:
    out = []
    for p in boss_slayer["pool"]:
        if p["slayer_req"] and p["slayer_req"] > slayer_level:
            continue
        name = POOL_ALIASES.get(p["boss"], p["boss"])
        for n in (name if isinstance(name, list) else [name]):
            if n in ca_bosses:
                out.append(n)
            else:
                log("slayer", f"pool boss {p['boss']!r} has no CA boss row, ignored")
    return out


def model_master(master: str, table: dict, *, required: list[dict], ca_bosses: set[str], slayer_level: int,
                 blocks: list[str], unlocks: list[str], pool: list[str], cfg: dict, costs: dict) -> dict:
    open_by_boss = {}
    for t in required:
        open_by_boss[t["boss"]] = open_by_boss.get(t["boss"], 0) + t["pts"]
    pool_open = [open_by_boss.get(b, 0) for b in pool]
    pool_ev = sum(pool_open) / len(pool) if pool else 0

    rows = []
    for a in table["assignments"]:
        if a["slayer_req"] and a["slayer_req"] > slayer_level:
            rows.append({**a, "eligible": False, "why": f"needs Slayer {a['slayer_req']}"})
            continue
        unlock = re.search(r"Unlocked the (.+?) ability", a["req_text"])
        if unlock and unlock.group(1).lower() not in {u.lower() for u in unlocks}:
            rows.append({**a, "eligible": False, "why": f"needs unlock {unlock.group(1)!r}"})
            continue
        is_boss = a["monster"].lower() in BOSS_ROWS
        bosses = pool if is_boss else bosses_on_assignment(master, a, ca_bosses)
        open_pts = pool_ev if is_boss else sum(open_by_boss.get(b, 0) for b in bosses)
        rows.append({**a, "eligible": True, "is_boss": is_boss, "bosses": bosses,
                     "open_pts": round(open_pts, 2),
                     "blocked": a["monster"].lower() in {b.lower() for b in blocks},
                     "unlock": unlock.group(1) if unlock else None})
    known = {r["monster"].lower() for r in rows}
    for b in blocks:
        if b.lower() not in known:
            log("slayer", f"{master}: block {b!r} matches no assignment name, check spelling")

    elig = [r for r in rows if r["eligible"]]
    active = [r for r in elig if not r["blocked"]]
    total = sum(r["weight"] for r in active)
    min_p = cfg["block_weight_min_pct"] / 100
    for r in rows:
        if not r["eligible"]:
            r["verdict"] = "N/A"
            continue
        r["p"] = r["weight"] / total if total and not r["blocked"] else 0.0
        if r["blocked"]:
            r["verdict"] = "UNBLOCK?" if r["open_pts"] > 0 else "BLOCKED"
        elif r["open_pts"] > 0:
            r["verdict"] = "DO"
        elif r["p"] >= min_p:
            r["verdict"] = "BLOCK"
        else:
            r["verdict"] = "SKIP"

    ev_before = sum(r["p"] * r["open_pts"] for r in active)
    free_slots = max(0, cfg["block_slots"] - len(blocks))
    cands = sorted((r for r in active if r["verdict"] == "BLOCK"), key=lambda r: -r["weight"])[:free_slots]
    rec = [r["monster"] for r in cands]
    total_after = total - sum(r["weight"] for r in cands)
    ev_after = sum((r["weight"] / total_after) * r["open_pts"] for r in active if r["monster"] not in rec) if total_after else 0
    # EV if the blocked-but-valuable tasks were freed (blocks are free to cancel, re-blocking costs again)
    unblock = [r for r in elig if r["verdict"] == "UNBLOCK?"]
    total_unb = total + sum(r["weight"] for r in unblock)
    ev_unblocked = sum((r["weight"] / total_unb) * r["open_pts"] for r in active + unblock) if total_unb else 0
    block_cost = costs.get(master, {}).get("block_cost")
    pts_per_task = costs.get(master, {}).get("points")
    log("slayer", f"{master}: {len(elig)} eligible, {len(active)} active, EV {ev_before:.2f} -> {ev_after:.2f} CA pts/roll "
                  f"with blocks {rec}")
    return {
        "master": master, "rows": rows, "total_weight": total, "ev_before": ev_before, "ev_after": ev_after,
        "recommended_blocks": rec, "free_slots": free_slots, "block_cost": block_cost, "pts_per_task": pts_per_task,
        "rec_block_points": (block_cost or 0) * len(rec),
        "rolls_to_fund_blocks": ((block_cost or 0) * len(rec) / pts_per_task) if pts_per_task else None,
        "pool": pool, "pool_ev": pool_ev, "pool_open": dict(zip(pool, pool_open)),
        "unblock": [r["monster"] for r in unblock], "ev_unblocked": ev_unblocked,
    }


def turael_boost(*, p_target: float, pts_per_task: int, skip_cost: int, turael_minutes: float, streak: int,
                 milestones=((10, 5), (50, 15), (100, 25), (250, 35), (1000, 50))) -> dict:
    """Fish for a task via Turael (streak reset) vs skipping at the main master.

    Skipping: each roll costs skip_cost points, keeps streak; expected rolls 1/p.
    Turael: each Turael task costs ~turael_minutes and 0 points; the streak reset forfeits the next
    milestone bonus (multiplier x pts_per_task) that the current streak was building towards. ASSUMED
    milestone multipliers, override via config if the wiki disagrees.
    """
    if p_target <= 0:
        return {"error": "target task has zero probability at this master"}
    rolls = 1 / p_target
    skip_pts = skip_cost * (rolls - 1)
    nxt = next(((m, mult) for m, mult in milestones if m > streak % 1000 or m == 1000), (1000, 50))
    streak_loss = nxt[1] * pts_per_task
    turael_minutes_total = turael_minutes * (rolls - 1)
    rec = "SKIP" if skip_pts <= streak_loss else "TURAEL"
    return {"expected_rolls": rolls, "skip_points": skip_pts, "turael_minutes": turael_minutes_total,
            "streak_loss_points": streak_loss, "next_milestone": nxt[0], "recommendation": rec}
