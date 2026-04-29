"use client";

import { useState } from "react";
import RatingRow from "@/components/rating-row";
import { submitMorningCheckin } from "./actions";

interface Props {
  sleepHours: number | null;
  hrv: number | null;
}

export default function MorningCheckinForm({ sleepHours, hrv }: Props) {
  const [loading, setLoading] = useState(false);
  const [energy, setEnergy] = useState(3);
  const [soreness, setSoreness] = useState(3);
  const [mood, setMood] = useState(3);
  const [gymAccess, setGymAccess] = useState(true);
  const [availableMinutes, setAvailableMinutes] = useState(60);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await submitMorningCheckin(fd);
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold mb-1">Morning check-in</h1>
      <p className="text-[var(--color-text-muted)] text-sm mb-6">How are you feeling?</p>

      {(sleepHours || hrv) && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 mb-8 flex gap-6">
          {sleepHours && (
            <div>
              <p className="text-xs text-[var(--color-text-muted)]">Sleep</p>
              <p className="text-lg font-semibold">{sleepHours}h</p>
            </div>
          )}
          {hrv && (
            <div>
              <p className="text-xs text-[var(--color-text-muted)]">HRV</p>
              <p className="text-lg font-semibold">{Math.round(hrv)} ms</p>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <input type="hidden" name="energy" value={energy} />
        <input type="hidden" name="soreness" value={soreness} />
        <input type="hidden" name="mood" value={mood} />
        <input type="hidden" name="gym_access" value={String(gymAccess)} />
        <input type="hidden" name="available_minutes" value={availableMinutes} />

        <RatingRow label="Energy" value={energy} onChange={setEnergy} low="drained" high="great" />
        <RatingRow label="Soreness" value={soreness} onChange={setSoreness} low="none" high="bad" />
        <RatingRow label="Mood" value={mood} onChange={setMood} low="low" high="great" />

        <div className="space-y-2">
          <span className="text-sm font-medium">Gym access today?</span>
          <div className="flex gap-3">
            {[true, false].map((val) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => setGymAccess(val)}
                className={`flex-1 py-2.5 rounded-lg text-sm border transition-colors ${
                  gymAccess === val
                    ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                    : "border-[var(--color-border)] text-[var(--color-text-muted)]"
                }`}
              >
                {val ? "Yes" : "No"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-medium">Available time</span>
            <span className="text-xs text-[var(--color-text-muted)]">{availableMinutes} min</span>
          </div>
          <input
            type="range" min={15} max={180} step={15} value={availableMinutes}
            onChange={(e) => setAvailableMinutes(Number(e.target.value))}
            className="w-full accent-[var(--color-accent)]"
          />
          <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
            <span>15 min</span><span>3 hrs</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[var(--color-accent)] text-white py-3 font-medium hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
        >
          {loading ? "Getting your plan…" : "Let's go"}
        </button>
      </form>
    </div>
  );
}
