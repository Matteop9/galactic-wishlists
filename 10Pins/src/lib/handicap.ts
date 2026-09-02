/**
 * Standard league handicap: pct% of (basis − average), floored at zero.
 * Defaults live on the group (basis 200, pct 90) and are snapshotted onto the
 * match day at creation; organisers can override per player on the day.
 */
export function defaultHandicap(average: number | null | undefined, basis: number, pct: number): number {
  if (average == null || Number.isNaN(average)) return 0;
  return Math.max(0, Math.round((pct / 100) * (basis - average)));
}
