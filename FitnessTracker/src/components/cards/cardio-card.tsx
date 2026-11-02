"use client";

import { Card } from "./card";

type Session = {
  date: string;
  machine: string;
  kind: string;
  durationMin: number;
  distanceKm: number | null;
  inclinePct: number | null;
  level: number | null;
  avgSpeedKmh: number | null;
  paceMinPerKm: number | null;
  calories: number | null;
  rpe: number | null;
};

function pace(p: number | null) {
  if (!p) return null;
  const m = Math.floor(p);
  const s = Math.round((p - m) * 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

export function CardioCard({ output }: { output: { session: Session; previous: Session | null } }) {
  const s = output.session;
  const p = output.previous;
  const delta = p && s.avgSpeedKmh && p.avgSpeedKmh ? s.avgSpeedKmh - p.avgSpeedKmh : null;
  return (
    <Card className="border-accent-2/50">
      <div className="flex items-baseline justify-between">
        <div className="font-semibold capitalize">
          {s.machine.replace("_", " ")} · {s.kind}
        </div>
        <div className="tabular text-xs text-muted">{s.date}</div>
      </div>
      <div className="tabular mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm">
        <span>{s.durationMin} min</span>
        {s.distanceKm != null && <span>{s.distanceKm} km</span>}
        {s.avgSpeedKmh != null && <span>{s.avgSpeedKmh} km/h</span>}
        {pace(s.paceMinPerKm) && <span>{pace(s.paceMinPerKm)}</span>}
        {s.inclinePct != null && <span>{s.inclinePct}%</span>}
        {s.level != null && <span>L{s.level}</span>}
        {s.calories != null && <span>{s.calories} kcal</span>}
        {s.rpe != null && <span>RPE {s.rpe}</span>}
      </div>
      {p && (
        <div className="mt-1 text-xs text-muted">
          Last {p.machine.replace("_", " ")}: {p.durationMin} min{p.distanceKm != null ? `, ${p.distanceKm} km` : ""}
          {p.rpe != null ? `, RPE ${p.rpe}` : ""}
          {delta != null && (
            <span className={delta > 0 ? "text-accent-2" : ""}>
              {" "}
              · {delta > 0 ? "+" : ""}
              {delta.toFixed(1)} km/h
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
