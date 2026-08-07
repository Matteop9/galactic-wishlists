export default function DiffChip({ diff, missing = false }: { diff: number; missing?: boolean }) {
  if (missing) {
    return (
      <span className="inline-flex min-w-14 items-center justify-center rounded-full border border-border px-2 py-0.5 text-xs font-semibold text-muted">
        —
      </span>
    );
  }
  if (diff === 0) {
    return (
      <span className="inline-flex min-w-14 items-center justify-center gap-1 rounded-full bg-spot-bg px-2 py-0.5 text-xs font-bold text-spot">
        ● spot on
      </span>
    );
  }
  // brand kit: 0 = celebration, 1–4 amber, 5+ red
  const tone = diff <= 4 ? 'bg-close-bg text-close' : 'bg-off-bg text-off';
  return (
    <span
      className={`inline-flex min-w-14 items-center justify-center rounded-full px-2 py-0.5 font-num text-xs font-bold tabular ${tone}`}
    >
      {diff} off
    </span>
  );
}
