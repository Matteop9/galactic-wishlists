import { describe, expect, it } from 'vitest';
import { availablePeriods, defaultPeriod, hasSeason, periodLabel, sortRows } from './leaderboard';

describe('hasSeason', () => {
  it('is true when either date is set', () => {
    expect(hasSeason({ season_starts: '2026-01-01', season_ends: null })).toBe(true);
    expect(hasSeason({ season_starts: null, season_ends: '2026-12-31' })).toBe(true);
  });

  it('is false when neither date is set', () => {
    expect(hasSeason({ season_starts: null, season_ends: null })).toBe(false);
  });
});

describe('availablePeriods', () => {
  it('leads with season when the group has dates, using the season name', () => {
    const g = { season_starts: '2026-01-01', season_ends: '2026-12-31', season_name: '2026 season' };
    expect(availablePeriods(g)).toEqual([
      { value: 'season', label: '2026 season' },
      { value: '30d', label: '30 days' },
      { value: 'all', label: 'All time' },
    ]);
  });

  it('falls back to "Season" when the group has dates but no season_name', () => {
    const g = { season_starts: '2026-01-01', season_ends: null, season_name: null };
    expect(availablePeriods(g)[0]).toEqual({ value: 'season', label: 'Season' });
  });

  it('omits the season chip entirely for an undated group', () => {
    const g = { season_starts: null, season_ends: null, season_name: null };
    expect(availablePeriods(g)).toEqual([
      { value: '30d', label: '30 days' },
      { value: 'all', label: 'All time' },
    ]);
  });
});

describe('defaultPeriod', () => {
  it('is "season" when the group has dates', () => {
    expect(defaultPeriod({ season_starts: '2026-01-01', season_ends: null })).toBe('season');
  });

  it('is "all" when the group has no dates', () => {
    expect(defaultPeriod({ season_starts: null, season_ends: null })).toBe('all');
  });
});

describe('periodLabel', () => {
  it('uses the group season name for "season"', () => {
    expect(periodLabel('season', { season_name: 'Winter league' })).toBe('Winter league');
  });

  it('falls back to "Season" for "season" with no season_name', () => {
    expect(periodLabel('season', { season_name: null })).toBe('Season');
  });

  it('labels "30d" and "all" regardless of the group', () => {
    expect(periodLabel('30d', { season_name: null })).toBe('30 days');
    expect(periodLabel('all', { season_name: 'Winter league' })).toBe('All time');
  });
});

describe('sortRows', () => {
  const rows = [
    { profile_id: 'a', display_name: 'Alice', rank: 1, prev_rank: 2, rank_high: 3, prev_rank_high: 1 },
    { profile_id: 'b', display_name: 'Bob', rank: 2, prev_rank: 1, rank_high: 1, prev_rank_high: 2 },
    { profile_id: 'c', display_name: 'Carol', rank: 3, prev_rank: null, rank_high: 1, prev_rank_high: null },
  ];

  it('returns rows unchanged for "average" (the RPC already sorted them)', () => {
    expect(sortRows(rows, 'average')).toBe(rows);
  });

  it('re-sorts by rank_high and swaps rank/prev_rank in for "high"', () => {
    const sorted = sortRows(rows, 'high');
    expect(sorted.map((r) => r.profile_id)).toEqual(['b', 'c', 'a']);
    expect(sorted[0]).toMatchObject({ rank: 1, prev_rank: 2 });
    expect(sorted[2]).toMatchObject({ rank: 3, prev_rank: 1 });
  });

  it('breaks a rank_high tie by display_name, preserving stable order', () => {
    const sorted = sortRows(rows, 'high');
    // Bob and Carol are tied on rank_high (1) — alphabetical: Bob before Carol.
    expect(sorted.map((r) => r.display_name)).toEqual(['Bob', 'Carol', 'Alice']);
  });

  it('does not mutate the input array', () => {
    const copy = rows.map((r) => ({ ...r }));
    sortRows(rows, 'high');
    expect(rows).toEqual(copy);
  });
});
