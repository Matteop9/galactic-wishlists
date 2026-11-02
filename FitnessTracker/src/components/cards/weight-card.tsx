"use client";

import { Card } from "./card";

export function WeightCard({ output }: { output: { date: string; weightKg: number; trendKg: number; weeklyRateKg: number | null } }) {
  const r = output.weeklyRateKg;
  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <div className="tabular text-lg font-semibold">{output.weightKg.toFixed(1)} kg</div>
        <div className="tabular text-xs text-muted">{output.date}</div>
      </div>
      <div className="tabular text-xs text-muted">
        Trend {output.trendKg.toFixed(1)} kg
        {r != null && (
          <span className={r < 0 ? "text-accent" : r > 0 ? "text-warn" : ""}>
            {" "}
            · {r > 0 ? "+" : ""}
            {r.toFixed(2)} kg/wk
          </span>
        )}
      </div>
    </Card>
  );
}
