"""Official hiscores. Uses the JSON endpoint so activities arrive named (no positional parsing)."""
from .common import fetch, log

URL = "https://secure.runescape.com/m=hiscore_oldschool/index_lite.json?player={player}"


def get_hiscores(player: str, **kw) -> dict:
    d = fetch(URL.format(player=player), "hiscores.json", kind="json", **kw)
    skills = {s["name"]: {"rank": s["rank"], "level": s["level"], "xp": s["xp"]} for s in d["skills"]}
    acts = {a["name"]: {"rank": a["rank"], "score": a["score"]} for a in d["activities"]}
    kc = {k: v["score"] for k, v in acts.items() if v["score"] > 0}
    log("hiscores", f"{player}: {len(skills)} skills, {len(acts)} activities, {len(kc)} with a score")
    return {"skills": skills, "activities": acts, "kc": kc}
