"use client";

import { useEffect, useRef, useState } from "react";
import { angularSeparation, signedAzimuthDelta } from "@/lib/geo";

// Estimated horizontal field of view of a phone's main camera at 1×, degrees.
// No browser API exposes the true lens FOV, and the preview is object-cover
// cropped, so this is a deliberate tunable — calibrate against a real phone
// (marker left/right of the actual plane → FOV too small/large).
const CAMERA_HFOV_DEG = 65;

type Fix = { bearing: number; elevation: number };

// Simple plane silhouette pointing up (screen-up = camera heading), so it can
// be rotated by (ground track − camera heading) without font-glyph ambiguity.
function PlaneGlyph({
  size,
  rotation,
  className,
}: {
  size: number;
  rotation: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={{ transform: `rotate(${rotation}deg)` }}
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2l1.4 6.6L21 12.6v2l-7.4-2.2-.5 5.4 2.4 1.9v1.6L12 20.2l-3.5 1.1v-1.6l2.4-1.9-.5-5.4L3 14.6v-2l7.6-4L12 2z" />
    </svg>
  );
}

/**
 * Superimposes where the app CALCULATES the target aircraft to be over the
 * camera preview: a solid plane glyph at the dead-reckoned position and a
 * faint ghost at the raw last ADS-B fix — so you can see at a glance whether
 * the calculation runs ahead of or behind reality. Purely presentational; the
 * spot page supplies already-extrapolated geometry.
 */
export default function TargetOverlay({
  heading,
  pitch,
  zoom,
  label,
  distanceKm,
  track,
  target,
  ghost,
}: {
  heading: number;
  pitch: number;
  zoom: number;
  label: string;
  distanceKm: number;
  track: number | null;
  /** Dead-reckoned (calculated) position. */
  target: Fix;
  /** Raw last-fix position, when extrapolation moved the target off it. */
  ghost: Fix | null;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Pinhole-ish projection: degrees off-axis → % across the frame.
  const hFov = CAMERA_HFOV_DEG / zoom;
  const vFov = box && box.w > 0 ? hFov * (box.h / box.w) : hFov;
  const project = (fix: Fix) => {
    const azOff = signedAzimuthDelta(heading, fix.bearing);
    const elOff = fix.elevation - pitch;
    const x = 50 + (azOff / hFov) * 100;
    const y = 50 - (elOff / vFov) * 100;
    return { x, y, onScreen: x >= 0 && x <= 100 && y >= 0 && y <= 100 };
  };

  const t = project(target);
  const g = ghost ? project(ghost) : null;
  const sep = Math.round(
    angularSeparation(heading, pitch, target.bearing, target.elevation),
  );
  const rotation = track != null ? track - heading : 0;
  const caption = `${label} · ${distanceKm} km · ${sep}° off`;

  return (
    <div ref={boxRef} className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* ghost: the raw last fix — where the feed last SAW it */}
      {g && g.onScreen && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 text-paper/35"
          style={{ left: `${g.x}%`, top: `${g.y}%` }}
        >
          <PlaneGlyph size={26} rotation={rotation} />
        </div>
      )}

      {t.onScreen ? (
        // solid marker: where we CALCULATE it to be right now
        <div
          className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
          style={{ left: `${t.x}%`, top: `${t.y}%` }}
        >
          <PlaneGlyph size={30} rotation={rotation} className="text-stamp drop-shadow-[0_0_3px_rgba(0,0,0,0.8)]" />
          <span className="mt-0.5 whitespace-nowrap rounded bg-ink/70 px-1.5 py-0.5 font-mono text-[10px] text-paper">
            {caption}
          </span>
        </div>
      ) : (
        // off-screen: clamp to the edge and point a chevron at it
        <div
          className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
          style={{
            left: `${Math.min(93, Math.max(7, t.x))}%`,
            top: `${Math.min(90, Math.max(10, t.y))}%`,
          }}
        >
          <span
            className="font-display text-xl leading-none text-stamp drop-shadow-[0_0_3px_rgba(0,0,0,0.8)]"
            style={{
              transform: `rotate(${(Math.atan2(t.x - 50, 50 - t.y) * 180) / Math.PI}deg)`,
            }}
            aria-hidden
          >
            ▲
          </span>
          <span className="mt-0.5 whitespace-nowrap rounded bg-ink/70 px-1.5 py-0.5 font-mono text-[10px] text-paper">
            {caption}
          </span>
        </div>
      )}
    </div>
  );
}
