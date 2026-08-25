import SectionShell from "@/components/SectionShell";

// The app's loading language, used by every route's loading.tsx and any
// in-component wait state. Two pieces:
//  - PlaneSpinner — the narrowbody jet circling a dashed range ring (same
//    motifs as the Spot map's range circle and the map-key glyph).
//  - Skeleton — a paper-deep block with a soft light sweep, for layout-shaped
//    placeholders.
// All motion lives in globals.css (.sd-spin / .sd-skeleton) and degrades under
// prefers-reduced-motion, so these stay server-safe and client-safe alike.

// The map key's narrowbody glyph, nose-up in a 24×24 box (SpotMap.tsx).
const JET_PATH =
  "M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z";

export function PlaneSpinner({
  size = 44,
  tone = "ink",
  className = "",
}: {
  size?: number;
  tone?: "ink" | "paper"; // "paper" for dark surfaces (map, camera)
  className?: string;
}) {
  const ring = tone === "paper" ? "rgba(242,235,220,0.5)" : "var(--color-paper-edge)";
  const plane = tone === "paper" ? "var(--color-paper)" : "var(--color-sky)";
  return (
    <span role="status" aria-label="Loading" className={`inline-block leading-none ${className}`}>
      <svg width={size} height={size} viewBox="0 0 48 48" className="sd-spin" aria-hidden>
        <circle
          cx="24"
          cy="24"
          r="18"
          fill="none"
          stroke={ring}
          strokeWidth="2"
          strokeDasharray="4 5"
        />
        {/* jet riding the top of the ring, nose along the direction of travel */}
        <g transform="translate(24 6) rotate(90) scale(0.8) translate(-12 -12)">
          <path d={JET_PATH} fill={plane} />
        </g>
      </svg>
    </span>
  );
}

export function SpinnerBlock({
  label = "Loading…",
  tone = "ink",
  className = "",
}: {
  label?: string;
  tone?: "ink" | "paper";
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <PlaneSpinner tone={tone} />
      <span
        className={`font-display text-xs font-semibold uppercase tracking-[0.08em] ${
          tone === "paper" ? "text-paper/80" : "text-ink-faint"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`sd-skeleton block ${className}`} />;
}

// Generic section-page skeleton: real title (renders instantly, so the user
// knows where they landed) over placeholder copy. Pages with a distinctive
// layout pass their own children instead.
export function SectionLoading({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <SectionShell title={title} subtitle={subtitle}>
      {children ?? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="mt-3 h-44 w-full rounded-lg" />
        </div>
      )}
    </SectionShell>
  );
}
