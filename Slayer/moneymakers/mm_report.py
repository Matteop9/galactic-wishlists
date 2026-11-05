"""Report layer: report.md (human) + report.json (full per-method array)."""
import json


def gp(x):
    if x is None:
        return "-"
    a = abs(x)
    s = "-" if x < 0 else ""
    if a >= 1e9:
        return f"{s}{a / 1e9:.2f}b"
    if a >= 1e6:
        return f"{s}{a / 1e6:.2f}m"
    if a >= 1e3:
        return f"{s}{a / 1e3:.0f}k"
    return f"{s}{a:.0f}"


def num(x, d=2):
    return "-" if x is None else f"{x:.{d}f}"


def pct(x):
    return "-" if x is None else f"{x * 100:.0f}%"


def hrs(x):
    if x is None:
        return "-"
    if x < 1:
        return "<1"
    if x >= 100_000:
        return ">100k"
    return f"{x:,.0f}"


def link(m, n=48):
    a = m["activity"] if len(m["activity"]) <= n else m["activity"][: n - 1] + "~"
    return f"[{a.replace('|', '/')}]({m['url'].replace(' ', '_').replace('(', '%28').replace(')', '%29')})"


def short(s, n=40):
    s = s or "-"
    return s if len(s) <= n else s[: n - 1] + "~"


def in_band(v, rng):
    return rng[0] <= v <= rng[1]


