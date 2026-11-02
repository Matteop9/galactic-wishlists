"""Combat Achievements/All_tasks -> one row per task with the wiki's task ID."""
import re

from .common import WIKI, fetch, log, strip

TIERS = {"Easy": 1, "Medium": 2, "Hard": 3, "Elite": 4, "Master": 5, "Grandmaster": 6}
ANCHORS = {51: "Cerberus Veteran", 268: "Vorkath Veteran", 183: "Nightmare Adept"}
ROW = re.compile(r'<tr data-ca-task-id="(\d+)"[^>]*>(.*?)</tr>', re.S)


def get_ca_tasks(**kw) -> list[dict]:
    h = fetch(WIKI + "Combat_Achievements/All_tasks", "ca_all_tasks.html", **kw)
    rows = []
    for tid, body in ROW.findall(h):
        tds = re.findall(r"<td[^>]*>(.*?)</td>", body, re.S)
        if len(tds) < 6:
            log("ca_table", f"id {tid}: only {len(tds)} cells, skipped")
            continue
        boss, task, desc, ttype, tier_cell, comp = (strip(c) for c in tds[:6])
        tier = next((t for t in TIERS if t in tier_cell), None)
        if tier is None:
            log("ca_table", f"id {tid} {task!r}: no tier in {tier_cell!r}")
            continue
        m = re.search(r"\((\d+)", tier_cell)
        pts = int(m.group(1)) if m else TIERS[tier]
        if pts != TIERS[tier]:
            log("ca_table", f"id {tid} {task!r}: pts {pts} disagrees with tier {tier}")
        try:
            comp_pct = float(comp.rstrip("%"))
        except ValueError:
            comp_pct = None
            log("ca_table", f"id {tid} {task!r}: comp% unreadable {comp!r}")
        rows.append({"id": int(tid), "boss": boss, "task": task, "desc": desc, "type": ttype,
                     "tier": tier, "pts": pts, "comp_pct": comp_pct})
    log("ca_table", f"{len(rows)} tasks parsed")
    by_id = {r["id"]: r["task"] for r in rows}
    bad = {i: (n, by_id.get(i)) for i, n in ANCHORS.items() if by_id.get(i) != n}
    if bad:
        raise SystemExit(f"[ca_table] ID anchors failed: {bad}")
    log("ca_table", f"anchors ok {ANCHORS}")
    return rows
