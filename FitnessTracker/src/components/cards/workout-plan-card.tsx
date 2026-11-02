"use client";

import { Card } from "./card";
import { fmtSet, type SetOut } from "./index";

type Plan = {
  workoutId: number;
  name: string;
  plan: Array<{
    exercise: string;
    sets: number;
    repRange: string;
    targetRir: number;
    technique: string | null;
    restS: number;
    last: { date: string; sets: SetOut[] } | null;
    suggested: { weightKg: number; reps: number; rir: number; reason: string } | null;
  }>;
};

const TECH: Record<string, string> = { lengthened_partials: "LP", myo_reps: "myo", drop_set: "drop" };

export function WorkoutPlanCard({ output }: { output: Plan }) {
  return (
    <Card tone="accent">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="font-semibold">{output.name}</div>
        <div className="text-xs text-muted">{output.plan.length} exercises</div>
      </div>
      <ol className="divide-y divide-line">
        {output.plan.map((p, i) => {
          const top = p.last?.sets.filter((s) => s.setType !== "warmup").reduce((b, s) => (s.weightKg * s.reps > b.weightKg * b.reps ? s : b), p.last.sets[0]);
          return (
            <li key={i} className="flex items-center gap-2 py-1.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{p.exercise}</div>
                <div className="text-[11px] text-muted">
                  {p.sets}×{p.repRange} @{p.targetRir}
                  {p.technique ? ` · ${TECH[p.technique] ?? p.technique}` : ""} · rest {Math.round(p.restS / 60)}m
                </div>
              </div>
              <div className="text-right text-xs">
                {top ? <div className="text-muted">last {fmtSet(top)}</div> : <div className="text-muted">first time</div>}
                {p.suggested && p.suggested.weightKg > 0 && (
                  <div className="tabular text-accent">
                    → {p.suggested.weightKg} × {p.suggested.reps}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
