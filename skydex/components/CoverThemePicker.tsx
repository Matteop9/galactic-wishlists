"use client";

import { useState, useTransition } from "react";
import { COVER_THEMES, type CoverTheme } from "@/lib/coverThemes";
import { updateCoverTheme } from "@/app/profile/actions";

/** Settings: pick the profile banner's sky. Four preset gradients, each preview
 *  carrying the cover band's plane so it reads as "your banner", not a swatch. */
export default function CoverThemePicker({ initial }: { initial: string }) {
  const [theme, setTheme] = useState<string>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pick(key: CoverTheme) {
    if (key === theme || pending) return;
    const prev = theme;
    setTheme(key);
    setError(null);
    startTransition(async () => {
      const res = await updateCoverTheme(key);
      if (res.error) {
        setTheme(prev);
        setError(res.error);
      }
    });
  }

  return (
    <div className="mt-6 rounded-lg border border-paper-edge p-4">
      <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-ink">
        Profile banner
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Pick the sky behind your profile&apos;s flight chart.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.keys(COVER_THEMES) as CoverTheme[]).map((key) => {
          const t = COVER_THEMES[key];
          const active = key === theme;
          return (
            <button
              key={key}
              type="button"
              onClick={() => pick(key)}
              disabled={pending}
              aria-pressed={active}
              className={`relative h-16 overflow-hidden rounded-lg border-2 transition-transform ${
                active ? "border-ink" : "border-paper-edge hover:-translate-y-0.5"
              }`}
              style={{ background: `linear-gradient(to right, ${t.from}, ${t.to})` }}
            >
              <svg
                aria-hidden
                className="absolute right-2 top-1.5 rotate-[62deg]"
                width="26"
                height="26"
                viewBox="0 0 64 64"
                fill="var(--color-paper)"
                fillOpacity="0.65"
              >
                <path d="M32 8 l3.5 21 l25 10 l0 5 l-25 -6.5 l-2.5 12 l7 5.5 l0 3 l-8 -2.5 l-8 2.5 l0 -3 l7 -5.5 l-2.5 -12 l-25 6.5 l0 -5 l25 -10 z" />
              </svg>
              <span className="absolute bottom-1.5 left-2 font-display text-[11px] font-bold uppercase tracking-wider text-paper/90">
                {t.label}
                {active ? " ✓" : ""}
              </span>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-sm text-stamp">{error}</p>}
    </div>
  );
}