def build_md(methods, rec, meta, cfg, top_n) -> str:
    R = cfg["report"]
    live = meta["reprice"]
    key = "gp_hr_live" if live else "gp_hr"
    ranked = sorted([m for m in methods if m[key] is not None], key=lambda m: -m[key])
    L = []
    w = L.append
    w(f"# OSRS money makers: profit, luck, effort, skill ({meta['date']})")
    w("")
    w(f"Source: OSRS wiki bucket `money_making_guide`, Category:Worthwhile money making guides. "
      f"{meta['n_rows']} guides read ({meta['n_normal']} normal, {meta['n_recurring']} recurring); "
      f"{meta['n_after_filter']} normal guides after filters ({meta['filters']}).")
    w("")
    w("**Caveats (read every time)**")
    w("")
    w("- gp/hr is **read** from the wiki: outputs after 2% GE tax minus inputs, at the guide's default "
      "kills/actions per hour, with prices frozen at the wiki's last page render. "
      + ("This run used `--reprice`: gp/hr columns are **derived** from live GE mid prices (gemw lines only; "
         "manual `value` lines kept as the wiki set them; tax-exempt item list ignored)." if live
         else "Run with `--reprice` for live GE prices."))
    w(f"- sd, cv, luck_share, hours_to_10pct are **derived** from a per-line drop model "
      f"(`variance.model = {cfg['variance']['model']}`): per-kill drops with p<1 are Bernoulli per kill, "
      f"guaranteed integer drops and per-hour production at >= {cfg['variance']['deterministic_rate_per_hour']}/hr "
      f"are deterministic, everything else Poisson. Inputs deterministic. This understates variance for "
      f"stacked drops averaged into one line and ignores kph/death variance. Pure-Poisson figures are in "
      f"report.json (`sd_poisson`, `cv_poisson`).")
    w("- hours_to_10pct = hours before realised gp/hr is within +-10% of expectation ~95% of the time = (1.96 cv / 0.10)^2.")
    w("- Effort (1-5) and Skill (1-5) are **assumed** mappings: effort from wiki intensity "
      "(Low 1 / Moderate 3 / High 5, category fallback if missing"
      + (", +-1 from guide text" if meta["details"] else "; text adjustments off, use `--details`")
      + "); skill from the keyword table in `data/skill_tiers.json`. Bands, risk penalty "
      f"({cfg['risk_penalty_sd']} sd) and thresholds live in `data/config.json`.")
    w("- Recurring guides (birdhouses, herb runs, daily claims) are per run, not 'do it for 5 hours'; "
      "they are excluded from sections 1-4 and listed in section 5.")
    w("- Requirements and kph assume the guide author's setup (often max gear). Your rate will differ.")
    w("")

    # 1 top N
    w(f"## 1. Top {top_n} by gp/hr")
    w("")
    w("| # | Method | gp/hr | sd/hr | cv | band | luck share | hrs to +-10% | effort | skill | risk-adj | category | req skills | mem |")
    w("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|")
    for i, m in enumerate(ranked[:top_n], 1):
        w(f"| {i} | {link(m)} | {gp(m[key])} | {gp(m['sd'])} | {num(m['cv'])} | {m['band'] or '-'} | "
          f"{pct(m['luck_share'])} | {hrs(m['hours_to_10pct'])} | {m['effort']} | {m['skill']} | "
          f"{gp(m['risk_adj'])} | {m['category']} | {short(m['req_summary'])} | {'Y' if m['members'] else 'F2P'} |")
    w("")

    # 2 matrix
    eb, sb = cfg["effort_bands"], cfg["skill_bands"]
    w(f"## 2. Effort x skill matrix (best {R['matrix_n']} by gp/hr per cell)")
    w("")
    w("| effort \\ skill | " + " | ".join(sb) + " |")
    w("|---|" + "---|" * len(sb))
    for en, er in eb.items():
        cells = []
        for sn, sr in sb.items():
            pick = [m for m in ranked if in_band(m["effort"], er) and in_band(m["skill"], sr)][: R["matrix_n"]]
            cells.append("<br>".join(f"{link(m, 34)} {gp(m[key])}" for m in pick) or "-")
        w(f"| **{en}** | " + " | ".join(cells) + " |")
    w("")

    # 3 steady
    steady = [m for m in ranked if m["band"] == "steady" and m[key] > 0][: R["steady_n"]]
    w(f"## 3. Top {R['steady_n']} steady methods (cv < 0.10) by gp/hr")
    w("")
    w("| # | Method | gp/hr | cv | effort | skill | category | req skills |")
    w("|---|---|---|---|---|---|---|---|")
    for i, m in enumerate(steady, 1):
        w(f"| {i} | {link(m)} | {gp(m[key])} | {num(m['cv'], 3)} | {m['effort']} | {m['skill']} | "
          f"{m['category']} | {short(m['req_summary'])} |")
    w("")

    # 4 lottery
    lot = [m for m in ranked if m["band"] == "lottery"][: R["lottery_n"]]
    w(f"## 4. Top {R['lottery_n']} lottery methods (cv >= 1.0) by gp/hr")
    w("")
    w("| # | Method | gp/hr | sd/hr | cv | hrs to +-10% | main variance item | its share of var | its rate/hr |")
    w("|---|---|---|---|---|---|---|---|---|")
    for i, m in enumerate(lot, 1):
        d = m["variance_driver"] or {}
        w(f"| {i} | {link(m)} | {gp(m[key])} | {gp(m['sd'])} | {num(m['cv'])} | {hrs(m['hours_to_10pct'])} | "
          f"{d.get('item', '-')} | {pct(d.get('var_share'))} | {num(d.get('rate'), 4)} |")
    w("")

    # 5 recurring
    rec_s = sorted(rec, key=lambda m: -(m["gp_hr"] or -1e18))
    w("## 5. Recurring guides (per run)")
    w("")
    w("| # | Method | profit/run | run time (min) | gp/hr of play | recurrence | effort | category | req skills |")
    w("|---|---|---|---|---|---|---|---|---|")
    for i, m in enumerate(rec_s, 1):
        w(f"| {i} | {link(m)} | {gp(m['profit_run'])} | {num(m['time_min'], 1)} | "
          f"{gp(m['gp_hr_live'] if live else m['gp_hr'])} | {short(m['recurrence'], 30)} | {m['effort']} | "
          f"{m['category']} | {short(m['req_summary'])} |")
    w("")

    # 6 data quality
    allm = methods + rec
    mism = [m for m in allm if m["mismatch"]]
    w("## 6. Data quality")
    w("")
    w(f"- Profit recompute vs wiki `value`: {len(allm) - len(mism)}/{len(allm)} within "
      f"{cfg['mismatch_tolerance'] * 100:.0f}%; {len(mism)} mismatches.")
    if mism:
        w("")
        w("| Method | wiki value | recomputed | diff |")
        w("|---|---|---|---|")
        for m in sorted(mism, key=lambda m: -abs(m["recomputed"] - m["wiki_value"])):
            d = (m["recomputed"] - m["wiki_value"]) / max(abs(m["wiki_value"]), 1)
            w(f"| {link(m)} | {gp(m['wiki_value'])} | {gp(m['recomputed'])} | {d * 100:+.1f}% |")
    noint = [m for m in methods if not m["intensity"]]
    w("")
    w(f"- Normal guides with no intensity (effort from category fallback): {len(noint)}"
      + (": " + ", ".join(link(m) for m in noint) if noint else "")
      + f". All {len(rec)} recurring guides lack intensity by template design.")
    unp = [m for m in allm if m["skill_unparsed"]]
    w(f"- Unparsed skill strings: {len(unp)}")
    for m in unp:
        w(f"  - {link(m)}: `{short(str(m['skill_raw']).replace(chr(10), ' '), 120)}`")
    neg = [m for m in methods if m["gp_hr"] is not None and m["gp_hr"] <= 0]
    w(f"- Guides with gp/hr <= 0 (cv undefined): {len(neg)}" + (": " + ", ".join(link(m) for m in neg) if neg else ""))
    unv = [m for m in allm if m["skill_unverified"]]
    if unv:
        w(f"- Skill tier unverified (content not known to the keyword table author): "
          + ", ".join(f"{link(m)} -> {m['skill']}" for m in unv))
    for n in meta["notes"]:
        w(f"- {n}")
    w("")
    w(f"_Generated by moneymakers/run.py in {meta['runtime_s']:.1f}s. Objective: gp/hr; luck, effort and skill are context, not filters._")
    return "\n".join(L) + "\n"


def write_json(path, methods, rec, meta):
    path.write_text(json.dumps({"meta": meta, "methods": methods, "recurring": rec}, indent=1, default=str),
                    encoding="utf-8")
