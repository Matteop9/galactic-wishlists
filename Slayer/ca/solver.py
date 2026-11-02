"""Required-set solver: forced includes, then descending comp% until the target is met."""
from fetch.common import log


def solve(tasks: list[dict], done_ids: set[int], *, target_total: int,
          forced_include: list[str], forced_exclude: list[str], around: int = 4) -> dict:
    earned = sum(t["pts"] for t in tasks if t["id"] in done_ids)
    target = target_total - earned
    undone = [t for t in tasks if t["id"] not in done_ids]
    by_name = {t["task"]: t for t in undone}
    done_names = {t["task"] for t in tasks if t["id"] in done_ids}

    chosen = []
    for n in forced_include:
        if n in by_name:
            chosen.append(by_name[n])
        elif n in done_names:
            log("solver", f"forced include {n!r} already done, ignored")
        else:
            log("solver", f"forced include {n!r} NOT FOUND in task table")
    for n in forced_exclude:
        if n not in by_name and n not in done_names:
            log("solver", f"forced exclude {n!r} not found in task table")
    excl = set(forced_exclude)
    forced = {t["task"] for t in chosen}
    pool = sorted((t for t in undone if t["task"] not in forced and t["task"] not in excl),
                  key=lambda t: (-(t["comp_pct"] or 0), -t["pts"], t["task"]))
    got = sum(t["pts"] for t in chosen)
    i = 0
    while got < target and i < len(pool):
        chosen.append(pool[i])
        got += pool[i]["pts"]
        i += 1
    if got < target:
        log("solver", f"target {target} NOT reachable: only {got} pts available")
    cutoff = chosen[-1] if chosen else None
    log("solver", f"earned {earned}, need {target}, chosen {len(chosen)} tasks = {got} pts, "
                  f"cutoff {cutoff['comp_pct'] if cutoff else None}% ({cutoff['task'] if cutoff else '-'})")
    return {
        "earned": earned, "target": target, "total": got, "n": len(chosen),
        "chosen": chosen, "chosen_ids": {t["id"] for t in chosen},
        "cutoff_pct": cutoff["comp_pct"] if cutoff else None,
        "last_in": pool[max(0, i - around):i],
        "first_out": pool[i:i + around],
        "next_alternative": pool[i] if i < len(pool) else None,
        "forced_found": sorted(forced), "excluded": sorted(excl),
    }
