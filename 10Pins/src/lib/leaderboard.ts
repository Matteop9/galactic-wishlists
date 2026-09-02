// Pure helpers for the leaderboard period/metric toggle (feedback queue #3,
// slice C3). No Supabase, no React — safe to unit-test in isolation.

export type LeaderboardPeriod = 'season' | '30d' | 'all';
export type LeaderboardMetric = 'average' | 'high';

export interface LeaderboardPeriodOption {
  value: LeaderboardPeriod;
  label: string;
}

/** A group only has a season window once someone has dated it. */
export function hasSeason(g: { season_starts: string | null; season_ends: string | null }): boolean {
  return g.season_starts !== null || g.season_ends !== null;
}

/**
 * The chip options to show, in order. Season only appears (first) once the
 * group has dates — an undated group has no meaningful "season" window, so
 * offering the chip would just duplicate "All time".
 */
export function availablePeriods(g: {
  season_starts: string | null;
  season_ends: string | null;
  season_name: string | null;
}): LeaderboardPeriodOption[] {
  const options: LeaderboardPeriodOption[] = [];
  if (hasSeason(g)) {
    options.push({ value: 'season', label: g.season_name ?? 'Season' });
  }
  options.push({ value: '30d', label: '30 days' });
  options.push({ value: 'all', label: 'All time' });
  return options;
}

/** 'season' when the group has dates (it's the meaningful default), else 'all'. */
export function defaultPeriod(g: { season_starts: string | null; season_ends: string | null }): LeaderboardPeriod {
  return hasSeason(g) ? 'season' : 'all';
}

/** Display label for a given period, honouring the group's own season name. */
export function periodLabel(
  period: LeaderboardPeriod,
  g: { season_name: string | null },
): string {
  if (period === 'season') return g.season_name ?? 'Season';
  if (period === '30d') return '30 days';
  return 'All time';
}

/**
 * Re-sort rows for the active metric. 'average' is the RPC's native order
 * (rows come back sorted by rank, display_name already) — return unchanged.
 * 'high' re-sorts by rank_high (then name, to keep ties stable and readable)
 * and swaps rank/prev_rank for rank_high/prev_rank_high on each row, so a row
 * component that only ever reads `rank`/`prev_rank` needs no metric branch.
 */
export function sortRows<
  T extends {
    rank: number;
    prev_rank: number | null;
    rank_high: number;
    prev_rank_high: number | null;
    display_name: string;
  },
>(rows: T[], metric: LeaderboardMetric): T[] {
  if (metric === 'average') return rows;
  return [...rows]
    .sort((a, b) => a.rank_high - b.rank_high || a.display_name.localeCompare(b.display_name))
    .map((row) => ({ ...row, rank: row.rank_high, prev_rank: row.prev_rank_high }));
}
