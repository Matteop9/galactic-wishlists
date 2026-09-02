/**
 * Shared bits between `Stats.tsx` (my stats) and `PlayerPage.tsx` (their
 * stats) — split out of `Stats.tsx` unchanged so both can use the same
 * tiles and form graph.
 */

export function Tile({
  label,
  value,
  tone,
  bare,
}: {
  label: string;
  value: string;
  tone?: 'up' | 'down' | null;
  bare?: boolean;
}) {
  const colour = tone === 'up' ? 'text-success' : tone === 'down' ? 'text-signal' : 'text-text';
  return (
    <div className={bare ? 'flex flex-col items-center gap-1' : 'rounded-card border border-line bg-panel p-4'}>
      <span className="label-caps">{label}</span>
      <p className={`score-text mt-1 text-[26px] font-bold ${colour}`}>{value}</p>
    </div>
  );
}

export function formArrow(scores: number[]): { symbol: string; tone: 'up' | 'down' | null } {
  if (scores.length < 4) return { symbol: '—', tone: null };
  const half = Math.floor(scores.length / 2);
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const earlier = avg(scores.slice(0, half));
  const later = avg(scores.slice(half));
  if (later > earlier + 1) return { symbol: '▲', tone: 'up' };
  if (later < earlier - 1) return { symbol: '▼', tone: 'down' };
  return { symbol: '—', tone: null };
}

/** SVG polyline of recent scores — phosphor, per the design’s form graph. */
export function FormGraph({ scores }: { scores: number[] }) {
  const width = 320;
  const height = 96;
  const pad = 8;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const span = Math.max(max - min, 10);
  const points = scores
    .map((score, i) => {
      const x = pad + (i * (width - pad * 2)) / Math.max(scores.length - 1, 1);
      const y = height - pad - ((score - min) / span) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 w-full" role="img" aria-label="Score trend">
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-phosphor)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
