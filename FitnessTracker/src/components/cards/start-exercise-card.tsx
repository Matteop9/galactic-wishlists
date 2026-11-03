"use client";

import type { PadExercise } from "@/lib/pad";
import { Card } from "./card";

const TECH: Record<string, string> = { lengthened_partials: "lengthened partials on the last set", myo_reps: "myo-reps on the last set", drop_set: "drop set to finish" };

/** "Now on: X" — the prescription, last time, and today's aim. The pad below the chat does the logging. */
export function StartExerciseCard({ output }: { output: PadExercise }) {
  const prev = output.previous;
  return (
    <Card tone="accent">
      <div className="text-[11px] uppercase tracking-wide text-accent">Now</div>
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0 truncate font-semibold">{output.name}</div>
        <div className="tabular shrink-0 text-xs text-muted">
          {output.sets}×{output.repMin}-{output.repMax} @{output.targetRir} · rest {Math.round(output.restS / 60)}m
        </div>
      </div>
      <div className="tabular mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
        {prev ? (
          <span>
            last {prev.top.weightKg === 0 ? "BW" : `${prev.top.weightKg} kg`} × {prev.top.reps}
            {prev.top.rir != null ? ` @${prev.top.rir}` : ""} ({prev.sets} sets, {prev.date})
          </span>
        ) : (
          <span>first time on this one</span>
        )}
        {output.suggested && (
          <span className="text-accent">
            → {output.suggested.weightKg === 0 ? "BW" : `${output.suggested.weightKg} kg`} × {output.suggested.reps}
          </span>
        )}
      </div>
      {output.technique && TECH[output.technique] && <div className="mt-0.5 text-[11px] text-muted">{TECH[output.technique]}</div>}
    </Card>
  );
}
