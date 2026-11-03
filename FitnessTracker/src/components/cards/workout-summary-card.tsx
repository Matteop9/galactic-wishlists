"use client";

import { useState, useTransition } from "react";
import { setSessionRpe } from "@/app/actions";
import { Card } from "./card";
import { fmtSet, type SetOut } from "./index";

type Summary = {
  workoutId?: number;
  name: string;
  date: string;
  durationMin: number;
  totalSets: number;
  volumeLoad: number;
  sessionRpe?: number | null;
  exercises: Array<{ exercise: string; sets: number; topSet: SetOut; e1rm: number }>;
};

export function WorkoutSummaryCard({ output, interactive }: { output: Summary; interactive: boolean }) {
  const [rpe, setRpe] = useState<number | null>(output.sessionRpe ?? null);
  const [pending, start] = useTransition();
  const askRpe = rpe == null && interactive && output.workoutId != null;
  return (
    <Card tone="accent">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="font-semibold">{output.name} done ✓</div>
        <div className="tabular text-xs text-muted">
          {output.durationMin} min · {output.totalSets} sets · {Math.round(output.volumeLoad).toLocaleString()} kg
        </div>
      </div>
      <ul className="divide-y divide-line">
        {output.exercises.map((e) => (
          <li key={e.exercise} className="flex items-center justify-between gap-2 py-1 text-sm">
            <span className="truncate">{e.exercise}</span>
            <span className="tabular shrink-0 text-xs text-muted">
              {e.sets} sets · top {fmtSet(e.topSet)}
              {e.e1rm > 0 ? ` · e1RM ${e.e1rm.toFixed(0)}` : ""}
            </span>
          </li>
        ))}
      </ul>
      {askRpe ? (
        <div className="mt-2">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-muted">How hard was that? (session RPE)</div>
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await setSessionRpe(output.workoutId!, n);
                    setRpe(n);
                  })
                }
                className="tabular h-9 rounded-lg border border-line bg-surface-2 text-xs active:bg-line disabled:opacity-50"
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ) : rpe != null ? (
        <div className="mt-2 text-xs text-muted">Session RPE {rpe}/10</div>
      ) : null}
    </Card>
  );
}
