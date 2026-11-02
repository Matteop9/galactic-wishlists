"use client";

import { Card } from "./card";

export function ProgrammeChangeCard({ name, output }: { name: string; output: Record<string, unknown> }) {
  const title =
    (output.change as string | undefined) ??
    ({
      set_rotation: `Rotation: ${(output.rotation as string[] | undefined)?.join(" → ") ?? ""}`,
      set_cardio_plan: "Cardio plan updated",
      schedule_deload: `Deload week from ${output.weekStart ?? ""}`,
      archive_template: `Archived ${output.archived ?? ""}`,
    }[name] ?? name.replace(/_/g, " "));
  const reason = output.reason as string | undefined;
  return (
    <Card tone="warn">
      <div className="text-[11px] uppercase tracking-wide text-warn">Programme change</div>
      <div className="font-medium">{title}</div>
      {reason && <div className="mt-0.5 text-xs text-muted">{reason}</div>}
      {name === "set_rotation" && output.next ? <div className="mt-0.5 text-xs text-muted">Next: {String(output.next)}</div> : null}
    </Card>
  );
}
