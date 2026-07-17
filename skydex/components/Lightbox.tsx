"use client";

import { useEffect, useState } from "react";
import { type Sighting, SightingSpecs } from "@/components/SightingCard";
import { useDialog } from "@/components/useDialog";

type RefPhoto = { src: string | null; link: string | null; photographer: string | null };

export default function Lightbox({
  sighting,
  onClose,
}: {
  sighting: Sighting;
  onClose: () => void;
}) {
  const [ref, setRef] = useState<RefPhoto | null>(null);
  const [swapped, setSwapped] = useState(false); // false = your shot big
  const dialogRef = useDialog(onClose);

  useEffect(() => {
    const reg = sighting.registration;
    if (!reg) return;
    let cancelled = false;
    fetch(`/api/aircraft-photo?reg=${encodeURIComponent(reg)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j.photo?.src) setRef(j.photo);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sighting.registration]);

  const hasRef = Boolean(ref?.src);
  const big = swapped ? ref?.src : sighting.photo_url;
  const small = swapped ? sighting.photo_url : ref?.src;
  const bigLabel = swapped ? "Actual aircraft" : "Your shot";

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Photo of ${sighting.registration || sighting.callsign || "sighting"}`}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-ink/90 p-4 outline-none"
      onClick={onClose}
    >
      {hasRef ? (
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          {big && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={big} alt="" className="max-h-[64vh] max-w-full rounded object-contain" />
          )}
          {small && (
            <button
              onClick={() => setSwapped((s) => !s)}
              className="absolute left-3 top-3 overflow-hidden rounded-md border-2 border-paper shadow-lg"
              aria-label="Swap photos"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={small} alt="" className="h-24 w-24 object-cover" />
            </button>
          )}
          <span className="absolute bottom-2 right-2 rounded bg-ink/70 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-paper">
            {bigLabel} · tap thumb to swap
          </span>
        </div>
      ) : (
        sighting.photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sighting.photo_url}
            alt=""
            className="max-h-[70vh] max-w-full rounded object-contain"
          />
        )
      )}

      {/* the same card info as everywhere else — shared spec block, dark variant */}
      <div
        className="mt-4 w-full max-w-sm text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <SightingSpecs s={sighting} dark />
      </div>

      {hasRef && (
        <a
          href={ref?.link ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-2 font-mono text-[10px] text-paper/50 hover:text-paper"
        >
          Reference photo: {ref?.photographer ?? "unknown"} · Planespotters
        </a>
      )}

      <p className="mt-4 font-mono text-xs uppercase tracking-widest text-paper/50">
        Tap background or press Esc to close
      </p>
    </div>
  );
}
