"use client";

import { useState } from "react";
import SightingCard, { type Sighting } from "@/components/SightingCard";
import Lightbox from "@/components/Lightbox";

// Makes any sighting thumbnail open the standard enriched Lightbox — the one
// place server components (books, reports, share page, profile) hook into the
// app-wide "every photo opens the same card" convention (see AGENTS.md).
// Renders `children` as the clickable thumbnail.
export default function SightingPhoto({
  sighting,
  className = "",
  children,
}: {
  sighting: Sighting;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View photo of ${sighting.registration || sighting.callsign || "sighting"}`}
        className={`cursor-zoom-in ${className}`}
      >
        {children}
      </button>
      {open && <Lightbox sighting={sighting} onClose={() => setOpen(false)} />}
    </>
  );
}

// A full SightingCard whose photo opens the Lightbox — for server components
// that render a standalone card (e.g. the /s/[id] share page).
export function SightingCardZoom({ s }: { s: Sighting }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <SightingCard s={s} onOpen={() => setOpen(true)} />
      {open && <Lightbox sighting={s} onClose={() => setOpen(false)} />}
    </>
  );
}
