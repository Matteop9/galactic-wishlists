import { describe, expect, it } from 'vitest'
import { thresholds } from '../src/lib/config'
import { classifyDirection, type DirectionInput } from '../src/lib/engine/direction'

const base: DirectionInput = {
  starterRank: 6,
  totalRank: 6,
  pickCapitalRank: 6,
  youthShare: 0.3,
  winNowShare: 0.7,
  record: { wins: 0, losses: 0, ties: 0 },
  kind: 'preseason',
  numTeams: 12,
}

describe('classifyDirection', () => {
  it('contender: top starter rank with a win-now core (record ignored preseason)', () => {
    expect(classifyDirection({ ...base, starterRank: 2, winNowShare: 0.6 }, thresholds)).toBe('Contender')
  })

  it('ascending: top total value, young, but thin starters', () => {
    expect(
      classifyDirection({ ...base, totalRank: 2, youthShare: 0.5, winNowShare: 0.5, starterRank: 7 }, thresholds),
    ).toBe('Ascending')
  })

  it('rebuilding: bottom starter rank with top pick capital', () => {
    expect(classifyDirection({ ...base, starterRank: 11, pickCapitalRank: 1 }, thresholds)).toBe('Rebuilding')
  })

  it('rebuilding: bottom starter rank with a young roster', () => {
    expect(
      classifyDirection({ ...base, starterRank: 12, youthShare: 0.5, winNowShare: 0.5 }, thresholds),
    ).toBe('Rebuilding')
  })

  it('mushy middle: mid-table on everything', () => {
    expect(classifyDirection(base, thresholds)).toBe('Mushy middle')
  })

  it('in-season, a losing record blocks contender status', () => {
    expect(
      classifyDirection(
        { ...base, starterRank: 2, winNowShare: 0.6, kind: 'week', record: { wins: 2, losses: 6, ties: 0 } },
        thresholds,
      ),
    ).not.toBe('Contender')
  })
})
