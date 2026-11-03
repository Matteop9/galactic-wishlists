"use client";

import { useState } from "react";

const TIMES = [30, 45, 60, 75, 90];
const ENERGY = ["💀", "😮‍💨", "😐", "🙂", "🔥"];

/** Pre-session check-in: energy, time, niggles → one message the coach plans from. */
export function CheckinSheet({ workoutName, onSubmit, onClose }: { workoutName: string; onSubmit: (text: string) => void; onClose: () => void }) {
  const [energy, setEnergy] = useState<number | null>(null);
  const [time, setTime] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const go = () => {
    const bits = [`Start ${workoutName}.`];
    if (energy) bits.push(`Energy ${energy}/5.`);
    if (time) bits.push(`${time} min available.`);
    if (notes.trim()) bits.push(notes.trim());
    onSubmit(bits.join(" "));
  };

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div className="pb-safe w-full max-w-xl rounded-t-3xl border border-line bg-surface px-4 pt-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-baseline justify-between">
          <div className="font-semibold">{workoutName}</div>
          <button onClick={onClose} className="text-xs text-muted">cancel</button>
        </div>

        <div className="mb-1 text-xs text-muted">Energy</div>
        <div className="mb-3 grid grid-cols-5 gap-1.5">
          {ENERGY.map((e, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setEnergy(i + 1)}
              className={`h-12 rounded-xl border text-xl ${energy === i + 1 ? "border-accent bg-accent/15" : "border-line bg-surface-2"}`}
              aria-label={`Energy ${i + 1} of 5`}
            >
              {e}
            </button>
          ))}
        </div>

        <div className="mb-1 text-xs text-muted">Time available</div>
        <div className="mb-3 grid grid-cols-5 gap-1.5">
          {TIMES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTime(t)}
              className={`tabular h-11 rounded-xl border text-sm ${time === t ? "border-accent bg-accent/15" : "border-line bg-surface-2"}`}
            >
              {t}
              {t === TIMES.at(-1) ? "+" : ""}
            </button>
          ))}
        </div>

        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything sore, or a constraint? (optional)"
          className="mb-3 h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-[16px] outline-none focus:border-accent"
        />

        <button type="button" onClick={go} className="mb-2 h-12 w-full rounded-xl bg-accent font-medium text-black">
          Start session
        </button>
      </div>
    </div>
  );
}
