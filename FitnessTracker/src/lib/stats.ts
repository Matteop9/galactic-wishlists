// Weekly aggregation + correlations, used by the Insights tools and the weekly review.

export type WeekRow = {
  weekStart: string; // Monday, YYYY-MM-DD
  liftSessions: number;
  cardioSessions: number;
  cardioMinutes: number;
  hardSets: number;
  volumeLoad: number;
  steps: number | null;
  alcoholUnits: number | null;
  calories: number | null;
  proteinG: number | null;
  sleepHours: number | null;
  trendStartKg: number | null;
  trendEndKg: number | null;
  weightChangeKg: number | null;
};

/** Monday of the ISO week containing the date. */
export function weekStartOf(date: string): string {
  const d = new Date(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)));
  const day = (d.getUTCDay() + 6) % 7; // Mon=0
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export type Correlation = {
  n: number;
  pearson: number | null;
  spearman: number | null;
  strength: "none" | "weak" | "moderate" | "strong";
  direction: "positive" | "negative" | "flat";
  enough: boolean; // ≥ 8 pairs
};

export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  let num = 0,
    dx = 0,
    dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  if (dx === 0 || dy === 0) return null;
  return round3(num / Math.sqrt(dx * dy));
}

function ranks(v: number[]): number[] {
  const idx = v.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array(v.length).fill(0);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
    i = j + 1;
  }
  return r;
}

export function spearman(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  return pearson(ranks(xs.slice(0, n)), ranks(ys.slice(0, n)));
}

/** Pairs are filtered to rows where both values exist. */
export function correlate(pairs: Array<[number | null | undefined, number | null | undefined]>): Correlation {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const [x, y] of pairs) {
    if (x == null || y == null || Number.isNaN(x) || Number.isNaN(y)) continue;
    xs.push(x);
    ys.push(y);
  }
  const p = pearson(xs, ys);
  const s = spearman(xs, ys);
  const r = s ?? p;
  const abs = r == null ? 0 : Math.abs(r);
  return {
    n: xs.length,
    pearson: p,
    spearman: s,
    strength: abs >= 0.6 ? "strong" : abs >= 0.35 ? "moderate" : abs >= 0.15 ? "weak" : "none",
    direction: r == null || abs < 0.15 ? "flat" : r > 0 ? "positive" : "negative",
    enough: xs.length >= 8,
  };
}

export function mean(v: number[]): number {
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}

function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}

/** Plain-English sentence for a correlation, with the caveats baked in. */
export function describeCorrelation(label: string, c: Correlation): string {
  if (!c.enough) return `${label}: not enough weeks yet (${c.n}/8) to say anything.`;
  if (c.strength === "none" || c.direction === "flat") return `${label}: no visible relationship across ${c.n} weeks.`;
  const r = c.spearman ?? c.pearson ?? 0;
  return `${label}: ${c.strength} ${c.direction} relationship (ρ ${r.toFixed(2)}, ${c.n} weeks). Correlation, not cause.`;
}
