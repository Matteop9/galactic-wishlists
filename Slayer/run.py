"""One run: fetch -> diff -> solve -> bucket -> slayer model -> report + dated snapshot.

python run.py [--tasks] [--force] [--turael-target "Smoke devils"] [--turael-master Duradel]
"""
import argparse
import datetime as dt
import json
import sys

from ca.buckets import group
from ca.idmap import reconcile_with_baseline, save_tasks
from ca.ordering import order
from ca.solver import solve
from fetch.ca_table import get_ca_tasks
from fetch.common import DATA, ROOT, log, today
from fetch.hiscores import get_hiscores
from fetch.slayer_tables import get_boss_slayer, get_master_costs, get_master_table
from fetch.wikisync import get_wikisync
from report.build import build
from slayer.model import load_rates, model_master, pool_bosses, turael_boost

sys.stdout.reconfigure(encoding="utf-8")


def load_prev_snapshot(date: str):
    snaps = sorted(p for p in (DATA / "snapshots").glob("*.json") if not p.name.startswith(date))
    if not snaps:
        return None
    p = snaps[-1]
    log("snapshot", f"previous snapshot {p.name}")
    return json.loads(p.read_text(encoding="utf-8"))


def write_snapshot(date: str, payload: dict) -> None:
    folder = DATA / "snapshots"
    folder.mkdir(parents=True, exist_ok=True)
    p = folder / f"{date}.json"
    if p.exists():
        prev = json.loads(p.read_text(encoding="utf-8"))
        if prev.get("ca_ids") == payload["ca_ids"]:
            log("snapshot", f"{p.name} already holds the same id set, not rewritten")
            return
        p = folder / f"{date}_{dt.datetime.now():%H%M%S}.json"
    p.write_text(json.dumps(payload, indent=1), encoding="utf-8")
    log("snapshot", f"wrote {p.name} (prior snapshots never overwritten)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tasks", action="store_true", help="expand task-level listing in buckets")
    ap.add_argument("--force", action="store_true", help="refetch even if cached today")
    ap.add_argument("--turael-target", default=None, help="assignment name; default = highest open CA pts")
    ap.add_argument("--turael-master", default="Duradel")
    ap.add_argument("--streak", type=int, default=0)
    ap.add_argument("--objective", default=None, help="ca | xp | gp | balanced (config slayer.objectives)")
    args = ap.parse_args()

    date = today()
    cfg = json.loads((DATA / "config.json").read_text(encoding="utf-8"))
    flags, missing, questions = [], [], []
    kw = {"force": args.force}

    # 1 inputs
    log("run", f"inputs: player={cfg['player']} target={cfg['target_points']} date={date}")
    ws = get_wikisync(cfg["player"], **kw)
    hs = get_hiscores(cfg["player"], **kw)
    tasks = get_ca_tasks(**kw)
    rec = reconcile_with_baseline(tasks, DATA / "ca_baseline_2026-11-02.json")
    if rec["missing"] or rec["extra"]:
        flags.append(f"Live task table vs shipped baseline: {len(rec['missing'])} names differ "
                     f"({rec['missing'][:3]} -> {rec['extra'][:3]}). Live table is source of truth.")
    save_tasks(tasks, date)
    done_ids = set(ws["ca_ids"])
    unknown_ids = done_ids - {t["id"] for t in tasks}
    if unknown_ids:
        flags.append(f"{len(unknown_ids)} WikiSync ids not in the wiki table: {sorted(unknown_ids)[:10]}")

    # 2 diff
    prev = load_prev_snapshot(date)
    diff = None
    if prev:
        by_id = {t["id"]: t for t in tasks}
        gained = [by_id[i] for i in sorted(done_ids - set(prev["ca_ids"])) if i in by_id]
        lost = sorted(set(prev["ca_ids"]) - done_ids)
        diff = {"prev_date": prev["date"], "gained": gained, "gained_pts": sum(t["pts"] for t in gained), "lost": lost}
        log("diff", f"+{len(gained)} tasks, +{diff['gained_pts']} pts since {prev['date']}; lost {len(lost)}")
    else:
        missing.append("data/ids_2026-10-25.json (25 Oct id list) was never supplied, so the 25 Oct -> 2 Nov "
                       "gain of 52 tasks / 160 pts in the brief cannot be reproduced. Paste it and re-run.")

    # 3 solve
    s = solve(tasks, done_ids, target_total=cfg["target_points"],
              forced_include=cfg["forced_include"], forced_exclude=cfg["forced_exclude"])

    # 4 buckets
    bk = group(s["chosen"], tasks)
    flags.append("Buckets: Royal Titans and Shellbane gryphon moved to Slayer (wiki Boss Slayer page lists "
                 "Eldric/Branda on ice/fire giant tasks and gryphons as a Duradel/Nieve/Konar task). "
                 "Nex is not in the wiki Like a Boss pool, so it sits in Anytime. Brief said otherwise.")

    # 5 slayer
    costs = get_master_costs(**kw)
    bs = get_boss_slayer(**kw)
    sc = cfg["slayer"]
    slayer_level = ws["levels"].get("Slayer") or hs["skills"]["Slayer"]["level"]
    ca_bosses = {t["boss"] for t in tasks}
    pool = pool_bosses(bs, ca_bosses, slayer_level)
    if "Mortimer" in costs:
        flags.append(f"Mortimer (new master, 29 Jul 2026 per wiki) exists with block cost {costs['Mortimer']['block_cost']} "
                     f"and modifier-based points; not modelled, brief predates him. Add to masters if relevant.")
    if sc["like_a_boss_unlocked"] is None:
        missing.append("config slayer.like_a_boss_unlocked is null: boss tasks modelled as unlocked.")
    if sc["current_master"] is None:
        missing.append("config slayer.current_master is null: all four masters reported, none preferred.")
    rates = load_rates()
    if not any(r.get("source") == "measured" for r in rates["rates"].values()):
        n_wiki = sum(1 for x in rates["rates"].values() if x.get("source") == "wiki")
        missing.append(f"data/task_rates.json: no measured baselines yet; {n_wiki} entries use wiki xp/gp figures, "
                       f"{len(rates['rates']) - n_wiki} are estimates, minutes per task are all estimates. "
                       "Overwrite any entry and set source to measured.")
    if not any(sc["blocks"].values()):
        missing.append("config slayer.blocks all empty: verdicts assume no current blocks.")
    objective = args.objective or sc["default_objective"]
    if objective not in sc["objectives"]:
        raise SystemExit(f"unknown objective {objective!r}; choose from {list(sc['objectives'])}")
    log("run", f"objective {objective} weights {sc['objectives'][objective]}")
    masters = []
    for m in sc["masters"]:
        table = get_master_table(m, **kw)
        masters.append(model_master(m, table, required=s["chosen"], ca_bosses=ca_bosses, slayer_level=slayer_level,
                                    blocks=sc["blocks"].get(m, []),
                                    unlocks=sc.get("unlocks_owned", []) + sc["unlocks_assumed"], pool=pool,
                                    cfg=sc, costs=costs, rates=rates, objective=objective))
    # Slayer-bucket bosses whose only on-task route is level-gated right now
    slayer_bosses = bk["groups"]["Slayer"]
    reachable = {b for m in masters for r in m["rows"] if r.get("eligible") for b in r.get("bosses", [])}
    gated = {b: v["pts"] for b, v in slayer_bosses.items() if b not in reachable}
    if gated:
        flags.append(f"Slayer-bucket bosses with NO eligible task at Slayer {slayer_level} (level or unlock gate): "
                     + ", ".join(f"{b} {p} pts" for b, p in sorted(gated.items(), key=lambda x: -x[1]))
                     + f" = {sum(gated.values())} of {sum(v['pts'] for v in slayer_bosses.values())} Slayer-bucket pts.")

    # ordering view (Matteo-weighted)
    ordering = order(s["chosen"], tasks, done_ids, kc=hs["kc"], gated=set(gated), cfg=cfg["ordering"], solver_cfg=cfg)

    # turael example
    tm = next((m for m in masters if m["master"] == args.turael_master), masters[0])
    row = None
    if args.turael_target:
        row = next((r for r in tm["rows"] if r.get("eligible") and r["monster"].lower() == args.turael_target.lower()), None)
        if row is None:
            flags.append(f"Turael target {args.turael_target!r} not eligible at {tm['master']}, used highest-value task instead.")
    if row is None or row.get("p", 0) == 0:
        row = max((r for r in tm["rows"] if r.get("eligible") and not r["blocked"]), key=lambda r: r.get("open_pts", 0))
    tb = turael_boost(p_target=row["p"], pts_per_task=tm["pts_per_task"] or 0, skip_cost=sc["skip_cost"],
                      turael_minutes=sc["turael_task_minutes"], streak=args.streak)
    tb.update({"target": row["monster"], "master": tm["master"], "p": row["p"], "streak": args.streak,
               "turael_minutes_each": sc["turael_task_minutes"]})

    questions += [
        "Answered 2 Nov: LaB unlocked, Duradel, Wings Spread owned, 7 Duradel blocks, no forced excludes.",
        "Still open: blocks at Nieve/Konar/Krystilia (modelled as none); unlocks in config unlocks_assumed "
        "(Reptile Got Ripped, Basilocked, Hot Stuff, wildy ones) are assumed owned; Mortimer unmodelled.",
    ]

    ctx = {"date": date, "config": cfg, "wikisync": ws, "hiscores": hs, "tasks": tasks, "done_ids": done_ids,
           "solver": s, "diff": diff, "buckets": bk, "slayer": masters, "costs": costs, "turael": tb,
           "ordering": ordering,
           "flags": flags, "missing": missing, "questions": questions}
    md = build(ctx, show_tasks=args.tasks)
    (ROOT / "report.md").write_text(md, encoding="utf-8")
    log("report", f"wrote report.md ({len(md):,} chars)")

    write_snapshot(date, {"date": date, "wikisync_timestamp": ws["timestamp"], "ca_ids": sorted(done_ids),
                          "earned": s["earned"], "required_n": s["n"], "required_pts": s["total"],
                          "cutoff_pct": s["cutoff_pct"], "slayer_level": slayer_level, "kc": hs["kc"]})


if __name__ == "__main__":
    main()
