"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { adjustSet, deleteSet, restoreSet } from "@/app/actions";
import { Card } from "./card";
import { fmtSet, type SetOut } from "./index";

type Output = {
  set: SetOut;
  exercise: string;
  exerciseId?: number;
  e1rm: number;
  prs: Array<{ type: string; value: number; previous: number | null }>;
  setNumber: number;
  warmups?: number;
  plannedSets: number | null;
  restS: number;
  plates: number[] | null;
};

const PR_LABEL: Record<string, string> = { weight: "Heaviest ever", e1rm: "e1RM PR", reps_at_weight: "Rep PR", set_volume: "Volume PR" };

export function SetCard({ output, onRestTimer }: { output: Output; onRestTimer?: (seconds: number, label: string) => void }) {
  const [set, setSet] = useState<SetOut>(output.set);
  const [gone, setGone] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || !onRestTimer) return;
    fired.current = true;
    onRestTimer(output.restS, output.exercise);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Two-step delete: the first tap arms it, and it disarms itself after a moment.
  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(false), 5000);
    return () => clearTimeout(t);
  }, [confirm]);

  if (gone) {
    return (
      <Card tone="muted">
        <div className="flex items-center justify-between">
          <span>Set removed.</span>
          {output.exerciseId != null && (
            <button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const restored = await restoreSet(output.exerciseId!, { ...set, note: (set as { note?: string | null }).note ?? null });
                  setSet(restored);
                  setGone(false);
                })
              }
              className="rounded-lg border border-line px-2.5 py-1 text-xs text-fg"
            >
              Undo
            </button>
          )}
        </div>
      </Card>
    );
  }

  const isPr = output.prs.length > 0;
  const isWarm = set.setType === "warmup";
  const step = output.set.weightKg >= 40 ? 2.5 : 1;

  return (
    <Card tone={isPr ? "pr" : "accent"}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-xs text-muted">
            {output.exercise} ·{" "}
            {isWarm
              ? `warm-up${output.warmups ? ` ${output.warmups}` : ""}`
              : `set ${output.setNumber}${output.plannedSets ? `/${output.plannedSets}` : ""}${set.setType !== "working" ? ` · ${set.setType.replace("_", " ")}` : ""}`}
          </div>
          <div className="tabular text-lg font-semibold">{fmtSet(set)}</div>
        </div>
        {output.e1rm > 0 && (
          <div className="text-right text-xs text-muted">
            e1RM
            <div className="tabular text-sm text-fg">{output.e1rm.toFixed(1)}</div>
          </div>
        )}
      </div>
      {isPr && (
        <div className="mt-1 flex flex-wrap gap-1">
          {output.prs.map((p) => (
            <span key={p.type} className="rounded-full bg-pr/15 px-2 py-0.5 text-[11px] font-medium text-pr">
              🏆 {PR_LABEL[p.type] ?? p.type}
              {p.previous != null ? ` (was ${p.previous})` : ""}
            </span>
          ))}
        </div>
      )}
      {output.plates && output.plates.length > 0 && <div className="mt-1 text-xs text-muted">Plates/side: {output.plates.join(" + ")}</div>}
      <div className="mt-2 flex items-center gap-1.5">
        {/* Delete lives on the LEFT, away from Send, and needs a second tap. */}
        <button
          disabled={pending}
          onClick={() => {
            if (!confirm) return setConfirm(true);
            start(async () => {
              await deleteSet(set.id);
              setGone(true);
              setConfirm(false);
            });
          }}
          className={`rounded-lg px-2.5 py-1.5 text-xs ${confirm ? "bg-danger font-medium text-black" : "border border-line text-muted"}`}
          aria-label={confirm ? "Confirm delete set" : "Delete set"}
        >
          {confirm ? "Delete?" : "✕"}
        </button>
        <div className="ml-auto flex gap-1.5">
          {[
            { key: "w-", label: `−${step}`, patch: { weightDelta: -step } },
            { key: "w+", label: `+${step}`, patch: { weightDelta: step } },
            { key: "r-", label: "−1 rep", patch: { repsDelta: -1 } },
            { key: "r+", label: "+1 rep", patch: { repsDelta: 1 } },
          ].map((b) => (
            <button
              key={b.key}
              disabled={pending}
              onClick={() => start(async () => setSet(await adjustSet(set.id, b.patch)))}
              className="tabular rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs active:bg-line disabled:opacity-50"
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
