"use client";

import { useEffect, useState } from "react";

// Completion donut — echoes the brand's circular rarity-stamp motif with a thin
// dotted inner ring. The progress arc sweeps up from empty on mount (earned,
// never instant); the sweep is skipped under prefers-reduced-motion.

type Props = {
  value: number;
  total: number;
  label?: string;
  size?: number;
  stroke?: number;
  color?: string;
};

export default function ProgressWheel({
  value,
  total,
  label,
  size = 120,
  stroke = 10,
  color = "var(--color-sky)",
}: Props) {
  const cx = size / 2;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, value / total) : 0; // guards /0 and value > total
  const showSub = size >= 88;

  // Start empty, then sweep to the target offset once mounted. rAF in both
  // branches: under reduced-motion the CSS transition is what we skip, and
  // deferring the state flip a frame keeps the effect render-safe.
  const [filled, setFilled] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const id = requestAnimationFrame(() => {
      setReduceMotion(reduce);
      setFilled(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {/* track */}
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--color-paper-edge)" strokeWidth={stroke} />
        {/* dotted inner ring — brand nod */}
        <circle
          cx={cx}
          cy={cx}
          r={Math.max(0, r - stroke)}
          fill="none"
          stroke="var(--color-paper-edge)"
          strokeWidth={1}
          strokeDasharray="1.5 3"
        />
        {/* progress */}
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={filled ? c * (1 - pct) : c}
          transform={`rotate(-90 ${cx} ${cx})`}
          style={{
            transition: reduceMotion
              ? "none"
              : "stroke-dashoffset 0.9s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
        <text
          x={cx}
          y={showSub ? cx - size * 0.04 : cx}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.24}
          style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fill: "var(--color-ink)" }}
        >
          {Math.round(pct * 100)}%
        </text>
        {showSub && (
          <text
            x={cx}
            y={cx + size * 0.17}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={size * 0.12}
            style={{ fontFamily: "var(--font-mono)", fill: "var(--color-ink-soft)" }}
          >
            {value}/{total}
          </text>
        )}
      </svg>
      {label && (
        <span className="font-display text-xs font-semibold uppercase tracking-wide text-ink-soft">
          {label}
        </span>
      )}
    </div>
  );
}
