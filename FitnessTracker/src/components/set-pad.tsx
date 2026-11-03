"use client";

import { useState, useTransition } from "react";
import { logSetFromPad, switchExercise, type QuickLogResult, type SwitchResult } from "@/app/actions";
import type { PadData } from "@/lib/pad";

type Logged = Extract<QuickLogResult, { handled: true }>;
type Switched = Extract<SwitchResult, { ok: true }>;

const TYPES: Array<{ key: string; label: string }> = [
  { key: "warmup", label: "W-up" },
  { key: "working", label: "Work" },
  { key: "drop", label: "Drop" },
];

function round(n: number, step: number) {
  return Math.round(n / step) * step;
}

/**
 * Tap-to-log pad for the current exercise. Logs with no model call; the
 * result shows as the usual set card. Keyed by exercise so it resets on change.
 */
export function SetPad({
  pad,
  busy,
  onLogged,
  onSwitched,
  onAllDone,
  onFinish,
  onOther,
}: {
  pad: PadData;
  busy: boolean;
  onLogged: (r: Logged) => void;
  onSwitched: (r: Switched) => void;
  onAllDone: () => void;
  onFinish: () => void;
  onOther: () => void;
}) {
  const cur = pad.current;
  const [open, setOpen] = useState(true);
  const [pending, start] = useTransition();

  const seed = cur?.last ?? (cur?.suggested ? { weightKg: cur.suggested.weightKg, reps: cur.suggested.reps, rir: cur.suggested.rir } : cur?.previous ? { ...cur.previous.top } : null);
  const [weight, setWeight] = useState<number>(seed?.weightKg ?? 0);
  const [reps, setReps] = useState<number>(seed?.reps ?? cur?.repMin ?? 8);
  const [rir, setRir] = useState<number | null>(cur?.last?.rir ?? cur?.targetRir ?? null);
  const [type, setType] = useState<string>(cur?.last ? "working" : "working");
  const [side, setSide] = useState<"L" | "R" | null>(null);

  if (!cur) {
    return (
      <div className="mx-auto mb-1 flex max-w-xl items-center justify-between rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-muted">
        <span>{pad.name} · no exercise yet</span>
        <button type="button" disabled={pending || busy} onClick={() => start(async () => handleSwitch(await switchExercise(null)))} className="rounded-lg bg-accent px-3 py-1.5 font-medium text-black disabled:opacity-40">
          Start first exercise
        </button>
      </div>
    );
  }

  const step = cur.incrementKg || 2.5;
  const complete = cur.done >= cur.sets;

  function handleSwitch(r: SwitchResult) {
    if (r.ok) onSwitched(r);
    else if (r.reason === "all_done") onAllDone();
  }

  const log = () =>
    start(async () => {
      const r = await logSetFromPad(cur.exerciseId, { weightKg: weight, reps, rir, setType: type, partialReps: 0, side });
      if (r.handled) {
        onLogged(r);
        if (type === "warmup") setType("working");
      }
    });

  return (
    <div className="mx-auto mb-1 max-w-xl rounded-xl border border-line bg-surface-2 px-3 py-2">
      <div className="flex items-center gap-2">
        <select
          value={cur.exerciseId}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "__other") return onOther();
            start(async () => handleSwitch(await switchExercise(Number(v))));
          }}
          className="min-w-0 flex-1 truncate bg-transparent text-sm font-medium outline-none"
          aria-label="Current exercise"
        >
          {!pad.plan.some((p) => p.exerciseId === cur.exerciseId) && <option value={cur.exerciseId}>{cur.name}</option>}
          {pad.plan.map((p) => (
            <option key={p.exerciseId} value={p.exerciseId}>
              {p.name} {p.done}/{p.sets}
            </option>
          ))}
          <option value="__other">Other exercise…</option>
        </select>
        <span className={`tabular shrink-0 text-xs ${complete ? "text-accent" : "text-muted"}`}>
          {complete ? "done" : `set ${cur.done + 1}/${cur.sets}`} · {cur.repMin}-{cur.repMax} @{cur.targetRir}
        </span>
        <button type="button" onClick={() => setOpen((o) => !o)} className="shrink-0 px-1 text-muted" aria-label={open ? "Collapse pad" : "Expand pad"}>
          {open ? "▾" : "▸"}
        </button>
      </div>

      {open && (
        <>
          {(cur.previous || cur.suggested) && (
            <div className="mt-0.5 text-[11px] text-muted">
              {cur.previous ? `last ${cur.previous.top.weightKg}×${cur.previous.top.reps}${cur.previous.top.rir != null ? ` @${cur.previous.top.rir}` : ""}` : "first time"}
              {cur.suggested ? ` · aim ${cur.suggested.weightKg}×${cur.suggested.reps}` : ""}
            </div>
          )}

          <div className="mt-2 flex items-end gap-2">
            <Stepper label="kg" value={weight} onChange={setWeight} step={step} min={0} format={(v) => (v === 0 ? "BW" : String(round(v, 0.25)))} />
            <Stepper label="reps" value={reps} onChange={setReps} step={1} min={0} />
            <button type="button" onClick={log} disabled={pending || busy || reps <= 0} className="h-10 min-w-0 flex-1 whitespace-nowrap rounded-xl bg-accent px-3 text-sm font-medium text-black disabled:opacity-40">
              Log set
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1">
            <span className="mr-0.5 text-[10px] uppercase tracking-wide text-muted">RIR</span>
            {[0, 1, 2, 3, 4].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRir(rir === r ? null : r)}
                className={`tabular h-8 w-8 rounded-lg border text-xs ${rir === r ? "border-accent bg-accent/15 text-fg" : "border-line bg-surface text-muted"}`}
              >
                {r}
              </button>
            ))}
            <span className="mx-1 h-5 w-px bg-line" />
            {TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setType(t.key)}
                className={`h-8 rounded-lg border px-2 text-[11px] ${type === t.key ? "border-accent bg-accent/15" : "border-line bg-surface text-muted"}`}
              >
                {t.label}
              </button>
            ))}
            {cur.isUnilateral &&
              (["L", "R"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSide(side === s ? null : s)}
                  className={`h-8 w-8 rounded-lg border text-[11px] ${side === s ? "border-accent bg-accent/15" : "border-line bg-surface text-muted"}`}
                >
                  {s}
                </button>
              ))}
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[11px]">
            <button type="button" disabled={pending || busy} onClick={() => start(async () => handleSwitch(await switchExercise(null)))} className="py-1 text-accent disabled:opacity-40">
              Next exercise ▸
            </button>
            <button type="button" disabled={pending || busy} onClick={onFinish} className="py-1 text-muted disabled:opacity-40">
              Finish session
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Stepper({ label, value, onChange, step, min, format }: { label: string; value: number; onChange: (v: number) => void; step: number; min: number; format?: (v: number) => string }) {
  return (
    <div className="flex flex-col">
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-0.5 flex items-center overflow-hidden rounded-lg border border-line bg-surface">
        <button type="button" onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))} className="h-10 w-8 text-lg text-muted active:bg-line" aria-label={`Decrease ${label}`}>
          −
        </button>
        <input
          type="text"
          inputMode="decimal"
          value={format ? format(value) : String(value)}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            if (!Number.isNaN(n)) onChange(Math.max(min, n));
            else if (e.target.value === "" || e.target.value.toLowerCase() === "bw") onChange(0);
          }}
          className="tabular h-10 w-12 bg-transparent text-center text-base font-semibold outline-none"
          aria-label={label}
        />
        <button type="button" onClick={() => onChange(+(value + step).toFixed(2))} className="h-10 w-8 text-lg text-muted active:bg-line" aria-label={`Increase ${label}`}>
          +
        </button>
      </div>
    </div>
  );
}
