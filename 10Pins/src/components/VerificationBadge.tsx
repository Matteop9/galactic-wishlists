/** The three verification states (README §Flagship). Amber is earned: only ✓ VERIFIED glows. */
export default function VerificationBadge({
  status,
}: {
  status: 'verified' | 'live' | 'unverified';
}) {
  if (status === 'verified') {
    return (
      <span className="inline-block rounded-cell bg-phosphor px-[9px] py-1 font-display text-[10px] font-bold tracking-[.1em] text-ink shadow-glow-amber-sm">
        ✓ VERIFIED
      </span>
    );
  }
  if (status === 'live') {
    return (
      <span className="inline-block rounded-cell border border-line px-[9px] py-1 font-display text-[10px] font-bold tracking-[.1em] text-dim">
        LIVE-SCORED
      </span>
    );
  }
  return (
    <span className="inline-block rounded-cell border border-dashed border-line px-[9px] py-1 font-display text-[10px] font-bold tracking-[.1em] text-faint">
      UNVERIFIED
    </span>
  );
}
