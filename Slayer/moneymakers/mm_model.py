"""Model layer: parse bucket rows, recompute profit, variance, effort, human skill.

Provenance: wiki fields are 'read'; anything computed from them is 'derived'; anything that
comes from data/config.json or data/skill_tiers.json is 'assumed'.
"""
import html
import json
import math
import re

WIKI = "https://oldschool.runescape.wiki/w/"
SKILLS = {"Attack", "Strength", "Defence", "Ranged", "Prayer", "Magic", "Runecraft", "Construction",
          "Hitpoints", "Agility", "Herblore", "Thieving", "Crafting", "Fletching", "Slayer", "Hunter",
          "Mining", "Smithing", "Fishing", "Cooking", "Firemaking", "Woodcutting", "Farming", "Sailing"}
NO_REQ = {"", "none", "n/a", "na", "-", "no requirements", "none required"}


# ---------- text helpers ----------

def clean_wikitext(s: str) -> str:
    s = s or ""
    s = re.sub(r"\[\[(?:File|Image):[^\]]*\]\]", "", s)
    s = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]*)\]\]", r"\1", s)
    s = re.sub(r"\{\{[^{}]*\}\}", "", s)
    s = re.sub(r"<[^>]+>", "", s)
    s = s.replace("'''", "").replace("''", "")
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def _lvl(txt):
    m = re.match(r"\s*(\d+)", txt or "")
    return int(m.group(1)) if m else None


def parse_skills(raw):
    """-> (list of {skill, level}, extras, unparsed_flag). Handles scp spans, File icons, 'Combat level N'."""
    raw = raw if isinstance(raw, str) else ("" if raw is None else str(raw))
    if clean_wikitext(raw).lower().strip(" .*") in NO_REQ:
        return [], [], False
    found, extras = [], []
    span_re = re.compile(r'<span class="scp"[^>]*?data-skill="([^"]+)"(?:[^>]*?data-level="([^"]*)")?[^>]*>.*?</span>',
                         re.S)
    for sk, lv in span_re.findall(raw):
        (found if sk in SKILLS else extras).append({"skill": sk, "level": _lvl(lv)})
    rest = span_re.sub(" ", raw)
    for sk, lv in re.findall(r"\[\[File:([A-Za-z ]+?) icon\.png[^\]]*\]\]\s*(\d+)?", rest):
        (found if sk in SKILLS else extras).append({"skill": sk, "level": _lvl(lv)})
    for lv in re.findall(r"[Cc]ombat level[^\d]{0,15}(\d+)", raw):
        found.append({"skill": "Combat", "level": int(lv)})
    # collapse duplicates, keep the highest level per skill
    best = {}
    for f in found:
        cur = best.get(f["skill"])
        if cur is None or (f["level"] or 0) > (cur or 0):
            best[f["skill"]] = f["level"]
    skills = [{"skill": k, "level": v} for k, v in best.items()]
    unparsed = not skills and not extras
    return skills, extras, unparsed


ABBR = {"Attack": "Att", "Strength": "Str", "Defence": "Def", "Ranged": "Rng", "Magic": "Mag",
        "Hitpoints": "HP", "Prayer": "Pray", "Runecraft": "RC", "Construction": "Con",
        "Herblore": "Herb", "Thieving": "Thiev", "Crafting": "Craft", "Fletching": "Fletch",
        "Woodcutting": "WC", "Firemaking": "FM", "Smithing": "Smith", "Agility": "Agil"}


def skills_summary(skills):
    if not skills:
        return "-"
    parts = []
    for s in sorted(skills, key=lambda x: -(x["level"] or 0)):
        parts.append(f"{ABBR.get(s['skill'], s['skill'])} {s['level'] if s['level'] else '?'}")
    return ", ".join(parts)


def fnum(x):
    """Wiki qty/value arrive as int, float or string. Returns (float, ok)."""
    try:
        return float(x), True
    except (TypeError, ValueError):
        return 0.0, False


# ---------- per-method model ----------

