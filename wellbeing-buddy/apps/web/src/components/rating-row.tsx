"use client";

interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
  low?: string;
  high?: string;
}

export default function RatingRow({ label, value, onChange, low = "low", high = "high" }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-[var(--color-text-muted)]">{value}/5</span>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 h-10 rounded-lg text-sm font-medium transition-colors border ${
              value === n
                ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
        <span>{low}</span><span>{high}</span>
      </div>
    </div>
  );
}
