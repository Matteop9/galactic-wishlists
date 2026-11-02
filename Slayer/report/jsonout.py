"""report.json for the dashboard: everything the page needs, nothing it cannot serialise."""
import json

from ca.buckets import ORDER, bucket_of
from fetch.ca_table import TIERS
from fetch.common import ROOT, log


def _row(r: dict) -> dict:
    keep = ("monster", "weight", "amount", "extended", "eligible", "why", "is_boss", "bosses", "ca", "xp", "gp",
            "minutes", "xp_src", "gp_src", "rate_src", "blocked", "unlock", "p", "score", "scores", "verdict", "slayer_req")
    return {k: r.get(k) for k in keep}


def _master(m: dict) -> dict:
    return {"master": m["master"], "objective": m["objective"], "ev_before": m["ev_before"], "ev_after": m["ev_after"],
            "ev_unblocked": m["ev_unblocked"], "recommended_blocks": m["recommended_blocks"],
            "blocks_by_objective": m["blocks_by_objective"], "free_slots": m["free_slots"], "block_cost": m["block_cost"],
            "pts_per_task": m["pts_per_task"], "unblock": m["unblock"], "pool_ev": m["pool_ev"], "pool_open": m["pool_open"],
            "rows": [_row(r) for r in m["rows"]]}


def write_json(ctx: dict, masters_by_obj: dict, measured: dict) -> None:
    s, cfg = ctx["solver"], ctx["config"]
    tiers = {}
    for t in ctx["tasks"]:
        d = tiers.setdefault(t["tier"], {"done": 0, "total": 0, "pts": TIERS[t["tier"]]})
        d["total"] += 1
        if t["id"] in ctx["done_ids"]:
            d["done"] += 1
    out = {
        "date": ctx["date"], "player": cfg["player"], "wikisync_timestamp": ctx["wikisync"]["timestamp"],
        "slayer_level": ctx["wikisync"]["levels"].get("Slayer"),
        "summary": {"done": len(ctx["done_ids"]), "total": len(ctx["tasks"]), "earned": s["earned"],
                    "target": cfg["target_points"], "needed": s["target"], "required_n": s["n"],
                    "required_pts": s["total"], "cutoff_pct": s["cutoff_pct"], "tiers": tiers},
        "diff": None if ctx["diff"] is None else {"prev_date": ctx["diff"]["prev_date"], "gained_pts": ctx["diff"]["gained_pts"],
                                                   "gained": [{"boss": t["boss"], "task": t["task"], "tier": t["tier"], "pts": t["pts"]}
                                                              for t in ctx["diff"]["gained"]]},
        "flags": ctx["flags"], "missing": ctx["missing"], "questions": ctx["questions"],
        "kc": ctx["hiscores"]["kc"],
        "ordering": [{"rank": i + 1, "boss": r["boss"], "pts": r["pts"], "n": len(r["tasks"]), "kc": r["kc"],
                      "score": round(r["score"], 1), "why": r["why"], "min_pct": r["min_pct"], "bucket": bucket_of(r["boss"]),
                      "tasks": [{"task": t["task"], "tier": t["tier"], "pts": t["pts"], "comp_pct": t["comp_pct"], "type": t.get("type")}
                                for t in sorted(r["tasks"], key=lambda t: -(t["comp_pct"] or 0))]}
                     for i, r in enumerate(ctx["ordering"]["rows"])],
        "avoid": {"bosses": ctx["ordering"]["avoid_bosses"], "pts_in_set": ctx["ordering"]["avoid_pts_in_set"],
                  "alt_cutoff": ctx["ordering"]["avoid_alt"]["cutoff_pct"] if ctx["ordering"]["avoid_alt"] else None},
        "buckets": ORDER,
        "objectives": {k: v for k, v in cfg["slayer"]["objectives"].items() if not k.startswith("_")},
        "default_objective": cfg["slayer"]["default_objective"],
        "slayer_config": {k: cfg["slayer"][k] for k in ("current_master", "blocks", "block_slots", "skip_cost",
                                                        "do_score_min", "block_score_max", "block_quantile",
                                                        "turael_task_minutes", "unlocks_owned", "unlocks_assumed")},
        "costs": ctx["costs"],
        "masters": {obj: [_master(m) for m in ms] for obj, ms in masters_by_obj.items()},
        "measured": measured,
        "turael": ctx["turael"],
    }
    p = ROOT / "report.json"
    p.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    log("report", f"wrote report.json ({p.stat().st_size:,} bytes)")
