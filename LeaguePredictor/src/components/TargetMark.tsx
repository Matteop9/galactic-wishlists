// Brand mark from the Spot On design system (spot-on-mark.svg) — inline for currentColor
export default function TargetMark({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
      <circle cx="12" cy="12" r="3.2" fill="currentColor" />
    </svg>
  );
}
