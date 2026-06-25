"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";

type Row = {
  user_id: string;
  handle: string | null;
  avatar_seed: string | null;
  is_admin: boolean | null;
  value: number;
  rank: number;
};

const METRICS = [
  { key: "spots", label: "Spots", unit: "spots", windowed: true },
  { key: "types", label: "Types", unit: "types", windowed: false },
  { key: "airlines", label: "Airlines", unit: "carriers", windowed: false },
  { key: "airports", label: "Airports", unit: "airports", windowed: false },
  { key: "rarity", label: "Rarity score", unit: "pts", windowed: false },
] as const;

const WINDOWS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "all", label: "All time" },
] as const;

const MEDAL = ["🥇", "🥈", "🥉"];

export default function LeaderboardBoard({ currentUserId }: { currentUserId: string | null }) {
  const [metric, setMetric] = useState<(typeof METRICS)[number]["key"]>("spots");
  const [window, setWindow] = useState<(typeof WINDOWS)[number]["key"]>("all");
  const [data, setData] = useState<{ key: string; rows: Row[] } | null>(null);

  const active = METRICS.find((m) => m.key === metric)!;
  const win = active.windowed ? window : "all";
  const key = `${metric}:${win}`;

  useEffect(() => {
    const [m, w] = key.split(":");
    let cancelled = false;
    createClient()
      .rpc("leaderboard", { p_metric: m, p_window: w })
      .then(({ data: d }) => {
        if (!cancelled) setData({ key, rows: (d as Row[]) ?? [] });
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const loading = data?.key !== key;
  const rows = data?.rows ?? [];

  const pill = (selected: boolean) =>
    `rounded-full border px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-wide transition-colors ${
      selected
        ? "border-ink bg-ink text-paper"
        : "border-paper-edge bg-transparent text-ink-soft hover:border-ink"
    }`;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {METRICS.map((m) => (
          <button key={m.key} onClick={() => setMetric(m.key)} className={pill(metric === m.key)}>
            {m.label}
          </button>
        ))}
      </div>

      {active.windowed && (
        <div className="mt-3 flex flex-wrap gap-2">
          {WINDOWS.map((w) => (
            <button key={w.key} onClick={() => setWindow(w.key)} className={pill(window === w.key)}>
              {w.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 overflow-hidden rounded-lg border border-paper-edge">
        {loading ? (
          <p className="px-4 py-6 text-center text-sm text-ink-faint">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-ink-faint">No spotters on the board yet.</p>
        ) : (
          <ul className="divide-y divide-paper-edge">
            {rows.map((r) => {
              const me = r.user_id === currentUserId;
              return (
                <li
                  key={r.user_id}
                  className={`flex items-center gap-3 px-4 py-2.5 ${me ? "bg-sky/10" : ""}`}
                >
                  <span className="w-7 shrink-0 text-center font-display text-sm font-bold tabular-nums text-ink-soft">
                    {r.rank <= 3 ? MEDAL[r.rank - 1] : r.rank}
                  </span>
                  <Avatar seed={r.avatar_seed ?? r.handle} admin={Boolean(r.is_admin)} size={26} />
                  <span className="flex-1 truncate font-mono text-sm text-ink">
                    {r.handle ? (
                      <Link href={`/u/${r.handle}`} className="hover:underline">
                        @{r.handle}
                      </Link>
                    ) : (
                      "@spotter"
                    )}
                    {me && <span className="ml-1 text-sky">· you</span>}
                  </span>
                  <span className="font-display text-lg font-bold tabular-nums text-ink">
                    {r.value}
                    <span className="ml-1 font-mono text-[10px] uppercase tracking-wide text-ink-faint">
                      {active.unit}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
