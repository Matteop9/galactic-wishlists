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

    od, oc = ctx["ordering"], cfg["ordering"]
    w("## 2b. Ordering for Matteo\n")
    w(f"Score = open pts x (1 + {oc['kc_weight']} x log10(1 + KC)) x access. KC {R}; weights, avoid list "
      f"{oc['avoid_bosses']} (x{oc['avoid_factor']}) and team list (x{oc['team_factor']}) are {A}. "
      f"Level-gated bosses score 0. This reorders the required set, it does not change it.\n")
    w("| # | Boss | Open pts | Tasks | KC | Lowest comp% | Score | Why |\n|---|---|---|---|---|---|---|---|")
    for i, r in enumerate(od["rows"], 1):
        kc_s = "-" if r["kc"] is None else f"{r['kc']:,}"
        w(f"| {i} | {r['boss']} | {r['pts']} | {len(r['tasks'])} | {kc_s} | {_pct(r['min_pct'])} | {r['score']:.0f} | {r['why']} |")
    w("")
    alt = od["avoid_alt"]
    if alt:
        w(f"Avoid-list cost {D}: the required set holds {od['avoid_pts_in_set']} pts from {od['avoid_bosses']}. "
          f"Excluding them entirely moves the cutoff from {_pct(s['cutoff_pct'])} to {_pct(alt['cutoff_pct'])} "
          f"({alt['n']} tasks, {alt['total']} pts). Tasks that would come in instead, hardest first:")
        base_ids = s["chosen_ids"]
        new_in = [t for t in alt["chosen"] if t["id"] not in base_ids]
        for t in sorted(new_in, key=lambda t: (t["comp_pct"] or 0))[:12]:
            w(f"- {_pct(t['comp_pct'])} {t['boss']}: {t['task']} ({t['tier']}, {t['pts']})")
        if len(new_in) > 12:
            w(f"- and {len(new_in) - 12} more")
        w("")

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
    w(f"Objective this run: **{ctx['slayer'][0]['objective']}** weights {sc['objectives'][ctx['slayer'][0]['objective']]} {A}. "
      f"Score = weighted sum of each task's CA open pts, xp/hr and gp/hr, each scaled 0..1 against the master's best. "
      f"DO >= {sc['do_score_min']}, BLOCK at or below the master's bottom {sc['block_quantile']:.0%} of scores (floor {sc['block_score_max']}) with roll >= {sc['block_weight_min_pct']}%. "
      f"XP/GP/minutes come from data/task_rates.json; entries not marked measured are {A}.\n")
    for m in ctx["slayer"]:
        eb, ea, eu = m["ev_before"], m["ev_after"], m["ev_unblocked"]
        w(f"### {m['master']}: per roll CA {eb['ca']:.2f} -> {ea['ca']:.2f}, xp/hr {eb['xp']:,.0f} -> {ea['xp']:,.0f}, "
          f"gp/hr {eb['gp']:,.0f} -> {ea['gp']:,.0f} {D}\n")
        w(f"Recommended blocks under {m['objective']} ({m['free_slots']} free slots): {m['recommended_blocks'] or 'none'}; "
          f"cost {m['rec_block_points']} slayer pts {D}"
          + (f", funded by {m['rolls_to_fund_blocks']:.0f} tasks at {m['pts_per_task']} pts" if m['rolls_to_fund_blocks'] else "")
          + f". {m['assumed_rates']} of the eligible rows use assumed rates.\n")
        w(f"Block list by objective {D}: " + "; ".join(f"**{k}** {v or 'none'}" for k, v in m["blocks_by_objective"].items()) + "\n")
        if m["unblock"]:
            w(f"Blocked tasks worth freeing under {m['objective']}: {m['unblock']}. Freeing lifts per roll to CA {eu['ca']:.2f}, "
              f"xp/hr {eu['xp']:,.0f}, gp/hr {eu['gp']:,.0f} {D} (cancelling a block is free, re-blocking costs again).\n")
        if m["pool"]:
            w(f"Boss-task pool {len(m['pool'])} bosses, mean open {m['pool_ev']:.1f} CA pts {D} (uniform pick {A}): "
              + ", ".join(f"{b} {p}" for b, p in sorted(m["pool_open"].items(), key=lambda x: -x[1]) if p) + "\n")
        w("| Task | Wt | Roll % | CA pts | XP/hr | GP/hr | Min | Score | ca/xp/gp | Counts | Verdict |\n|---|---|---|---|---|---|---|---|---|---|---|")
        for r in sorted(m["rows"], key=lambda r: (r["verdict"] == "N/A", -r.get("score", 0), -r["weight"])):
            if r["verdict"] == "N/A":
                w(f"| {r['monster']} | {r['weight']} | - | - | - | - | - | - | - | {r['why']} | N/A |")
                continue
            counts = "boss pool" if r["is_boss"] else ", ".join(r["bosses"]) or "-"
            src = "" if r["rate_src"] == "measured" else "*"
            sc3 = "/".join(f"{r['scores'][k]:.2f}" for k in ("ca", "xp", "gp"))
            w(f"| {r['monster']} | {r['weight']} | {r['p'] * 100:.1f} | {r['ca']:g} | {r['xp']:,}{src} | {r['gp']:,}{src} | "
              f"{r['minutes']}{src} | {r['score']:.2f} | {sc3} | {counts} | **{r['verdict']}** |")
        w("\n`*` = assumed rate, not measured.\n")

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
