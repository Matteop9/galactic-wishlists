import { describe, expect, it } from 'vitest'
import { thresholds } from '../src/lib/config'
import type { FcValue } from '../src/lib/types'
import type { TeamProfile } from '../src/lib/engine/profile'
import { checkTrade, type IncomingAsset } from '../src/lib/engine/tradeCheck'
import type { VerdictRow } from '../src/lib/engine/verdicts'

const fc = (over: Partial<FcValue>): FcValue => ({
  value: 2000,
  overallRank: 100,
  positionRank: 30,
  trend30Day: 0,
  tier: null,
  redraftValue: 2000,
  redraftDynastyValueDifference: null,
  age: null,
  name: 'Player',
  position: 'WR',
  ...over,
})

const row = (over: Partial<VerdictRow>): VerdictRow => ({
  playerId: 'give1',
  name: 'Give Player',
  position: 'WR',
  age: 30,
  ageEstimated: false,
  adjValue: 2000,
  trend30Day: 0,
  archetype: 'Win-now vet',
  verdict: 'Sell',
  reason: 'wrong phase',
  counterparty: null,
  ...over,
})

const asset = (over: Partial<IncomingAsset>): IncomingAsset => ({
  playerId: 'get1',
  name: 'Get Player',
  position: 'WR',
  age: 22,
  fc: fc({ value: 2400, redraftValue: 1500 }),
  adjValue: 2400,
  ...over,
})

const emptyProfile: TeamProfile = {
  rosterId: 1,
  ownerId: 'me',
  ownerName: 'Me',
  record: { wins: 0, losses: 0, ties: 0, fpts: 0, fptsAgainst: 0 },
  totalValue: 0,
  starterValue: 0,
  depthValue: 0,
  ageSplit: { young: 0, mid: 0, old: 0 },
  youthShare: 0,
  winNowShare: 0,
  pickCapital: { total: 0, picks: [] },
  lineup: { slots: [], starterValue: 0, starterIds: new Set() },
  players: [],
  unvalued: [],
}

describe('checkTrade — trade shape, not value', () => {
  it('selling an engine-Sell for a youth asset on a rebuild is the right shape', () => {
    const result = checkTrade(
      [row({ verdict: 'Sell' })],
      [asset({ age: 22 })],
      emptyProfile,
      'Rebuilding',
      11,
      12,
      ['QB', 'RB', 'RB', 'WR', 'WR', 'TE'],
      thresholds,
    )
    expect(result.gives[0].grade).toBe('good')
    expect(result.gets[0].grade).toBe('good')
    expect(result.summary).toContain('Right shape')
  })

  it('selling an engine-Hold for a declining asset on a rebuild is the wrong way round', () => {
    const result = checkTrade(
      [row({ verdict: 'Hold', reason: 'core piece' })],
      [asset({ age: 30, position: 'RB', fc: fc({ value: 1500, trend30Day: -200, position: 'RB' }), adjValue: 1500 })],
      emptyProfile,
      'Rebuilding',
      11,
      12,
      ['QB', 'RB', 'RB', 'WR', 'WR', 'TE'],
      thresholds,
    )
    expect(result.gives[0].grade).toBe('bad')
    expect(result.gets[0].grade).toBe('bad')
    expect(result.summary).toContain('Wrong way round')
  })

  it('reports the starting lineup delta from the swap', () => {
    const result = checkTrade(
      [],
      [asset({ adjValue: 2400 })],
      emptyProfile,
      'Contender',
      2,
      12,
      ['WR'],
      thresholds,
    )
    expect(result.starterValueDelta).toBe(2400)
  })

  it('a disputed verdict counts as the user verdict when grading the give side', () => {
    const disputedHold = row({
      verdict: 'Sell',
      dispute: { desiredVerdict: 'Hold', note: '', createdAt: '2026-08-17', engineAgrees: false },
    })
    const result = checkTrade(
      [disputedHold],
      [],
      emptyProfile,
      'Rebuilding',
      11,
      12,
      ['WR'],
      thresholds,
    )
    expect(result.gives[0].grade).toBe('bad')
  })
})
