"""One run: fetch bucket -> (details) -> (reprice) -> model -> report.md + report.json + dated snapshot.

python run.py [--reprice] [--details] [--force] [--top N] [--min-profit GP] [--members-only | --f2p-only]
"""
import argparse
import datetime as dt
import json
import sys
import time

from mm_fetch import DATA, ROOT, get_bucket, get_prices, get_wikitext, log, today
from mm_model import build_method
from mm_report import build_md, write_json

sys.stdout.reconfigure(encoding="utf-8")


def write_snapshot(date: str, methods: list, rec: list) -> None:
    p = DATA / f"methods_{date}.json"
    payload = {"date": date, "methods": methods, "recurring": rec}
    body = json.dumps(payload, indent=1, default=str)
    if p.exists():
        if p.read_text(encoding="utf-8") == body:
            log("snapshot", f"{p.name} already holds identical data, not rewritten")
            return
        p = DATA / f"methods_{date}_{dt.datetime.now():%H%M%S}.json"
    p.write_text(body, encoding="utf-8")
    log("snapshot", f"wrote {p.name} (prior snapshots never overwritten)")


def main():
    t0 = time.time()
    ap = argparse.ArgumentParser()
    ap.add_argument("--reprice", action="store_true", help="re-price gemw lines from prices.runescape.wiki")
    ap.add_argument("--details", action="store_true", help="fetch guide wikitext for effort text adjustments")
    ap.add_argument("--force", action="store_true", help="refetch even if cached today")
    ap.add_argument("--top", type=int, default=None, help="rows in the top table (default config report.top_n)")
    ap.add_argument("--min-profit", type=float, default=None, help="drop normal guides below this gp/hr")
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--members-only", action="store_true")
    g.add_argument("--f2p-only", action="store_true")
    args = ap.parse_args()

    date = today()
    cfg = json.loads((DATA / "config.json").read_text(encoding="utf-8"))
    tiers = json.loads((DATA / "skill_tiers.json").read_text(encoding="utf-8"))
    top_n = args.top or cfg["report"]["top_n"]
    log("run", f"inputs: date={date} reprice={args.reprice} details={args.details} force={args.force} "
               f"top={top_n} min_profit={args.min_profit} members_only={args.members_only} f2p_only={args.f2p_only}")
    log("run", f"assumed inputs: data/config.json (variance model={cfg['variance']['model']}, "
               f"risk penalty={cfg['risk_penalty_sd']} sd), data/skill_tiers.json "
               f"({sum(len(v) for k, v in tiers.items() if not k.startswith('_'))} keywords)")
    notes = []

    # 1 fetch bucket
    rows = get_bucket(cfg, date, args.force)
    n_rec = sum(1 for r in rows if "recurring" in r)
    log("bucket", f"{len(rows)} guides read ({len(rows) - n_rec} normal, {n_rec} recurring)")
    if not rows:
        raise SystemExit("bucket returned 0 rows; stop")

    # 2 optional details
    details = {}
    if args.details:
        details = get_wikitext([r["page_name"] for r in rows], cfg, date, args.force)
        miss = len(rows) - len(details)
        log("details", f"wikitext for {len(details)} guides" + (f"; MISSING {miss}" if miss else ""))
        if miss:
            notes.append(f"--details: wikitext missing for {miss} guides (no effort text adjustment applied)")
    else:
        log("details", "skipped (no --details): effort text adjustments not applied")

    # 3 optional prices
    prices = None
    if args.reprice:
        prices = get_prices(cfg, date, args.force)
        log("prices", f"{len(prices)} items with live prices")
        notes.append("--reprice: GE tax exempt list ignored (wiki uses it; affects a handful of cheap tools only).")
    else:
        log("prices", "skipped (no --reprice): wiki render-time prices used")

    # 4 model
    built = [build_method(r, cfg, tiers, details, prices, notes) for r in rows]
    normal = [m for m in built if not m["recurring"]]
    rec = [m for m in built if m["recurring"]]
    mism = [m for m in built if m["mismatch"]]
    log("model", f"{len(built)} modelled; profit recompute mismatches >{cfg['mismatch_tolerance'] * 100:.0f}%: {len(mism)}")
    for m in mism[:10]:
        log("model", f"  mismatch {m['page']}: wiki {m['wiki_value']:,.0f} vs recomputed {m['recomputed']:,.0f}")
    unp = [m for m in built if m["skill_unparsed"]]
    log("model", f"unparsed skill strings: {len(unp)}; no intensity (normal): {sum(1 for m in normal if not m['intensity'])}")
    if prices is not None:
        miss = {l["name"] for m in built for l in m["inputs"] + m["outputs"] if l.get("unit_live_missing")}
        log("prices", f"gemw lines with no live price (kept wiki price): {len(miss)} distinct items")
        if miss:
            notes.append(f"--reprice: {len(miss)} gemw items had no live price, wiki price kept: {sorted(miss)[:15]}")
    rec_no_time = [m["page"] for m in rec if not m["time_min"]]
    if rec_no_time:
        notes.append(f"Recurring guides with no activity time (gp/hr undefined): {rec_no_time}")

    # 5 filters
    flt = []
    if args.members_only:
        normal = [m for m in normal if m["members"]]
        flt.append("members only")
    if args.f2p_only:
        normal = [m for m in normal if not m["members"]]
        flt.append("F2P only")
    if args.min_profit is not None:
        k = "gp_hr_live" if args.reprice else "gp_hr"
        normal = [m for m in normal if (m[k] or 0) >= args.min_profit]
        flt.append(f"gp/hr >= {args.min_profit:,.0f}")
    log("filter", f"{len(normal)} normal guides after filters ({', '.join(flt) or 'none'})")

    # 6 outputs
    meta = {"date": date, "reprice": args.reprice, "details": args.details, "n_rows": len(rows),
            "n_normal": len(rows) - n_rec, "n_recurring": n_rec, "n_after_filter": len(normal),
            "filters": ", ".join(flt) or "none", "n_mismatch": len(mism), "n_unparsed_skill": len(unp),
            "notes": notes, "variance_model": cfg["variance"]["model"]}
    write_snapshot(date, [m for m in built if not m["recurring"]], rec)
    meta["runtime_s"] = time.time() - t0
    (ROOT / "report.md").write_text(build_md(normal, rec, meta, cfg, top_n), encoding="utf-8")
    write_json(ROOT / "report.json", normal, rec, meta)
    log("report", f"wrote report.md + report.json in {meta['runtime_s']:.1f}s")


if __name__ == "__main__":
    main()
