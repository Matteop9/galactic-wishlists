"use client";

import { type ReactNode } from "react";
import Mascot, { useMascotEnabled, type MascotPose } from "@/components/Mascot";

/**
 * The companion plus one short line in a paper speech bubble (≤ 2 sentences,
 * Source Serif, no emoji — brief §6). When she is switched off the line is
 * rendered as plain text instead, so the screen never loses its copy.
 */
export default function MascotSays({
  pose,
  size = 48,
  children,
  className = "",
  plainClassName = "text-ink-soft",
  layout = "row",
}: {
  pose: MascotPose;
  size?: number;
  children: ReactNode;
  className?: string;
  /** Classes for the plain-text fallback when the companion is off. */
  plainClassName?: string;
  /** row = bird left, bubble right (tail on the bubble's left);
   *  stack = bird above, bubble below (tail on top). */
  layout?: "row" | "stack";
}) {
  const on = useMascotEnabled();
  if (on === null) return null;
  if (!on) return <p className={`${plainClassName} ${className}`}>{children}</p>;

  if (layout === "stack") {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        <Mascot pose={pose} size={size} />
        <p className="sd-says sd-says--below max-w-xs text-center font-serif text-sm text-ink">{children}</p>
      </div>
    );
  }
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Mascot pose={pose} size={size} className="shrink-0" />
      <p className="sd-says font-serif text-sm text-ink">{children}</p>
    </div>
  );
}
