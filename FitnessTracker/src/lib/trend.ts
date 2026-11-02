// Trend weight: Hacker's Diet style exponentially weighted moving average,
// gap-aware so missed days don't make the trend lurch when you weigh in again.

export type WeighIn = { date: string; weightKg: number }; // date = YYYY-MM-DD

export type TrendPoint = { date: string; weightKg: number; trendKg: number };

export const DEFAULT_ALPHA = 0.1;

function daysBetween(a: string, b: string): number {
  const ms = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  return Math.round(ms / 86_400_000);
}

/** Returns trend points for every weigh-in, sorted by date. */
export function trendSeries(weighIns: WeighIn[], alpha = DEFAULT_ALPHA): TrendPoint[] {
  const sorted = [...weighIns].filter((w) => w.weightKg > 0).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const out: TrendPoint[] = [];
  let trend: number | null = null;
  let lastDate: string | null = null;
  for (const w of sorted) {
    if (trend === null) {
      trend = w.weightKg;
    } else {
      const gap = Math.max(1, daysBetween(lastDate!, w.date));
      const effAlpha = 1 - (1 - alpha) ** gap;
      trend = trend + effAlpha * (w.weightKg - trend);
    }
    lastDate = w.date;
    out.push({ date: w.date, weightKg: w.weightKg, trendKg: round1(trend) });
  }
  return out;
}

/** kg per week from the trend line over the last `days` days (needs ≥2 points). */
export function weeklyRate(points: TrendPoint[], days = 14): number | null {
  if (points.length < 2) return null;
  const last = points[points.length - 1];
  const cutoff = shiftDate(last.date, -days);
  const first = points.find((p) => p.date >= cutoff) ?? points[0];
  if (first === last) return null;
  const span = daysBetween(first.date, last.date);
  if (span < 3) return null;
  return round2(((last.trendKg - first.trendKg) / span) * 7);
}

export function averageOver(points: TrendPoint[], days: number): number | null {
  if (points.length === 0) return null;
  const last = points[points.length - 1];
  const cutoff = shiftDate(last.date, -days);
  const window = points.filter((p) => p.date > cutoff);
  if (window.length === 0) return null;
  return round1(window.reduce((a, p) => a + p.weightKg, 0) / window.length);
}

export function shiftDate(date: string, days: number): string {
  const d = new Date(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}
