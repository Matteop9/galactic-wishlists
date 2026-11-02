"""Per-master slayer model: roll probability, open CA points, XP/GP baselines, verdicts per objective, block EV."""
import json
import re

from fetch.common import DATA, log

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
POOL_ALIASES = {"Barrows brothers": "Barrows", "Crazy archaeologist": "Crazy Archaeologist",
                "The Leviathan": "Leviathan", "The Whisperer": "Whisperer",
                "Dagannoth Kings": ["Dagannoth Prime", "Dagannoth Rex", "Dagannoth Supreme"]}
DIMS = ("ca", "xp", "gp")


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", s.lower().replace("’", "'")).strip()


def load_rates() -> dict:
    d = json.loads((DATA / "task_rates.json").read_text(encoding="utf-8"))
    n = {k: sum(1 for r in d['rates'].values() if r.get('source') == k) for k in ('measured', 'wiki', 'assumed')}
    log("rates", f"{len(d['rates'])} assignment baselines loaded: {n['measured']} measured, {n['wiki']} wiki, {n['assumed']} assumed")
    return d


def rate_for(rates: dict, monster: str) -> dict:
    r = rates["rates"].get(_norm(monster))
    if r is None:
        return {**rates["_default"], "source": "default"}
    return r


def bosses_on_assignment(master: str, a: dict, ca_bosses: set[str]) -> list[str]:
    if master == "Krystilia":
        return KRYSTILIA_ALTS.get(a["monster"], [])
    text = _norm(a["monster"] + " | " + " | ".join(a["alts"]))
    hits = []
    for boss in ca_bosses:
        if boss == "N/A":
            continue
        names = [_norm(boss)] + ALIASES.get(boss, [])
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


def _score(r: dict, maxes: dict, weights: dict) -> float:
    return sum(weights[d] * (r[d] / maxes[d] if maxes[d] else 0) for d in DIMS)


def _block_cut(scores: list[float], cfg: dict) -> float:
    """BLOCK threshold: the worse of an absolute floor and the master's bottom quantile."""
    if not scores:
        return cfg["block_score_max"]
    srt = sorted(scores)
    q = srt[min(len(srt) - 1, int(len(srt) * cfg["block_quantile"]))]
    return max(cfg["block_score_max"], q)


def _ev(rows: list[dict], total: int) -> dict:
    """Expected value per roll (CA pts) and time-weighted xp/hr, gp/hr over the active roll table."""
    if not rows or not total:
        return {"ca": 0, "xp": 0, "gp": 0}
    t = sum(r["weight"] / total * r["minutes"] for r in rows)
    return {
        "ca": sum(r["weight"] / total * r["ca"] for r in rows),
        "xp": sum(r["weight"] / total * r["minutes"] * r["xp"] for r in rows) / t if t else 0,
        "gp": sum(r["weight"] / total * r["minutes"] * r["gp"] for r in rows) / t if t else 0,
    }


