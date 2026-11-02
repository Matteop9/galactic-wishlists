"""Shared fetch helpers: User-Agent, date-stamped raw cache, step logging."""
import datetime as _dt
import html as _html
import json
import pathlib
import re

import requests

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
RAW = DATA / "raw"
UA = "hahap-ca-tracker/0.1 (personal OSRS tracker; contact github.com/Matteop9)"
WIKI = "https://oldschool.runescape.wiki/w/"


def today() -> str:
    return _dt.date.today().isoformat()


def log(step: str, msg: str) -> None:
    print(f"[{step}] {msg}")


def fetch(url: str, name: str, *, kind: str = "text", force: bool = False, date: str | None = None):
    """GET url, cache under data/raw/<date>/<name>. Returns text or parsed JSON.

    Cache is per calendar day: a re-run on the same day reads the cached copy.
    """
    date = date or today()
    folder = RAW / date
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / name
    if path.exists() and not force:
        log("fetch", f"cache hit {path.relative_to(ROOT)}")
        text = path.read_text(encoding="utf-8")
    else:
        log("fetch", f"GET {url}")
        r = requests.get(url, headers={"User-Agent": UA}, timeout=60)
        r.raise_for_status()
        text = r.text
        path.write_text(text, encoding="utf-8")
        log("fetch", f"saved {path.relative_to(ROOT)} ({len(text):,} chars)")
    return json.loads(text) if kind == "json" else text


# ---- small HTML helpers (stdlib only, the wiki tables are regular enough) ----

_TAG = re.compile(r"<[^>]+>")
_IMG_ALT = re.compile(r'<img[^>]*alt="([^"]*)"[^>]*>')
_FOOTNOTE = re.compile(r"\[\s*n?\s*\d+\s*\]")


def strip(cell: str, keep_alts: bool = False) -> str:
    """Tags -> text. With keep_alts, image alt text survives as {alt}."""
    if keep_alts:
        cell = _IMG_ALT.sub(lambda m: " {" + m.group(1) + "} ", cell)
    text = _html.unescape(_TAG.sub(" ", cell))
    text = _FOOTNOTE.sub("", text)
    return re.sub(r"\s+", " ", text).strip()


def tables(page_html: str):
    """Yield (headers, rows) for each <table>; rows are lists of raw <td> HTML."""
    for t in re.findall(r"<table[^>]*>.*?</table>", page_html, re.S):
        heads = [strip(h) for h in re.findall(r"<th[^>]*>(.*?)</th>", t, re.S)]
        rows = []
        for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", t, re.S):
            tds = re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)
            if tds:
                rows.append(tds)
        yield heads, rows
