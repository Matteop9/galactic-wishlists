"""id -> task record, plus a reconciliation against the shipped baseline."""
import json

from fetch.common import DATA, log


def build_idmap(rows: list[dict]) -> dict[int, dict]:
    return {r["id"]: r for r in rows}


def reconcile_with_baseline(rows: list[dict], baseline_path) -> dict:
    base = json.loads(baseline_path.read_text(encoding="utf-8"))
    live = {r["task"]: r for r in rows}
    base_names = {b["task"] for b in base}
    missing = [b["task"] for b in base if b["task"] not in live]
    extra = [r["task"] for r in rows if r["task"] not in base_names]
    tier_diff = [(b["task"], b["tier"], live[b["task"]]["tier"]) for b in base
                 if b["task"] in live and b["tier"] != live[b["task"]]["tier"]]
    drift = [(b["task"], b["comp_pct"], live[b["task"]]["comp_pct"]) for b in base
             if b["task"] in live and live[b["task"]]["comp_pct"] is not None
             and abs(b["comp_pct"] - live[b["task"]]["comp_pct"]) >= 1.0]
    log("idmap", f"baseline {len(base)} vs live {len(rows)}: {len(missing)} missing, {len(extra)} new, "
                 f"{len(tier_diff)} tier changes, {len(drift)} comp% moves >=1pt")
    for x in missing[:10]:
        log("idmap", f"  baseline task not in live table: {x!r}")
    for x in extra[:10]:
        log("idmap", f"  live task not in baseline: {x!r}")
    for t, a, b in tier_diff[:10]:
        log("idmap", f"  tier change {t!r}: {a} -> {b}")
    return {"missing": missing, "extra": extra, "tier_diff": tier_diff, "drift": drift}


def save_tasks(rows: list[dict], date: str) -> None:
    p = DATA / f"ca_tasks_{date}.json"
    p.write_text(json.dumps(rows, indent=1, ensure_ascii=False), encoding="utf-8")
    log("idmap", f"saved {p.name}")
