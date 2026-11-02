"""WikiSync: combat achievement IDs done, levels, quests, diaries. Needs the RuneLite plugin on."""
from .common import fetch, log

URL = "https://sync.runescape.wiki/runelite/player/{player}/STANDARD"


def get_wikisync(player: str, **kw) -> dict:
    d = fetch(URL.format(player=player), "wikisync.json", kind="json", **kw)
    ids = sorted(d.get("combat_achievements", []))
    log("wikisync", f"{player}: {len(ids)} CA ids done, snapshot {d.get('timestamp')}")
    return {
        "timestamp": d.get("timestamp"),
        "ca_ids": ids,
        "levels": d.get("levels", {}),
        "quests": d.get("quests", {}),
        "diaries": d.get("achievement_diaries", {}),
    }
