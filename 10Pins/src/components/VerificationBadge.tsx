/**
 * How a game was recorded, as plain words in the meta register (12px, faded).
 * The old stamp is gone: on a scoresheet the provenance is a note in the
 * margin, not a badge.
 */
export const VERIFICATION_LABEL: Record<'verified' | 'live' | 'unverified', string> = {
  verified: 'Scanned from photo',
  live: 'Scored live',
  unverified: 'Unverified',
};

export default function VerificationBadge({
  status,
  className = '',
}: {
  status: 'verified' | 'live' | 'unverified';
  className?: string;
}) {
  return <span className={`text-[12px] text-ink-faded ${className}`}>{VERIFICATION_LABEL[status]}</span>;
}
