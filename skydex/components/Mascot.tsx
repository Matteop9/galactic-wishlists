"use client";

import { useEffect, useState, type ReactNode } from "react";

// The field companion (working name Skye — never hard-code the name here; the
// settings card owns the user-facing label). Poses are static SVGs from
// design-handoff/09-skye, copied to public/mascot/; motion is CSS in
// app/globals.css (.sd-mascot--*), gated by prefers-reduced-motion.
//
// Presence rule (research/mascot-design-brief.md §1): moments only. She is
// rendered at defined touchpoints, never on the live viewfinder, and hides
// entirely when the user switches her off in Settings.

export type MascotPose = "idle" | "wave" | "celebrate" | "think" | "sad" | "point";

export const MASCOT_KEY = "skydex_mascot"; // localStorage; "0" = off, anything else = on
export const MASCOT_EVENT = "skydex:mascot-changed";

export function readMascotEnabled(): boolean {
  try {
    return localStorage.getItem(MASCOT_KEY) !== "0";
  } catch {
    return true;
  }
}

export function writeMascotEnabled(on: boolean) {
  try {
    localStorage.setItem(MASCOT_KEY, on ? "1" : "0");
  } catch {
    /* private mode — the toggle just won't persist */
  }
  window.dispatchEvent(new Event(MASCOT_EVENT));
}

/**
 * true/false once known on the client; null during SSR + first paint so
 * callers can avoid a hydration mismatch (render nothing until known).
 */
export function useMascotEnabled(): boolean | null {
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => {
    const sync = () => setOn(readMascotEnabled());
    // Deferred a tick so this isn't a synchronous setState inside the effect.
    const t = setTimeout(sync, 0);
    window.addEventListener(MASCOT_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      clearTimeout(t);
      window.removeEventListener(MASCOT_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return on;
}

export default function Mascot({
  pose,
  size = 48,
  className = "",
  fallback = null,
  still = false,
}: {
  pose: MascotPose;
  /** Rendered box in px (SVGs are 64×64). */
  size?: number;
  className?: string;
  /** Shown instead when the companion is switched off (e.g. the old luggage tag). */
  fallback?: ReactNode;
  /** Skip the pose's motion class (e.g. several on one screen — never happens by rule, but cheap). */
  still?: boolean;
}) {
  const on = useMascotEnabled();
  if (on === null) return null;
  if (!on) return <>{fallback}</>;

  const motion = still ? "" : `sd-mascot--${pose}`;
  return (
    <span
      className={`sd-mascot ${motion} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/mascot/${pose}.svg`} alt="" width={size} height={size} />
      {pose === "idle" && (
        // Blink: the closed-eye frame crossfades in for ~150 ms every ~5 s.
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/mascot/idle-blink.svg" alt="" width={size} height={size} className="sd-mascot__blink" />
      )}
    </span>
  );
}
