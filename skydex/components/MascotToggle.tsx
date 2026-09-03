"use client";

import Mascot, { useMascotEnabled, writeMascotEnabled } from "@/components/Mascot";

/** Settings card: switch the field companion on or off (default on). */
export default function MascotToggle() {
  const on = useMascotEnabled();

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-paper-edge p-4">
      <div className="flex items-center gap-3">
        <Mascot pose="idle" size={44} className="shrink-0" fallback={<span className="inline-block h-11 w-11" />} />
        <div>
          <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-ink">
            Your companion
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Skye turns up at the quiet moments — first run, empty pages, a failed catch, a big one.
            Never on the viewfinder.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => writeMascotEnabled(!(on ?? true))}
        disabled={on === null}
        aria-pressed={on ?? true}
        className={`rounded-full border px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-wide ${
          on === false
            ? "border-paper-edge text-ink-soft hover:border-ink"
            : "border-sky bg-sky text-paper"
        }`}
      >
        {on === false ? "Off" : "On"}
      </button>
    </div>
  );
}
