"use client";

import { Card } from "./card";
import { fmtSet, type SetOut } from "./index";

type Summary = {
  name: string;
  date: string;
  durationMin: number;
  totalSets: number;
  volumeLoad: number;
  exercises: Array<{ exercise: string; sets: number; topSet: SetOut; e1rm: number }>;
};

export function WorkoutSummaryCard({ output }: { output: Summary }) {
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
          <li key={e.exercise} className="flex items-center justify-between py-1 text-sm">
            <span className="truncate">{e.exercise}</span>
            <span className="tabular text-xs text-muted">
              {e.sets} sets · top {fmtSet(e.topSet)}
              {e.e1rm > 0 ? ` · e1RM ${e.e1rm.toFixed(0)}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
