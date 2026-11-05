"""Fetch layer: wiki bucket (one call), optional guide wikitext, optional live prices.

Every response is cached under data/raw/<date>/ (gitignored). A re-run on the same day reads
the cache unless --force.
"""
import datetime as _dt
import json
import pathlib
import time
import urllib.parse

import requests

ROOT = pathlib.Path(__file__).resolve().parent
DATA = ROOT / "data"
RAW = DATA / "raw"
API = "https://oldschool.runescape.wiki/api.php"
PRICES = "https://prices.runescape.wiki/api/v1/osrs"

_last_call = [0.0]


def today() -> str:
    return _dt.date.today().isoformat()


def log(step: str, msg: str) -> None:
    print(f"[{step}] {msg}", flush=True)


def _get(url: str, params: dict | None, cache: pathlib.Path, cfg: dict, force: bool):
    if cache.exists() and not force:
        log("fetch", f"cache hit {cache.relative_to(ROOT)}")
        return json.loads(cache.read_text(encoding="utf-8"))
    wait = cfg["rate_limit_s"] - (time.time() - _last_call[0])
    if wait > 0:
        time.sleep(wait)
    shown = url + ("?" + urllib.parse.urlencode(params) if params else "")
    log("fetch", f"GET {shown[:140]}")
    r = requests.get(url, params=params, headers={"User-Agent": cfg["user_agent"]}, timeout=90)
    _last_call[0] = time.time()
    r.raise_for_status()
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(r.text, encoding="utf-8")
    return r.json()


def get_bucket(cfg: dict, date: str, force: bool) -> list[dict]:
    """All Worthwhile money making guides in one bucket query. Returns raw rows."""
    q = ("bucket('money_making_guide').select('page_name','json','value','recurring')"
         ".where('Category:Worthwhile money making guides').limit(5000).run()")
    data = _get(API, {"action": "bucket", "format": "json", "query": q},
                RAW / date / "bucket_mmg.json", cfg, force)
    if "bucket" not in data:
        raise RuntimeError(f"bucket query returned no 'bucket' key: {str(data)[:300]}")
    return data["bucket"]


def get_wikitext(pages: list[str], cfg: dict, date: str, force: bool) -> dict[str, str]:
    """Guide wikitext, 50 titles per request (query/revisions). Returns {page_name: wikitext}."""
    out = {}
    for i in range(0, len(pages), 50):
        chunk = pages[i:i + 50]
        data = _get(API, {"action": "query", "format": "json", "formatversion": "2",
                          "prop": "revisions", "rvprop": "content", "rvslots": "main",
                          "titles": "|".join(chunk)},
                    RAW / date / f"wikitext_{i // 50:03d}.json", cfg, force)
        norm = {n["to"]: n["from"] for n in data.get("query", {}).get("normalized", [])}
        for p in data.get("query", {}).get("pages", []):
            title = norm.get(p["title"], p["title"])
            revs = p.get("revisions") or []
            if revs:
                out[title] = revs[0]["slots"]["main"]["content"]
    return out


def get_prices(cfg: dict, date: str, force: bool) -> dict[str, dict]:
    """Live GE prices keyed by item name: {name: {'id', 'high', 'low'}}."""
    mapping = _get(f"{PRICES}/mapping", None, RAW / date / "prices_mapping.json", cfg, force)
    latest = _get(f"{PRICES}/latest", None, RAW / date / "prices_latest.json", cfg, force)["data"]
    out = {}
    for m in mapping:
        p = latest.get(str(m["id"]))
        if p:
            out[m["name"]] = {"id": m["id"], "high": p.get("high"), "low": p.get("low")}
    return out
