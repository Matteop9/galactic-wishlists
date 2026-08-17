import { describe, expect, it } from 'vitest'
import { thresholds } from '../src/lib/config'
import { adjustedValue } from '../src/lib/engine/adjust'
import type { FcValue, LeagueDerived } from '../src/lib/types'

const fc = (position: string, value: number, positionRank = 5): FcValue => ({
  value,
  overallRank: 10,
  positionRank,
  trend30Day: 0,
  tier: null,
  redraftValue: value,
  redraftDynastyValueDifference: 0,
  age: 25,
  name: 'Test Player',
  position,
})

const derived = (over: Partial<LeagueDerived>): LeagueDerived => ({
  tePremium: false,
  fourPointPassTd: false,
  volumeBonus: false,
  ...over,
})

describe('adjustedValue', () => {
  it('boosts TEs in TE-premium leagues only', () => {
    expect(adjustedValue(fc('TE', 1000), derived({ tePremium: true }), thresholds)).toBe(
      Math.round(1000 * thresholds.valueAdjustments.tePremiumMultiplier),
    )
    expect(adjustedValue(fc('TE', 1000), derived({}), thresholds)).toBe(1000)
    expect(adjustedValue(fc('WR', 1000), derived({ tePremium: true }), thresholds)).toBe(1000)
  })

  it('discounts QBs in 4pt pass TD leagues', () => {
    expect(adjustedValue(fc('QB', 1000), derived({ fourPointPassTd: true }), thresholds)).toBe(
      Math.round(1000 * thresholds.valueAdjustments.qbFourPointPassTdMultiplier),
    )
  })

  it('volume bonus only applies to high-ranked RB/WR', () => {
    const high = fc('RB', 1000, 10)
    const low = fc('RB', 1000, thresholds.valueAdjustments.volumeBonusMinPositionRank + 1)
    expect(adjustedValue(high, derived({ volumeBonus: true }), thresholds)).toBe(
      Math.round(1000 * thresholds.valueAdjustments.volumeBonusRbWrMultiplier),
    )
    expect(adjustedValue(low, derived({ volumeBonus: true }), thresholds)).toBe(1000)
  })
})
