"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RatingRow from "@/components/rating-row";
import { submitEveningCheckin } from "./actions";

const ACTIVITY_OPTIONS = ["Gym", "Walk", "Run", "Sauna", "Rest", "Other"];

export default function EveningCheckinPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [stress, setStress] = useState(3);
  const [foodQuality, setFoodQuality] = useState(3);
  const [soreness, setSoreness] = useState(3);
  const [alcoholUnits, setAlcoholUnits] = useState(0);
  const [activity, setActivity] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await submitEveningCheckin(fd);
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold mb-1">Evening check-in</h1>
      <p className="text-[var(--color-text-muted)] text-sm mb-8">How was today?</p>

      <form onSubmit={handleSubmit} className="space-y-8">
        <input type="hidden" name="mood" value={mood} />
        <input type="hidden" name="energy" value={energy} />
        <input type="hidden" name="stress" value={stress} />
        <input type="hidden" name="food_quality" value={foodQuality} />
        <input type="hidden" name="soreness" value={soreness} />
        <input type="hidden" name="alcohol_units" value={alcoholUnits} />

        <RatingRow label="Mood" value={mood} onChange={setMood} low="low" high="great" />
        <RatingRow label="Energy" value={energy} onChange={setEnergy} low="drained" high="strong" />
        <RatingRow label="Stress" value={stress} onChange={setSoreness} low="calm" high="maxed" />
        <RatingRow label="Food quality" value={foodQuality} onChange={setFoodQuality} low="poor" high="clean" />
        <RatingRow label="Soreness" value={soreness} onChange={setSoreness} low="none" high="bad" />

        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-medium">Alcohol units</span>
            <span className="text-xs text-[var(--color-text-muted)]">{alcoholUnits}</span>
          </div>
          <input
            type="range" min={0} max={10} value={alcoholUnits}
            onChange={(e) => setAlcoholUnits(Number(e.target.value))}
            className="w-full accent-[var(--color-accent)]"
          />
          <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
            <span>0</span><span>10+</span>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">What did you do today?</span>
          <div className="flex flex-wrap gap-2">
            {ACTIVITY_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setActivity(opt === activity ? "" : opt)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  activity === opt
                    ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                    : "border-[var(--color-border)] text-[var(--color-text-muted)]"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <input type="hidden" name="actual_activity" value={activity} />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[var(--color-accent)] text-white py-3 font-medium hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
        >
          {loading ? "Generating tomorrow's plan…" : "Done — see tomorrow's plan"}
        </button>
      </form>
    </div>
  );
}
