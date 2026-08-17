import { describe, expect, it } from 'vitest'
import { thresholds } from '../src/lib/config'
import { pickCapitalForRoster, valueAtRank } from '../src/lib/engine/picks'
import type { TradedPick } from '../src/lib/types'

// Synthetic value curve: rank r is worth 10000 - 10r.
const curve = Array.from({ length: 300 }, (_, i) => 10000 - 10 * (i + 1))
const rosterIds = Array.from({ length: 12 }, (_, i) => i + 1)
const t = thresholds
const midFirst = valueAtRank(curve, t.picks.firstMidSlot)
const second = valueAtRank(curve, t.picks.secondSlot)

describe('pickCapitalForRoster', () => {
  it('values a full native slate: rounds x two seasons, year-two discounted', () => {
    const result = pickCapitalForRoster(1, rosterIds, [], 4, curve, null, 2026, t)
    expect(result.picks).toHaveLength(2 * Math.min(4, t.picks.roundsValued))
    const first2027 = result.picks.find((p) => p.season === '2027' && p.round === 1)
    const first2028 = result.picks.find((p) => p.season === '2028' && p.round === 1)
    expect(first2027?.value).toBe(midFirst)
    expect(first2028?.value).toBe(Math.round(midFirst * (1 - t.picks.futureSeasonDiscount)))
  })

  it('moves a traded pick from the original owner to the holder', () => {
    const trades: TradedPick[] = [
      { season: '2027', round: 1, originalRosterId: 1, currentOwnerRosterId: 2, previousOwnerRosterId: null },
    ]
    const seller = pickCapitalForRoster(1, rosterIds, trades, 4, curve, null, 2026, t)
    const buyer = pickCapitalForRoster(2, rosterIds, trades, 4, curve, null, 2026, t)
    expect(seller.picks.filter((p) => p.round === 1 && p.season === '2027')).toHaveLength(0)
    expect(buyer.picks.filter((p) => p.round === 1 && p.season === '2027')).toHaveLength(2)
  })

  it('slots 1sts by the owing team standings: bottom teams owe early picks', () => {
    const standings = new Map(rosterIds.map((id) => [id, id])) // roster n is ranked n
    const trades: TradedPick[] = [
      { season: '2027', round: 1, originalRosterId: 12, currentOwnerRosterId: 5, previousOwnerRosterId: null },
      { season: '2027', round: 1, originalRosterId: 1, currentOwnerRosterId: 5, previousOwnerRosterId: null },
    ]
    const result = pickCapitalForRoster(5, rosterIds, trades, 4, curve, standings, 2026, t)
    const viaBottom = result.picks.find((p) => p.round === 1 && p.originalRosterId === 12)
    const viaTop = result.picks.find((p) => p.round === 1 && p.originalRosterId === 1)
    expect(viaBottom?.value).toBe(valueAtRank(curve, t.picks.firstEarlySlot))
    expect(viaTop?.value).toBe(valueAtRank(curve, t.picks.firstLateSlot))
  })

  it('caps rounds at the league draft rounds', () => {
    const result = pickCapitalForRoster(1, rosterIds, [], 3, curve, null, 2026, t)
    expect(result.picks.every((p) => p.round <= 3)).toBe(true)
    expect(result.picks.some((p) => p.round === 2 && p.value === second)).toBe(true)
  })
})