def build_method(row: dict, cfg: dict, tiers: dict, details: dict, prices: dict | None, notes: list) -> dict:
    j = json.loads(row["json"])
    page = row["page_name"]
    recurring = "recurring" in row
    isperkill = bool(j.get("isperkill"))
    kph = fnum((j.get("prices") or {}).get("default_kph", 1))[0] or 1.0
    vcfg = cfg["variance"]
    bad_numbers = []

    def lines(key, is_output):
        out = []
        for it in j.get(key) or []:
            q, okq = fnum(it.get("qty", 1))
            v, okv = fnum(it.get("value", 0))
            if not okq or not okv:
                bad_numbers.append(it.get("name"))
            isph = bool(it.get("isph"))
            perkill_line = isperkill and not isph and not recurring
            q_hr = q * kph if perkill_line else q
            line = {"name": it.get("name"), "qty": q, "qty_hr": q_hr, "unit": v, "isph": isph,
                    "perkill": perkill_line, "pricetype": it.get("pricetype"), "unit_live": None}
            if prices is not None and it.get("pricetype") == "gemw":
                p = prices.get(it.get("name"))
                if p:
                    hi, lo = p.get("high"), p.get("low")
                    mid = (hi + lo) / 2 if hi and lo else (hi or lo)
                    if mid and is_output and mid > 49:
                        mid = mid - min(math.floor(mid * 0.02), 5_000_000)
                    line["unit_live"] = mid
                else:
                    line["unit_live_missing"] = True
            out.append(line)
        return out

    ins, outs = lines("inputs", False), lines("outputs", True)
    in_val = sum(l["qty_hr"] * l["unit"] for l in ins)
    out_val = sum(l["qty_hr"] * l["unit"] for l in outs)
    recomputed = out_val - in_val
    wiki_value = fnum(row.get("value"))[0]
    tol = cfg["mismatch_tolerance"]
    denom = max(abs(wiki_value), 1.0)
    mismatch = abs(recomputed - wiki_value) / denom > tol

    # profit basis: per hour for normal guides, per run for recurring
    time_min = fnum(j.get("time"))[0] if recurring else None
    if recurring:
        profit_run = wiki_value
        gp_hr = wiki_value * 60 / time_min if time_min else None
    else:
        profit_run = None
        gp_hr = wiki_value

    # live re-pricing (optional)
    gp_hr_live = None
    if prices is not None:
        def lv(l):
            return l["unit_live"] if l["unit_live"] is not None else l["unit"]
        live = sum(l["qty_hr"] * lv(l) for l in outs) - sum(l["qty_hr"] * lv(l) for l in ins)
        gp_hr_live = (live * 60 / time_min if time_min else None) if recurring else live

    # variance over outputs (inputs deterministic). Basis = per hour, or per run for recurring.
    det = vcfg["deterministic_rate_per_hour"]
    contrib = []
    for l in outs:
        v2 = l["unit"] ** 2
        lam = l["qty_hr"]
        pois = max(lam, 0) * v2
        if l["perkill"]:
            p = l["qty"]
            if p < 1:
                ref = kph * p * (1 - p) * v2
            elif abs(p - round(p)) < 1e-9:
                ref = 0.0
            else:
                ref = pois
        else:
            ref = 0.0 if lam >= det else pois
        use = ref if vcfg["model"] == "refined" else pois
        contrib.append((l["name"], use, pois, lam, l["qty_hr"] * l["unit"]))
    var = sum(c[1] for c in contrib)
    var_p = sum(c[2] for c in contrib)
    sd, sd_p = math.sqrt(var), math.sqrt(var_p)
    base = profit_run if recurring else gp_hr
    cv = sd / base if base and base > 0 else None
    cv_p = sd_p / base if base and base > 0 else None
    rare = vcfg["rare_rate_per_hour"]
    rare_val = sum(c[4] for c in contrib if c[3] < rare)
    luck_share = rare_val / out_val if out_val > 0 else None
    top = max(contrib, key=lambda c: c[1]) if contrib and var > 0 else None
    driver = {"item": top[0], "var_share": top[1] / var, "rate": top[3]} if top else None
    z, e = cfg["hours_z"], cfg["hours_target_rel_err"]
    h10 = (z * cv / e) ** 2 if cv is not None else None
    band = None
    if cv is not None:
        for b in cfg["bands"]:
            if b["max_cv"] is None or cv < b["max_cv"]:
                band = b["name"]
                break

    # effort
    act_clean = clean_wikitext(j.get("activity") or page.split("/", 1)[-1])
    cat = j.get("category") or ("Recurring" if recurring else "")
    ecfg = cfg["effort"]
    intensity = j.get("intensity")
    if intensity in ecfg["intensity_map"]:
        effort, effort_src = ecfg["intensity_map"][intensity], f"intensity {intensity}"
    else:
        fb = ecfg["category_fallback"]
        key = cat if cat in fb else re.split(r"[/ (]", cat)[0] if cat else "_default"
        effort = fb.get(key, fb["_default"])
        effort_src = f"category {cat or 'none'} (no intensity)"
    text = (details.get(page) or "").lower()
    adj = []
    if text:
        if any(k in text for k in ecfg["text_plus"]):
            adj.append("+1 click/tick text")
        t2 = text
        for n in ecfg["text_minus_negators"]:
            t2 = t2.replace(n, "")
        if any(re.search(rf"\b{re.escape(k)}\b", t2) for k in ecfg["text_minus"]):
            adj.append("-1 AFK text")
    effort = max(1, min(5, effort + sum(1 if a.startswith("+") else -1 for a in adj)))

    # human skill
    hay = (act_clean + " " + page).lower()
    skill, skill_src = None, None
    for tier in ("5", "4", "3"):
        for kw in tiers.get(tier, []):
            if re.search(rf"(?<![a-z]){re.escape(kw)}s?(?![a-z])", hay):
                skill, skill_src = int(tier), f"keyword '{kw}'"
                break
        if skill:
            break
    is_combat = cat.startswith("Combat")
    if skill is None:
        skill = cfg["skill"]["default_combat"] if is_combat else cfg["skill"]["default_noncombat"]
        skill_src = "default combat" if is_combat else "default non-combat"
    tick_hay = hay + " " + text
    if any(k in tick_hay for k in cfg["skill"]["tick_bump_keywords"]) and skill < cfg["skill"]["tick_skilling_tier"]:
        skill, skill_src = cfg["skill"]["tick_skilling_tier"], skill_src + " -> tick keyword"
    unverified = [kw for kw in tiers.get("_unverified", []) if skill_src == f"keyword '{kw}'"]

    skills, extras, unparsed = parse_skills(j.get("skill"))
    if bad_numbers:
        notes.append(f"{page}: non-numeric qty/value on {bad_numbers[:3]} (treated as 0)")

    return {
        "page": page,
        "url": WIKI + page.replace(" ", "_"),
        "activity": act_clean,
        "category": cat,
        "recurring": recurring,
        "members": j.get("members", True),
        "intensity": intensity,
        "isperkill": isperkill,
        "kph": kph if isperkill else None,
        "kph_text": (j.get("prices") or {}).get("kph_text") if isperkill else None,
        "time_min": time_min,
        "recurrence": j.get("recurrence"),
        "gp_hr": gp_hr,
        "profit_run": profit_run,
        "gp_hr_live": gp_hr_live,
        "wiki_value": wiki_value,
        "recomputed": recomputed,
        "mismatch": mismatch,
        "input_hr": in_val,
        "output_hr": out_val,
        "sd": sd,
        "cv": cv,
        "sd_poisson": sd_p,
        "cv_poisson": cv_p,
        "band": band,
        "luck_share": luck_share,
        "hours_to_10pct": h10,
        "variance_driver": driver,
        "risk_adj": (base - cfg["risk_penalty_sd"] * sd) if base is not None else None,
        "effort": effort,
        "effort_src": effort_src,
        "effort_adj": adj,
        "skill": skill,
        "skill_src": skill_src,
        "skill_unverified": unverified,
        "req_skills": skills,
        "req_extras": extras,
        "req_summary": skills_summary(skills),
        "skill_raw": j.get("skill"),
        "skill_unparsed": unparsed,
        "quest": clean_wikitext(j.get("quest") or ""),
        "inputs": ins,
        "outputs": outs,
        "provenance": {
            "read": ["gp_hr (non-recurring)", "wiki_value", "profit_run", "category", "intensity", "members",
                     "kph", "time_min", "inputs/outputs qty+unit", "req_skills"],
            "derived": ["recomputed", "gp_hr (recurring = value*60/time)", "gp_hr_live", "sd", "cv",
                        "sd_poisson", "cv_poisson", "luck_share", "hours_to_10pct", "variance_driver",
                        "risk_adj"],
            "assumed": ["band thresholds", "effort", "skill", "risk penalty 0.5 sd",
                        "variance model thresholds"],
        },
    }