def model_master(master: str, table: dict, *, required: list[dict], ca_bosses: set[str], slayer_level: int,
                 blocks: list[str], unlocks: list[str], pool: list[str], cfg: dict, costs: dict,
                 rates: dict, objective: str) -> dict:
    open_by_boss = {}
    for t in required:
        open_by_boss[t["boss"]] = open_by_boss.get(t["boss"], 0) + t["pts"]
    pool_open = [open_by_boss.get(b, 0) for b in pool]
    pool_ev = sum(pool_open) / len(pool) if pool else 0
    weights = cfg["objectives"][objective]
    blocks_l = {b.lower() for b in blocks}

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
        rt = rate_for(rates, a["monster"])
        rows.append({**a, "eligible": True, "is_boss": is_boss, "bosses": bosses,
                     "ca": round(open_pts, 2), "open_pts": round(open_pts, 2),
                     "xp": rt["xp_hr"], "gp": rt["gp_hr"], "minutes": rt["min_per_task"], "rate_src": rt["source"],
                     "xp_src": rt.get("xp_src", "assumed"), "gp_src": rt.get("gp_src", "assumed"),
                     "blocked": a["monster"].lower() in blocks_l,
                     "unlock": unlock.group(1) if unlock else None})
    known = {r["monster"].lower() for r in rows}
    for b in blocks:
        if b.lower() not in known:
            log("slayer", f"{master}: block {b!r} matches no assignment name, check spelling")

    elig = [r for r in rows if r["eligible"]]
    active = [r for r in elig if not r["blocked"]]
    total = sum(r["weight"] for r in active)
    maxes = {d: max((r[d] for r in elig), default=0) for d in DIMS}
    block_cut = _block_cut([_score(r, maxes, weights) for r in elig], cfg)
    for r in rows:
        if not r["eligible"]:
            r["verdict"] = "N/A"
            continue
        r["p"] = r["weight"] / total if total and not r["blocked"] else 0.0
        r["score"] = _score(r, maxes, weights)
        r["scores"] = {k: _score(r, maxes, w) for k, w in cfg["objectives"].items() if not k.startswith("_")}
        has_ca = weights["ca"] > 0 and r["ca"] > 0   # brief rule: open CA points on the task = DO
        if r["blocked"]:
            r["verdict"] = "UNBLOCK?" if (has_ca or r["score"] >= cfg["do_score_min"]) else "BLOCKED"
        elif has_ca or r["score"] >= cfg["do_score_min"]:
            r["verdict"] = "DO"
        elif r["score"] <= block_cut and r["p"] >= cfg["block_weight_min_pct"] / 100:
            r["verdict"] = "BLOCK"
        else:
            r["verdict"] = "SKIP"

    ev_before = _ev(active, total)
    free_slots = max(0, cfg["block_slots"] - len(blocks))
    cands = sorted((r for r in active if r["verdict"] == "BLOCK"), key=lambda r: -r["weight"])[:free_slots]
    rec = [r["monster"] for r in cands]
    kept = [r for r in active if r["monster"] not in rec]
    ev_after = _ev(kept, sum(r["weight"] for r in kept))
    unblock = [r for r in elig if r["verdict"] == "UNBLOCK?"]
    freed = active + unblock
    ev_unblocked = _ev(freed, sum(r["weight"] for r in freed))

    # What the block list would be under each objective, for the comparison table.
    by_obj = {}
    for k, w in cfg["objectives"].items():
        if k.startswith("_"):
            continue
        sc = {r["monster"]: _score(r, maxes, w) for r in elig}
        cut = _block_cut(list(sc.values()), cfg)
        blk = sorted((r for r in elig if sc[r["monster"]] <= cut
                      and r["weight"] / (total or 1) >= cfg["block_weight_min_pct"] / 100),
                     key=lambda r: -r["weight"])[:cfg["block_slots"]]
        by_obj[k] = [r["monster"] for r in blk]

    block_cost = costs.get(master, {}).get("block_cost")
    pts_per_task = costs.get(master, {}).get("points")
    log("slayer", f"{master} [{objective}]: {len(elig)} eligible, {len(active)} active, "
                  f"EV ca {ev_before['ca']:.2f}->{ev_after['ca']:.2f}, xp/hr {ev_before['xp']:,.0f}->{ev_after['xp']:,.0f}, "
                  f"gp/hr {ev_before['gp']:,.0f}->{ev_after['gp']:,.0f}; blocks {rec}")
    return {
        "master": master, "objective": objective, "rows": rows, "total_weight": total,
        "ev_before": ev_before, "ev_after": ev_after, "ev_unblocked": ev_unblocked,
        "recommended_blocks": rec, "blocks_by_objective": by_obj, "free_slots": free_slots,
        "block_cost": block_cost, "pts_per_task": pts_per_task,
        "rec_block_points": (block_cost or 0) * len(rec),
        "rolls_to_fund_blocks": ((block_cost or 0) * len(rec) / pts_per_task) if pts_per_task else None,
        "pool": pool, "pool_ev": pool_ev, "pool_open": dict(zip(pool, pool_open)),
        "unblock": [r["monster"] for r in unblock],
        "assumed_rates": sum(1 for r in elig if r["xp_src"] == "assumed" or r["gp_src"] == "assumed"),
    }


def turael_boost(*, p_target: float, pts_per_task: int, skip_cost: int, turael_minutes: float, streak: int,
                 milestones=((10, 5), (50, 15), (100, 25), (250, 35), (1000, 50))) -> dict:
    """Fish for a task via Turael (streak reset) vs skipping at the main master. Milestone multipliers ASSUMED."""
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
