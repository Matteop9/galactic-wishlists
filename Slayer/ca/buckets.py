"""Boss -> route bucket (brief section 5). Keys are CA-table boss names exactly."""
from fetch.common import log

SLAYER = "Slayer"
LAB = "Like a Boss"
END = "End-game"
ANY = "Anytime"

BUCKET = {
    # Slayer (counts on a regular task)
    "Alchemical Hydra": SLAYER, "Araxxor": SLAYER, "Thermonuclear Smoke Devil": SLAYER, "Cerberus": SLAYER,
    "Abyssal Sire": SLAYER, "Kraken": SLAYER, "Grotesque Guardians": SLAYER, "Skotizo": SLAYER,
    "Dagannoth Prime": SLAYER, "Dagannoth Rex": SLAYER, "Dagannoth Supreme": SLAYER, "Kalphite Queen": SLAYER,
    "King Black Dragon": SLAYER, "Brutal Black Dragon": SLAYER, "Black Dragon": SLAYER, "Vorkath": SLAYER,
    "TzTok-Jad": SLAYER, "TzKal-Zuk": SLAYER, "TzHaar-Ket-Rak's Challenges": SLAYER, "Scurrius": SLAYER,
    "Vet'ion": SLAYER, "Scorpia": SLAYER, "Callisto": SLAYER, "Tormented Demon": SLAYER, "Basilisk Knight": SLAYER,
    "Demonic Gorilla": SLAYER, "Lizardman Shaman": SLAYER,
    # regular slayer monsters with CA tasks
    "Aberrant Spectre": SLAYER, "Bloodveld": SLAYER, "Fire Giant": SLAYER, "Gargoyle": SLAYER, "Greater Demon": SLAYER,
    "Hellhound": SLAYER, "Kurask": SLAYER, "Skeletal Wyvern": SLAYER, "Wyrm": SLAYER,
    # brief said verify: wiki Boss Slayer page lists Royal Titans (Eldric/Branda) on ice/fire giant tasks,
    # and Shellbane gryphon as the gryphon-task boss. Both moved to Slayer. JUDGEMENT CALL, flagged in report.
    "Royal Titans": SLAYER, "Shellbane gryphon": SLAYER, "Amoxliatl": SLAYER,
    # Like a Boss only
    "General Graardor": LAB, "Commander Zilyana": LAB, "Kree'arra": LAB, "K'ril Tsutsaroth": LAB,
    "Phantom Muspah": LAB, "Zulrah": LAB, "Chaos Elemental": LAB, "Chaos Fanatic": LAB,
    "Crazy Archaeologist": LAB, "Giant Mole": LAB, "Sarachnis": LAB, "Barrows": LAB, "Venenatis": LAB,
    "Duke Sucellus": LAB, "Leviathan": LAB, "Vardorvis": LAB, "Whisperer": LAB, "Maggot King": LAB,
    # Nex is in the brief's LaB list but NOT in the wiki Boss Slayer pool -> Anytime. JUDGEMENT CALL.
    "Nex": ANY,
    # End-game
    "Chambers of Xeric": END, "Chambers of Xeric: Challenge Mode": END,
    "Tombs of Amascut": END, "Tombs of Amascut: Entry Mode": END, "Tombs of Amascut: Expert Mode": END,
    "Theatre of Blood": END, "Theatre of Blood: Entry Mode": END, "Theatre of Blood: Hard Mode": END,
    "Crystalline Hunllef": END, "Corrupted Hunllef": END, "Yama": END, "The Nightmare": END,
    "Phosani's Nightmare": END, "Doom of Mokhaiotl": END, "Corporeal Beast": END, "Fortis Colosseum": END,
    "Zalcano": END, "Fragment of Seren": END, "Galvek": END, "Glough": END, "The Mimic": END,
    # Anytime
    "The Hueycoatl": ANY, "Moons of Peril": ANY, "Mad Angel": ANY, "Hespori": ANY, "Obor": ANY,
    "Bryophyta": ANY, "Deranged Archaeologist": ANY, "Wintertodt": ANY, "Tempoross": ANY, "Brutus": ANY,
    "Giants": ANY, "N/A": ANY,
}
ORDER = [SLAYER, LAB, END, ANY]


def bucket_of(boss: str) -> str:
    return BUCKET.get(boss, ANY)


def group(chosen: list[dict], all_tasks: list[dict]) -> dict:
    unknown = sorted({t["boss"] for t in all_tasks if t["boss"] not in BUCKET})
    if unknown:
        log("buckets", f"bosses with no bucket, defaulted to Anytime: {unknown}")
    out = {b: {} for b in ORDER}
    for t in chosen:
        b = out[bucket_of(t["boss"])].setdefault(t["boss"], {"tasks": [], "pts": 0, "min_pct": None})
        b["tasks"].append(t)
        b["pts"] += t["pts"]
        p = t["comp_pct"] if t["comp_pct"] is not None else 0
        b["min_pct"] = p if b["min_pct"] is None else min(b["min_pct"], p)
    for bk in ORDER:
        n = sum(len(v["tasks"]) for v in out[bk].values())
        pts = sum(v["pts"] for v in out[bk].values())
        log("buckets", f"{bk}: {len(out[bk])} bosses, {n} tasks, {pts} pts")
    return {"groups": out, "unknown": unknown}
