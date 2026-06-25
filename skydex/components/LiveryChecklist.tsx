"use client";

import { useMemo, useState } from "react";
import { normalizeReg, type SpecialLivery } from "@/lib/specialLiveries";

type Filter = "all" | "collected" | "missing";

// The full special-livery checklist (~2,000 airframes across ~390 airlines).
// At this scale search + an All·Collected·Missing filter matter, so this is a
// dedicated client component rather than the generic CollectionGrid. Liveries are
// grouped by airline; collected ones are lit (brass), the rest greyed.
export default function LiveryChecklist({
  liveries,
  collected,
}: {
  liveries: SpecialLivery[];
  // Normalised registrations the viewer has spotted.
  collected: string[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const collectedSet = useMemo(() => new Set(collected), [collected]);
  const q = query.trim().toLowerCase();

  const groups = useMemo(() => {
    const byAirline = new Map<string, { livery: SpecialLivery; got: boolean }[]>();
    for (const l of liveries) {
      const got = collectedSet.has(normalizeReg(l.reg));
      if (filter === "collected" && !got) continue;
      if (filter === "missing" && got) continue;
      if (
        q &&
        !`${l.airline} ${l.livery} ${l.reg} ${l.type}`.toLowerCase().includes(q)
      )
        continue;
      const arr = byAirline.get(l.airline) ?? [];
      arr.push({ livery: l, got });
      byAirline.set(l.airline, arr);
    }
    return [...byAirline.entries()]
      .map(([airline, items]) => ({
        airline,
        items: items.sort((a, b) => a.livery.reg.localeCompare(b.livery.reg)),
        got: items.filter((i) => i.got).length,
      }))
      .sort((a, b) => a.airline.localeCompare(b.airline));
  }, [liveries, collectedSet, filter, q]);

  const shownCount = groups.reduce((n, g) => n + g.items.length, 0);

  const pill = (active: boolean) =>
    `rounded-full border px-3 py-1 font-display text-[11px] font-semibold uppercase tracking-wide transition-colors ${
      active
        ? "border-ink bg-ink text-paper"
        : "border-paper-edge bg-transparent text-ink-soft hover:border-ink"
    }`;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {(["all", "collected", "missing"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={pill(filter === f)}>
              {f}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search airline, livery, registration…"
          className="min-w-0 flex-1 rounded-md border border-paper-edge bg-paper px-3 py-1.5 font-mono text-xs text-ink placeholder:text-ink-faint focus:border-sky focus:outline-none"
        />
      </div>

      <p className="mt-3 font-mono text-[11px] uppercase tracking-wide text-ink-faint">
        {shownCount} {filter === "all" ? "liveries" : `${filter}`}
        {q ? ` matching “${query.trim()}”` : ""}
      </p>

      {groups.length === 0 ? (
        <p className="mt-6 text-sm text-ink-faint">
          {filter === "collected"
            ? "No special liveries collected yet — catch one to light it up."
            : "Nothing matches."}
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {groups.map((g) => (
            <details key={g.airline} className="group rounded-lg border border-paper-edge bg-paper-deep">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-2.5 [&::-webkit-details-marker]:hidden">
                <span className="font-display text-sm font-semibold uppercase tracking-wide text-ink">
                  {g.airline}
                </span>
                <span className="font-mono text-xs text-ink-soft">
                  {g.got}/{g.items.length}
                </span>
                <span
                  aria-hidden
                  className="ml-auto text-ink-soft transition-transform group-open:rotate-180"
                >
                  ▾
                </span>
              </summary>
              <div className="flex flex-wrap gap-2 border-t border-paper-edge px-4 pb-3 pt-3">
                {g.items.map(({ livery, got }) => (
                  <span
                    key={livery.reg}
                    title={`${livery.reg} · ${livery.type}`}
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs ${
                      got
                        ? "border-brass bg-brass-tint font-semibold text-ink"
                        : "border-paper-edge text-ink-faint opacity-60"
                    }`}
                  >
                    {got && <span className="text-brass">✦</span>}
                    <span className="font-mono text-[10px] text-ink-soft">{livery.reg}</span>
                    {livery.livery || "Special livery"}
                  </span>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
