import { describe, expect, it } from 'vitest'
import { thresholds } from '../src/lib/config'
import { reviewTrades } from '../src/lib/engine/tradeHistory'
import { valueAtRank } from '../src/lib/engine/picks'
import type { FcValue, LeagueSnapshot, PlayersFile, TradeRecord } from '../src/lib/types'

const curve = Array.from({ length: 300 }, (_, i) => 10000 - 10 * (i + 1))

const fc = (value: number, position = 'WR'): FcValue => ({
  value,
  overallRank: 50,
  positionRank: 10,
  trend30Day: 0,
  tier: null,
  redraftValue: value,
  redraftDynastyValueDifference: null,
  age: 25,
  name: 'FC Name',
  position,
})

const players: PlayersFile = {
  meta: { fetchedAt: '2026-08-17', source: 'sleeper', count: 2 },
  players: {
    p1: { name: 'Given Player', position: 'WR', team: null, age: 27, yearsExp: 5, injuryStatus: null, status: null },
    p2: { name: 'Gotten Player', position: 'RB', team: null, age: 23, yearsExp: 2, injuryStatus: null, status: null },
  },
}

function league(trades: TradeRecord[]): LeagueSnapshot {
  return {
    leagueId: 'L1',
    label: 'Test League',
    fantasyCalcVariant: '12team',
    settings: {
      name: 'Test League',
      numTeams: 2,
      rosterPositions: ['QB', 'WR'],
      taxiSlots: 0,
      reserveSlots: 0,
      draftRounds: 4,
      scoring: { passTd: 6, teRecBonus: 0, ppr: 1 },
      derived: { tePremium: false, fourPointPassTd: false, volumeBonus: false },
    },
    rosters: [],
    users: { me: 'Me', them: 'Them' },
    tradedPicks: [],
    trades,
  }
}

const baseTrade: TradeRecord = {
  id: 't1',
  season: '2026',
  week: 1,
  created: 1_755_000_000_000,
  rosterIds: [1, 2],
  adds: { p1: 2, p2: 1 }, // I (roster 1) gave p1, got p2
  draftPicks: [{ season: '2027', round: 2, originalRosterId: 1, toRosterId: 1, fromRosterId: 2 }],
  ownerByRosterId: { '1': 'me', '2': 'them' },
}

describe('reviewTrades', () => {
  it('splits gave/got by roster ownership and values with current numbers', () => {
    const fcMap = { p1: fc(1000), p2: fc(3000, 'RB') }
    const reviews = reviewTrades(league([baseTrade]), fcMap, curve, players, 'me', 2026, thresholds)
    expect(reviews).toHaveLength(1)
    const r = reviews[0]
    expect(r.gave.map((a) => a.name)).toEqual(['Given Player'])
    expect(r.got.map((a) => a.name)).toContain('Gotten Player')
    const pick = r.got.find((a) => a.kind === 'pick')!
    expect(pick.currentValue).toBe(valueAtRank(curve, thresholds.picks.secondSlot))
    expect(r.netValue).toBe(3000 + pick.currentValue! - 1000)
    expect(r.outcome).toBe('ahead')
    expect(r.counterparties).toEqual(['Them'])
  })

  it('ignores trades I was not part of', () => {
    const trade = { ...baseTrade, ownerByRosterId: { '1': 'someone', '2': 'them' } }
    expect(reviewTrades(league([trade]), {}, curve, players, 'me', 2026, thresholds)).toHaveLength(0)
  })

  it('leaves already-drafted picks unvalued and softens the take', () => {
    const trade = {
      ...baseTrade,
      adds: { p1: 2 },
      draftPicks: [{ season: '2025', round: 1, originalRosterId: 1, toRosterId: 1, fromRosterId: 2 }],
    }
    const reviews = reviewTrades(league([trade]), { p1: fc(1000) }, curve, players, 'me', 2026, thresholds)
    const pick = reviews[0].got.find((a) => a.kind === 'pick')!
    expect(pick.currentValue).toBeNull()
    expect(reviews[0].take).toContain('read this loosely')
  })

  it('players with no market value today count as zero with a note', () => {
    const reviews = reviewTrades(league([baseTrade]), { p2: fc(3000, 'RB') }, curve, players, 'me', 2026, thresholds)
    const given = reviews[0].gave[0]
    expect(given.currentValue).toBeNull()
    expect(given.note).toContain('no market value')
  })
})
