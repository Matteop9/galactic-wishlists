"""Slayer master assignment tables, Boss Slayer pool, master point/block costs."""
import re

from .common import WIKI, fetch, log, strip, tables

MASTER_PAGES = {"Duradel": "Duradel", "Nieve": "Nieve", "Konar": "Konar_quo_Maten", "Krystilia": "Krystilia"}
COL = {"monster": ("Monster",), "amount": ("Amount",), "ext": ("Extended amt.",),
       "req": ("Unlock requirement",), "alts": ("Alternative(s)",), "weight": ("Weight", "Task weight"),
       "wildy": ("Wilderness Level",)}


def _idx(heads, names):
    for n in names:
        if n in heads:
            return heads.index(n)
    return None


def _num(s):
    m = re.search(r"\d+", s or "")
    return int(m.group()) if m else None


def get_master_table(master: str, **kw) -> dict:
    page = MASTER_PAGES[master]
    h = fetch(WIKI + page, f"master_{master.lower()}.html", **kw)
    for heads, rows in tables(h):
        wi = _idx(heads, COL["weight"])
        if wi is None or "Monster" not in heads:
            continue
        ix = {k: _idx(heads, v) for k, v in COL.items()}
        out = []
        for tds in rows:
            if len(tds) <= wi:
                continue
            cells = {k: (tds[i] if i is not None and i < len(tds) else "") for k, i in ix.items()}
            w = _num(strip(cells["weight"]))
            if w is None:
                continue
            req_alts = strip(cells["req"], keep_alts=True)
            m = re.search(r"\{[^}]*Slayer[^}]*\}\s*(\d+)", req_alts)
            slayer_req = int(m.group(1)) if m else None
            alts_txt = strip(re.sub(r"<br\s*/?>", ",", cells["alts"]))
            out.append({
                "monster": strip(cells["monster"]),
                "amount": strip(cells["amount"]),
                "extended": strip(cells["ext"]),
                "req_text": strip(cells["req"]),
                "req_alts": req_alts,
                "slayer_req": slayer_req,
                "alts": [a.strip() for a in alts_txt.split(",") if a.strip()],
                "weight": w,
                "wildy": strip(cells["wildy"]),
            })
        total = sum(r["weight"] for r in out)
        wiki_total = _num(heads[-1]) if heads and heads[-1].isdigit() else None
        msg = f"{master}: {len(out)} assignments, total weight {total}"
        if wiki_total:
            msg += f" (wiki header says {wiki_total})"
        log("slayer_tables", msg)
        if wiki_total and wiki_total != total:
            log("slayer_tables", f"{master}: WEIGHT TOTAL MISMATCH {total} vs {wiki_total}, check parse")
        return {"master": master, "assignments": out, "total_weight": total, "wiki_total": wiki_total}
    raise SystemExit(f"[slayer_tables] no weight table found on {page}")


def get_boss_slayer(**kw) -> dict:
    """Like a Boss pool + the 'counts on a regular task' boss table."""
    h = fetch(WIKI + "Boss_Slayer", "boss_slayer.html", **kw)
    pool, on_task = [], []
    for heads, rows in tables(h):
        if heads[:2] == ["Boss", "Location"] and "Task" not in heads:
            for tds in rows:
                cells = [strip(c) for c in tds]
                non_empty = [c for c in cells if c]
                if len(non_empty) < 3:
                    continue
                name = non_empty[0]
                pool.append({"boss": re.sub(r"\s*\(.*", "", name).strip(), "raw": name,
                             "slayer_req": _num(non_empty[2])})
        elif "Task" in heads and "Boss" in heads:
            ti, bi = heads.index("Task"), heads.index("Boss")
            for tds in rows:
                cells = [strip(c) for c in tds]
                if len(cells) > ti:
                    on_task.append({"boss": cells[bi], "task": cells[ti]})
    log("slayer_tables", f"Boss Slayer pool {len(pool)} bosses; {len(on_task)} bosses count on a regular task")
    return {"pool": pool, "on_task": on_task}


def get_master_costs(**kw) -> dict:
    h = fetch(WIKI + "Slayer_Master", "slayer_master.html", **kw)
    out = {}
    for heads, rows in tables(h):
        if heads[:1] == ["Slayer Master"] and "Block cost" in heads:
            pi, bi = heads.index("Points per Task"), heads.index("Block cost")
            for tds in rows:
                cells = [strip(c) for c in tds]
                if len(cells) > bi:
                    name = re.split(r"\s*/\s*", cells[0])[0].strip()
                    out[name] = {"points": _num(cells[pi]), "points_text": cells[pi], "block_cost": _num(cells[bi])}
    summary = ", ".join(f"{k} {v['points']}pts/block {v['block_cost']}" for k, v in out.items())
    log("slayer_tables", f"master costs: {summary}")
    return out
