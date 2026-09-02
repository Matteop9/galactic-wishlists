/** The three verification states (README §Flagship). Amber is earned: only ✓ VERIFIED glows. */
export default function VerificationBadge({
  status,
}: {
  status: 'verified' | 'live' | 'unverified';
}) {
  if (status === 'verified') {
    return (
      <span className="inline-block rounded bg-phosphor px-[9px] py-1 font-display text-[10px] font-bold tracking-[.1em] text-ink shadow-[0_0_12px_rgba(255,174,43,.4)]">
        ✓ VERIFIED
      </span>
    );
  }
  if (status === 'live') {
    return (
      <span className="inline-block rounded border border-[#2A3B4E] px-[9px] py-1 font-display text-[10px] font-bold tracking-[.1em] text-dim">
        LIVE-SCORED
      </span>
    );
  }
  return (
    <span className="inline-block rounded border border-dashed border-[#2A3B4E] px-[9px] py-1 font-display text-[10px] font-bold tracking-[.1em] text-faint">
      UNVERIFIED
    </span>
  );
}
