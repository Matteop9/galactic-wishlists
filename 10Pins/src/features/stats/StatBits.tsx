/**
 * Shared bits between `Stats.tsx` (my stats) and `PlayerPage.tsx` (their
 * stats): the stat tile, the form word and the average-over-time graph.
 */
import type { ReactNode } from 'react';
import { StatTile } from '../../components/Strip';

/**
 * A stat tile. `hot`/`steady` colour the numeral red/blue; the older `up`/
 * `down` tones render in ink (direction is said in words, never in colour).
 * `bare` is accepted for compatibility and ignored: the tile always draws its
 * own box now.
 */
export function Tile({
  label,
  value,
  tone,
  bare,
}: {
  label: string;
  value: ReactNode;
  tone?: 'up' | 'down' | 'hot' | 'steady' | null;
  bare?: boolean;
}) {
  void bare;
  const mapped = tone === 'hot' || tone === 'steady' ? tone : null;
  return <StatTile value={value} label={label} tone={mapped} size="sm" />;
}

/**
 * Recent form as a word: "Up", "Down" or "Level" once there are four or more
 * scores to compare; an empty string before that. `tone` is kept for callers
 * that branch on direction.
 */
export function formArrow(scores: number[]): { symbol: string; tone: 'up' | 'down' | null } {
  if (scores.length < 4) return { symbol: '', tone: null };
  const half = Math.floor(scores.length / 2);
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const earlier = avg(scores.slice(0, half));
  const later = avg(scores.slice(half));
  if (later > earlier + 1) return { symbol: 'Up', tone: 'up' };
  if (later < earlier - 1) return { symbol: 'Down', tone: 'down' };
  return { symbol: 'Level', tone: null };
}

const GRAPH_W = 318;
const GRAPH_H = 130;

/**
 * Average over time: three hairline gridlines, a bottom rule, an ink polyline
 * of recent scores, a red dot on the high game and an ink dot on the latest.
 * Pass `scores` oldest first.
 */
export function FormGraph({ scores }: { scores: number[] }) {
  const padX = 6;
  const padTop = 8;
  const padBottom = 12;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const span = Math.max(max - min, 10);
  const coords = scores.map((score, i) => {
    const x = padX + (i * (GRAPH_W - padX * 2)) / Math.max(scores.length - 1, 1);
    const y = GRAPH_H - padBottom - ((score - min) / span) * (GRAPH_H - padTop - padBottom);
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });
  const points = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const maxIndex = scores.indexOf(max);
  const last = coords[coords.length - 1];
  const high = coords[maxIndex];

  return (
    <svg viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`} className="h-auto w-full" role="img" aria-label="Score trend">
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" y1={GRAPH_H * f} x2={GRAPH_W} y2={GRAPH_H * f} stroke="var(--hairline)" />
      ))}
      <line x1="0" y1={GRAPH_H - 1} x2={GRAPH_W} y2={GRAPH_H - 1} stroke="var(--rule)" />
      <polyline
        points={points}
        fill="none"
        stroke="var(--ink)"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {last && <circle cx={last.x} cy={last.y} r="4" fill="var(--ink)" />}
      {high && <circle cx={high.x} cy={high.y} r="4" fill="var(--red)" />}
    </svg>
  );
}

/** The empty graph: gridlines and the rule, no line yet. */
export function EmptyGraph() {
  return (
    <svg viewBox={`0 0 ${GRAPH_W} 120`} className="h-auto w-full" aria-hidden>
      {[30, 60, 90].map((y) => (
        <line key={y} x1="0" y1={y} x2={GRAPH_W} y2={y} stroke="var(--hairline)" />
      ))}
      <line x1="0" y1="119" x2={GRAPH_W} y2="119" stroke="var(--rule)" />
    </svg>
  );
}
