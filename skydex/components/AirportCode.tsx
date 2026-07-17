"use client";

import { useState } from "react";
import { airportName } from "@/lib/airports";

// Tap an airport code to reveal its full name (feedback: "click on an airport
// code to show full name"). Falls back to a plain, non-interactive code when the
// name isn't in our lookup.
export default function AirportCode({
  code,
  count,
  detail,
  className = "",
}: {
  code: string;
  count?: number;
  /** Extra text revealed alongside the name when open (e.g. "↑3 dep · ↓5 dest"). */
  detail?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const name = airportName(code);
  const suffix = count != null ? ` ${count}` : "";

  if (!name) return <span className={className}>{`${code}${suffix}`}</span>;

  return (
    <button
      type="button"
      title={detail ? `${name} · ${detail}` : name}
      onClick={(e) => {
        e.stopPropagation();
        setOpen((o) => !o);
      }}
      className={`${className} underline decoration-dotted underline-offset-2 hover:text-sky`}
    >
      {open ? `${code} · ${name}${detail ? ` · ${detail}` : ""}${suffix}` : `${code}${suffix}`}
    </button>
  );
}
