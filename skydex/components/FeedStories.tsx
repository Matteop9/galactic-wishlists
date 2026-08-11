"use client";

import { useEffect, useRef, useState } from "react";
import { type Sighting, SightingSpecs } from "@/components/SightingCard";
import Reactions from "@/components/Reactions";
import ShareButton from "@/components/ShareButton";
import { useDialog } from "@/components/useDialog";
import { type ReactionState } from "@/lib/reactions";

/**
 * Instagram-style catch-up viewer: full-screen, one sighting at a time,
 * tap-through / swipe / arrow keys. Slides reuse the shared SightingSpecs
 * block (UI convention 1 — no second detail view) and the standard
 * Reactions/ShareButton, restyled dark. Advancing past the last slide closes;
 * the opener writes the seen-watermark on close.
 */
export default function FeedStories({
  sightings,
  currentUserId,
  reactions,
  onClose,
}: {
  sightings: Sighting[];
  currentUserId: string | null;
  reactions?: Record<string, ReactionState>;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const dialogRef = useDialog(onClose); // Esc + scroll lock + focus
  const touchStartX = useRef<number | null>(null);

  const s = sightings[index];

  function next() {
    if (index + 1 < sightings.length) setIndex(index + 1);
    else onClose();
  }
  function prev() {
    if (index > 0) setIndex(index - 1);
  }

  // Arrow-key navigation (useDialog only covers Escape). Deliberately no dep
  // array: re-subscribe each render so the handler sees the current index.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start == null) return;
    const dx = e.changedTouches[0].clientX - start;
    if (dx < -40) next();
    else if (dx > 40) prev();
  }

  if (!s) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="New sightings since your last visit"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-ink/95 outline-none"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* progress pips */}
      <div className="flex gap-1 px-3 pt-3">
        {sightings.map((x, i) => (
          <span
            key={x.id}
            className={`h-1 flex-1 rounded-full ${i <= index ? "bg-paper" : "bg-paper/25"}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between px-3 pt-2">
        <span className="font-mono text-[11px] uppercase tracking-wide text-paper/60">
          {index + 1} / {sightings.length} · new since your last visit
        </span>
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded px-2 py-1 font-mono text-sm text-paper/70 hover:text-paper"
        >
          ✕
        </button>
      </div>

      {/* photo, with tap zones: left third = back, right two-thirds = forward */}
      <div className="relative min-h-0 flex-1">
        {s.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={s.photo_url}
            alt={`Sighting photo of ${s.registration || s.callsign || "an aircraft"}`}
            className="h-full w-full object-contain p-2"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-mono text-xs uppercase tracking-widest text-paper/40">
            No photo — logged from the map
          </div>
        )}
        <button
          aria-label="Previous sighting"
          onClick={prev}
          className="absolute inset-y-0 left-0 w-1/3 outline-none"
        />
        <button
          aria-label="Next sighting"
          onClick={next}
          className="absolute inset-y-0 right-0 w-2/3 outline-none"
        />
      </div>

      {/* the same card info as everywhere else — shared spec block, dark */}
      <div className="mx-auto w-full max-w-sm px-4 pb-4">
        <SightingSpecs s={s} dark />
        <div className="mt-2 flex items-center justify-between gap-2">
          <Reactions
            key={s.id} // remount per slide — internal optimistic state must not leak across sightings
            sightingId={s.id}
            currentUserId={currentUserId}
            state={reactions?.[s.id]}
            dark
          />
          {s.verified && (
            <ShareButton
              id={s.id}
              className="font-mono text-[11px] uppercase tracking-wide text-paper/60 hover:text-paper"
            />
          )}
        </div>
      </div>
    </div>
  );
}
