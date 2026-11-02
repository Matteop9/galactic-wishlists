"""report.md writer. Every number carries a provenance tag: [read] fetched, [derived] computed, [assumed] config."""
from ca.buckets import ORDER
from fetch.ca_table import TIERS

R, D, A = "[read]", "[derived]", "[assumed]"


def _pct(x):
    return "-" if x is None else f"{x:.1f}%"


def build(ctx: dict, *, show_tasks: bool = False) -> str:
    L = []
    w = L.append
    s, cfg, ws, hs = ctx["solver"], ctx["config"], ctx["wikisync"], ctx["hiscores"]
    w(f"# Hahap CA + Slayer tracker, {ctx['date']}\n")
    w(f"Provenance: `{R}` fetched this run, `{D}` computed, `{A}` config/default. Never a guess as a fact.\n")
    w(f"Objective order: CA points first, XP/hr tiebreak, GP ignored unless asked. {A}\n")
    w(f"Caveat: comp% is population difficulty, not Matteo's. He is a CG/DT2 main (top-700 CG) and has "
      f"never done CoX; weight accordingly when ordering. {A}\n")
    if ctx["flags"]:
        w("## Judgement calls and flags\n")
        for f in ctx["flags"]:
            w(f"- {f}")
        w("")
    if ctx["missing"]:
        w("## Missing inputs\n")
        for m in ctx["missing"]:
            w(f"- {m}")
        w("")

    w("## 1. Baseline\n")
    w(f"WikiSync snapshot {ws['timestamp']} {R}. Slayer {ws['levels'].get('Slayer')} {R}.\n")
    w("| Tier | Done / total | Pts each | Pts earned |\n|---|---|---|---|")
    tot = {}
    for t in ctx["tasks"]:
        d = tot.setdefault(t["tier"], [0, 0])
        d[1] += 1
        if t["id"] in ctx["done_ids"]:
            d[0] += 1
    for tier, pts in TIERS.items():
        a, b = tot.get(tier, (0, 0))
        w(f"| {tier} | {a}/{b} | {pts} | {a * pts} |")
    w(f"| **Total** | **{len(ctx['done_ids'])}/{len(ctx['tasks'])}** | | **{s['earned']}** {D} |\n")
    w(f"Thresholds: Hard 436, Elite 1,100, Master 1,965, GM 2,697. Target {cfg['target_points']} {A}, "
      f"still needed {s['target']} {D}.\n")
    diff = ctx["diff"]
    if diff is None:
        w("Previous snapshot: none found in data/snapshots, so no diff this run. This run's snapshot is the seed.\n")
    else:
        w(f"Since {diff['prev_date']} {R}: +{len(diff['gained'])} tasks, +{diff['gained_pts']} pts {D}"
          + (f", {len(diff['lost'])} ids vanished (check)" if diff['lost'] else "") + ".\n")
        for t in diff["gained"][:60]:
            w(f"- {t['boss']}: {t['task']} ({t['tier']}, {t['pts']} pts)")
        w("")
    kc = hs["kc"]
    notable = ["The Corrupted Gauntlet", "The Leviathan", "Duke Sucellus", "Kraken", "Vardorvis", "The Whisperer",
               "Vorkath", "Tombs of Amascut", "Chambers of Xeric", "Theatre of Blood", "Nex", "Cerberus", "Zulrah"]
    w("Boss KC " + R + ": " + ", ".join(f"{n} {kc.get(n, 0):,}" for n in notable) + "\n")

    w("## 2. Required set (Master tier)\n")
    w(f"Forced includes found: {len(s['forced_found'])} {A}; forced excludes: {s['excluded'] or 'none'} {A}.\n")
    w(f"Cutoff **{_pct(s['cutoff_pct'])}** comp%, **{s['n']} tasks, {s['total']} pts** {D} "
      f"(needs {s['target']}).\n")
    w("Last tasks inside the line:")
    for t in s["last_in"]:
        w(f"- {_pct(t['comp_pct'])} {t['boss']}: {t['task']} ({t['tier']}, {t['pts']})")
    w("\nFirst tasks outside the line:")
    for t in s["first_out"]:
        w(f"- {_pct(t['comp_pct'])} {t['boss']}: {t['task']} ({t['tier']}, {t['pts']})")
    alt = s["next_alternative"]
    if alt:
        w(f"\n1-point-better alternative: swap the cutoff task for {alt['boss']}: {alt['task']} "
          f"({alt['tier']}, {alt['pts']} pts, {_pct(alt['comp_pct'])}).\n")

    w("## 3. Route buckets\n")
    g = ctx["buckets"]["groups"]
    for bk in ORDER:
        bosses = g[bk]
        n = sum(len(v["tasks"]) for v in bosses.values())
        pts = sum(v["pts"] for v in bosses.values())
        w(f"### {bk}: {len(bosses)} bosses, {n} tasks, {pts} pts {D}\n")
        if not bosses:
            w("(nothing required here)\n")
            continue
        w("| Boss | Tasks | Pts | Lowest comp% |\n|---|---|---|---|")
        for boss, v in sorted(bosses.items(), key=lambda kv: -kv[1]["pts"]):
            w(f"| {boss} | {len(v['tasks'])} | {v['pts']} | {_pct(v['min_pct'])} |")
            if show_tasks:
                for t in sorted(v["tasks"], key=lambda t: -(t["comp_pct"] or 0)):
                    w(f"| ↳ {t['task']} | {t['tier']} | {t['pts']} | {_pct(t['comp_pct'])} |")
        w("")

    w("## 4. Slayer do/skip/block\n")
    sc = cfg["slayer"]
    w(f"Like a Boss unlocked: {sc['like_a_boss_unlocked'] if sc['like_a_boss_unlocked'] is not None else 'UNKNOWN, assumed yes'} {A}. "
      f"Current master: {sc['current_master'] or 'not set'} {A}. Unlocks owned {sc.get('unlocks_owned', [])}, "
      f"assumed {sc['unlocks_assumed']} {A}. "
      f"Current blocks: {sc['blocks']} {A}. Block slots {sc['block_slots']} {A}. "
      f"Skip {sc['skip_cost']} pts {A}. Verdict BLOCK needs roll chance >= {sc['block_weight_min_pct']}% {A}.\n")
    w(f"Master costs {R}: " + ", ".join(f"{k} {v['points']} pts/task, block {v['block_cost']}"
                                        for k, v in ctx["costs"].items()) + "\n")
    for m in ctx["slayer"]:
        w(f"### {m['master']}: EV {m['ev_before']:.2f} -> {m['ev_after']:.2f} CA pts per roll {D}\n")
        w(f"Recommended blocks ({m['free_slots']} free slots): {m['recommended_blocks'] or 'none'}; "
          f"cost {m['rec_block_points']} slayer pts {D}"
          + (f", funded by {m['rolls_to_fund_blocks']:.0f} tasks at {m['pts_per_task']} pts" if m['rolls_to_fund_blocks'] else "")
          + ".\n")
        if m["unblock"]:
            w(f"Blocked tasks with open CA points: {m['unblock']}. Freeing them lifts EV to "
              f"{m['ev_unblocked']:.2f} pts/roll {D} (cancelling a block is free, re-blocking costs again).\n")
        if m["pool"]:
            w(f"Boss-task pool {len(m['pool'])} bosses, mean open {m['pool_ev']:.1f} pts {D} (uniform pick {A}): "
              + ", ".join(f"{b} {p}" for b, p in sorted(m["pool_open"].items(), key=lambda x: -x[1]) if p) + "\n")
        w("| Task | Weight | Roll % | Open CA pts | Counts | Verdict |\n|---|---|---|---|---|---|")
        for r in sorted(m["rows"], key=lambda r: (r["verdict"] == "N/A", -r.get("open_pts", 0), -r["weight"])):
            if r["verdict"] == "N/A":
                w(f"| {r['monster']} | {r['weight']} | - | - | {r['why']} | N/A |")
                continue
            counts = "boss pool" if r["is_boss"] else ", ".join(r["bosses"]) or "-"
            w(f"| {r['monster']} | {r['weight']} | {r['p'] * 100:.1f} | {r['open_pts']:g} | {counts} | **{r['verdict']}** |")
        w("")

    w("## 5. Turael boost example\n")
    tb = ctx["turael"]
    if "error" in tb:
        w(f"Not computed: {tb['error']} ({tb['target']} at {tb['master']}).\n")
        tb = None
    if tb:
        w(f"Target {tb['target']} at {tb['master']} (roll {tb['p'] * 100:.1f}%): expected rolls {tb['expected_rolls']:.1f}, "
      f"skip cost {tb['skip_points']:.0f} pts vs Turael {tb['turael_minutes']:.0f} min and a streak reset worth "
      f"~{tb['streak_loss_points']} pts (next milestone {tb['next_milestone']}). Recommendation **{tb['recommendation']}** {D}. "
      f"Streak {tb['streak']} and Turael {tb['turael_minutes_each']} min/task are {A}.\n")

    w("## 6. Open questions for Matteo\n")
    for q in ctx["questions"]:
        w(f"- {q}")
    w("")
    return "\n".join(L)
