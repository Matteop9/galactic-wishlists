"""Task log -> measured rates. One entry per completed task, written by the dashboard (serve.py) or by hand.

data/task_log.json: [{"date","master","task","amount","minutes","xp","gp","note"}, ...]
Measured rate per task = total xp / total hours, total gp / total hours, mean minutes. Measured beats wiki beats assumed.
"""
import json
import re
import statistics

from fetch.common import DATA, log

LOG = DATA / "task_log.json"


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", s.lower()).strip()


def load_log() -> list[dict]:
    if not LOG.exists():
        return []
    try:
        return json.loads(LOG.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        log("tasklog", f"task_log.json unreadable: {e}")
        return []


def apply_task_log(rates: dict, entries: list[dict], min_entries: int = 1) -> dict:
    """Overwrite rates in place for tasks with >= min_entries logged. Returns summary by task."""
    by_task = {}
    for e in entries:
        try:
            k = _norm(e["task"])
            by_task.setdefault(k, []).append({"minutes": float(e["minutes"]), "xp": float(e.get("xp") or 0),
                                              "gp": float(e.get("gp") or 0)})
        except (KeyError, ValueError, TypeError) as ex:
            log("tasklog", f"skipped entry {e!r}: {ex}")
    summary = {}
    for k, es in by_task.items():
        hours = sum(x["minutes"] for x in es) / 60
        if hours <= 0 or len(es) < min_entries:
            continue
        measured = {"xp_hr": round(sum(x["xp"] for x in es) / hours), "gp_hr": round(sum(x["gp"] for x in es) / hours),
                    "min_per_task": round(statistics.mean(x["minutes"] for x in es), 1), "n_logged": len(es)}
        r = rates["rates"].setdefault(k, dict(rates["_default"]))
        for f in ("xp_hr", "gp_hr"):
            if f"{f}_wiki" not in r and r.get(f"{f[:2]}_src", "").startswith("wiki"):
                r[f"{f}_wiki"] = r[f]
        r.update(measured)
        r["source"] = "measured"
        r["xp_src"] = r["gp_src"] = r["min_src"] = f"measured ({len(es)} tasks logged)"
        summary[k] = measured
    if entries:
        log("tasklog", f"{len(entries)} entries, {len(summary)} tasks now measured: {sorted(summary)}")
    return summary
