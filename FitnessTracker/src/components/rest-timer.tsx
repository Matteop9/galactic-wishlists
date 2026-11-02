"use client";

import { useEffect, useState } from "react";

export type RestState = { endsAt: number; total: number; label: string } | null;

export function RestTimer({ rest, onDone, onDismiss }: { rest: RestState; onDone: () => void; onDismiss: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!rest) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [rest]);
  useEffect(() => {
    if (!rest) return;
    if (now >= rest.endsAt) {
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {}
      onDone();
    }
  }, [now, rest, onDone]);
  if (!rest) return null;
  const left = Math.max(0, Math.ceil((rest.endsAt - now) / 1000));
  const pct = Math.max(0, Math.min(1, left / rest.total));
  const m = Math.floor(left / 60);
  const s = left % 60;
  return (
    <div className="mx-auto mb-1 flex max-w-xl items-center gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${pct * 100}%` }} />
      </div>
      <div className="tabular w-12 text-right text-sm font-medium">
        {m}:{String(s).padStart(2, "0")}
      </div>
      <button onClick={onDismiss} className="text-xs text-muted" aria-label="Dismiss rest timer">
        skip
      </button>
    </div>
  );
}
