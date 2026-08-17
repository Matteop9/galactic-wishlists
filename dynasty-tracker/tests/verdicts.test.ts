import { describe, expect, it } from 'vitest'
import { thresholds } from '../src/lib/config'
import type { FcValue } from '../src/lib/types'
import type { RosterPlayerRow } from '../src/lib/engine/profile'
import {
  disputeKey,
  effectiveVerdict,
  generateVerdicts,
  type Dispute,
  type ProfileWithDirection,
  type VerdictKind,
} from '../src/lib/engine/verdicts'
import type { Direction } from '../src/lib/engine/direction'

function fc(over: Partial<FcValue>): FcValue {
  return {
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
  }
}

let nextId = 0
function player(over: Partial<RosterPlayerRow> & { fcOver?: Partial<FcValue> }): RosterPlayerRow {
  const { fcOver, ...rest } = over
  const id = rest.id ?? `p${++nextId}`
  return {
    id,
    name: rest.name ?? `Player ${id}`,
    position: 'WR',
    team: null,
    age: 25,
    ageEstimated: false,
    fc: fc({ ...(fcOver ?? {}) }),
    adjValue: fcOver?.value ?? 2000,
    onTaxi: false,
    onIR: false,
    inOptimalLineup: false,
    ...rest,
  }
}

function profile(direction: Direction, players: RosterPlayerRow[]): ProfileWithDirection {
  return {
    rosterId: 1,
    ownerId: 'me',
    ownerName: 'Me',
    record: { wins: 0, losses: 0, ties: 0, fpts: 0, fptsAgainst: 0 },
    totalValue: players.reduce((s, p) => s + p.adjValue, 0),
    starterValue: 0,
    depthValue: 0,
    ageSplit: { young: 0, mid: 0, old: 0 },
    youthShare: 0,
    winNowShare: 0,
    pickCapital: { total: 0, picks: [] },
    lineup: { slots: [], starterValue: 0, starterIds: new Set<string>() },
    players,
    unvalued: [],
    direction,
    autoDirection: direction,
    manualDirection: false,
  }
}

// No flex: WR/RB can start 2 apiece, so the 4th at a position is true depth.
const SHALLOW_POSITIONS = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE']
// The user's deep-flex case: 2 RB + 3 FLEX means five RBs can start at once.
const DEEP_FLEX_POSITIONS = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'FLEX', 'FLEX', 'SUPER_FLEX']

function verdictOf(
  direction: Direction,
  target: RosterPlayerRow,
  rest: RosterPlayerRow[] = [],
  rosterPositions: string[] = SHALLOW_POSITIONS,
) {
  const rows = generateVerdicts(profile(direction, [target, ...rest]), [], rosterPositions, thresholds, (id) => id)
  const row = rows.find((r) => r.playerId === target.id)
  if (!row) throw new Error('target row missing')
  return row
}

// Three locked starters ahead of the target so the target is WR4 depth.
function threeStarterWrs(): RosterPlayerRow[] {
  return [1, 2, 3].map((i) =>
    player({ id: `wr${i}`, position: 'WR', age: 26, inOptimalLineup: true, fcOver: { value: 6000 } }),
  )
}

describe('generateVerdicts — regression cases from STRATEGY.md', () => {
  it('22-year-old rookie WR4 on a rebuild is a Hold, never duplicate-depth sell', () => {
    const rookie = player({
      id: 'rookie',
      position: 'WR',
      age: 22,
      inOptimalLineup: false,
      fcOver: { value: 2400, redraftValue: 1200 },
    })
    const row = verdictOf('Rebuilding', rookie, threeStarterWrs())
    expect(row.archetype).toBe('Youth asset')
    expect(row.verdict).toBe('Hold')
    expect(row.reason).toContain('rebuild')
  })

  it('a young asset is a youth asset by age alone, even when redraft value matches dynasty value', () => {
    const rookie = player({
      id: 'rookie2',
      position: 'WR',
      age: 22,
      fcOver: { value: 2000, redraftValue: 2000 },
    })
    const row = verdictOf('Rebuilding', rookie, threeStarterWrs())
    expect(row.archetype).toBe('Youth asset')
    expect(row.verdict).toBe('Hold')
  })

  it('the Henry rule: an ageing RB who starts for a contender is a Hold despite a falling trend', () => {
    const henry = player({
      id: 'henry',
      position: 'RB',
      age: 31,
      inOptimalLineup: true,
      fcOver: { value: 3000, redraftValue: 5200, trend30Day: -300, position: 'RB' },
    })
    const row = verdictOf('Contender', henry)
    expect(row.archetype).toBe('Declining')
    expect(row.verdict).toBe('Hold')
    expect(row.reason).toContain('production')
  })

  it('the same ageing RB on a rebuild is a Sell', () => {
    const henry = player({
      id: 'henry2',
      position: 'RB',
      age: 31,
      inOptimalLineup: true,
      fcOver: { value: 3000, redraftValue: 5200, trend30Day: -300, position: 'RB' },
    })
    expect(verdictOf('Rebuilding', henry).verdict).toBe('Sell')
  })

  it('an ageing vet who does NOT start for a contender is a Sell', () => {
    const vet = player({
      id: 'vet',
      position: 'RB',
      age: 30,
      inOptimalLineup: false,
      fcOver: { value: 1500, redraftValue: 2600, trend30Day: -100, position: 'RB' },
    })
    expect(verdictOf('Contender', vet).verdict).toBe('Sell')
  })

  it('valuable bench youth on a contender is consolidation fuel (Sell to up-tier) when not trending down', () => {
    const stash = player({
      id: 'stash',
      position: 'WR',
      age: 23,
      inOptimalLineup: false,
      fcOver: { value: 3500, redraftValue: 1800, trend30Day: 50 },
    })
    const row = verdictOf('Contender', stash, threeStarterWrs())
    expect(row.verdict).toBe('Sell')
    expect(row.reason).toContain('up-tier')
  })

  it('bench youth on a contender is never sold into a value dip', () => {
    const stash = player({
      id: 'dip',
      position: 'WR',
      age: 23,
      inOptimalLineup: false,
      fcOver: { value: 3500, redraftValue: 1800, trend30Day: -400 },
    })
    expect(verdictOf('Contender', stash, threeStarterWrs()).verdict).toBe('Hold')
  })

  it('cheap bench youth on a contender is a Hold', () => {
    const stash = player({
      id: 'cheap',
      position: 'WR',
      age: 23,
      inOptimalLineup: false,
      fcOver: { value: 1200, redraftValue: 900, trend30Day: 20 },
    })
    expect(verdictOf('Contender', stash, threeStarterWrs()).verdict).toBe('Hold')
  })

  it('backup QBs are never depth-sold in superflex', () => {
    const qbs = [1, 2].map((i) =>
      player({ id: `qb${i}`, position: 'QB', age: 27, inOptimalLineup: true, fcOver: { value: 6000, position: 'QB' } }),
    )
    const qb3 = player({
      id: 'qb3',
      position: 'QB',
      age: 26,
      inOptimalLineup: false,
      fcOver: { value: 1800, redraftValue: 1800, position: 'QB' },
    })
    expect(verdictOf('Contender', qb3, qbs).verdict).not.toBe('Sell')
  })

  it('a redraft-dominant prime producer on a rebuild is a Sell (realised ceiling)', () => {
    const producer = player({
      id: 'prime',
      position: 'WR',
      age: 26,
      inOptimalLineup: true,
      fcOver: { value: 3000, redraftValue: 3600 },
    })
    const row = verdictOf('Rebuilding', producer)
    expect(row.archetype).toBe('Prime')
    expect(row.verdict).toBe('Sell')
  })

  it('duplicate non-youth depth on a contender still gets the depth sell', () => {
    const depth = player({
      id: 'depth',
      position: 'WR',
      age: 26,
      inOptimalLineup: false,
      fcOver: { value: 1500, redraftValue: 1500 },
    })
    const row = verdictOf('Contender', depth, threeStarterWrs())
    expect(row.verdict).toBe('Sell')
    expect(row.reason).toContain('bench')
  })
})

function rbStarters(n: number): RosterPlayerRow[] {
  return Array.from({ length: n }, (_, i) =>
    player({
      id: `rb${i + 1}`,
      position: 'RB',
      age: 26,
      inOptimalLineup: i < 5,
      fcOver: { value: 6000 - i * 200, position: 'RB' },
    }),
  )
}

describe('generateVerdicts — depth is league-structure-relative (Matteo, 2026-08-17)', () => {
  it('deep-flex league (2 RB + 3 FLEX): the 5th RB is startable depth, never a duplicate-depth sell', () => {
    const rb5 = player({
      id: 'rb5',
      position: 'RB',
      age: 26,
      inOptimalLineup: false,
      fcOver: { value: 1500, redraftValue: 1500, position: 'RB' },
    })
    const row = verdictOf('Contender', rb5, rbStarters(4), DEEP_FLEX_POSITIONS)
    expect(row.verdict).toBe('Hold')
  })

  it('deep-flex league: the 7th RB of real value is still a depth sell', () => {
    const rb7 = player({
      id: 'rb7',
      position: 'RB',
      age: 26,
      inOptimalLineup: false,
      fcOver: { value: 1500, redraftValue: 1500, position: 'RB' },
    })
    const row = verdictOf('Contender', rb7, rbStarters(6), DEEP_FLEX_POSITIONS)
    expect(row.verdict).toBe('Sell')
    expect(row.reason).toContain('7th RB')
  })

  it('the same 4th WR is depth in a no-flex league but a hold in a deep-flex league', () => {
    const mk = () =>
      player({
        id: 'wr4',
        position: 'WR',
        age: 26,
        inOptimalLineup: false,
        fcOver: { value: 1500, redraftValue: 1500 },
      })
    expect(verdictOf('Contender', mk(), threeStarterWrs(), SHALLOW_POSITIONS).verdict).toBe('Sell')
    expect(verdictOf('Contender', mk(), threeStarterWrs(), DEEP_FLEX_POSITIONS).verdict).toBe('Hold')
  })
})

function mkDispute(leagueId: string, playerId: string, desiredVerdict: VerdictKind, note = ''): Dispute {
  return {
    leagueId,
    playerId,
    desiredVerdict,
    note,
    createdAt: '2026-08-17T12:00:00.000Z',
    context: {
      playerName: 'Player',
      position: 'WR',
      age: 25,
      adjValue: 2000,
      trend30Day: 0,
      archetype: 'Prime',
      myDirection: 'Contender',
      engineVerdict: 'Hold',
      engineReason: 'test',
      season: '2026',
      kind: 'preseason',
      week: 0,
    },
  }
}

describe('generateVerdicts — disputes (training loop)', () => {
  it('a dispute re-files the row under the desired verdict while preserving the engine view', () => {
    const vet = player({
      id: 'vet',
      position: 'RB',
      age: 30,
      inOptimalLineup: false,
      fcOver: { value: 1500, redraftValue: 2600, trend30Day: -100, position: 'RB' },
    })
    const disputes = { [disputeKey('L1', 'vet')]: mkDispute('L1', 'vet', 'Hold', 'handcuff I trust') }
    const rows = generateVerdicts(profile('Contender', [vet]), [], SHALLOW_POSITIONS, thresholds, (id) => id, 'L1', disputes)
    const row = rows.find((r) => r.playerId === 'vet')!
    expect(row.verdict).toBe('Sell') // engine's own view unchanged
    expect(row.dispute?.desiredVerdict).toBe('Hold')
    expect(row.dispute?.engineAgrees).toBe(false)
    expect(effectiveVerdict(row)).toBe('Hold')
  })

  it('engineAgrees flips true when the engine matches the disputed verdict', () => {
    const starter = player({
      id: 'starter',
      position: 'WR',
      age: 26,
      inOptimalLineup: true,
      fcOver: { value: 5000, redraftValue: 5000 },
    })
    const disputes = { [disputeKey('L1', 'starter')]: mkDispute('L1', 'starter', 'Hold') }
    const rows = generateVerdicts(profile('Contender', [starter]), [], SHALLOW_POSITIONS, thresholds, (id) => id, 'L1', disputes)
    const row = rows.find((r) => r.playerId === 'starter')!
    expect(row.verdict).toBe('Hold')
    expect(row.dispute?.engineAgrees).toBe(true)
  })

  it('a Hold-to-Sell dispute gets a named counterparty', () => {
    const starter = player({
      id: 'mine',
      position: 'WR',
      age: 26,
      inOptimalLineup: true,
      fcOver: { value: 4000, redraftValue: 4000 },
    })
    const buyer: ProfileWithDirection = {
      ...profile('Contender', []),
      rosterId: 2,
      ownerId: 'them',
      ownerName: 'Them',
      lineup: {
        slots: [{ slot: 'WR', player: { id: 'weak', position: 'WR', value: 500 } }],
        starterValue: 500,
        starterIds: new Set(['weak']),
      },
    }
    const disputes = { [disputeKey('L1', 'mine')]: mkDispute('L1', 'mine', 'Sell', 'want to cash out') }
    const rows = generateVerdicts(profile('Contender', [starter]), [buyer], SHALLOW_POSITIONS, thresholds, (id) => id, 'L1', disputes)
    const row = rows.find((r) => r.playerId === 'mine')!
    expect(row.verdict).toBe('Hold')
    expect(effectiveVerdict(row)).toBe('Sell')
    expect(row.counterparty).toContain('Them')
  })

  it('rows without disputes are untouched', () => {
    const p = player({ id: 'plain', position: 'WR', age: 26, inOptimalLineup: true })
    const rows = generateVerdicts(profile('Contender', [p]), [], SHALLOW_POSITIONS, thresholds, (id) => id, 'L1', {})
    expect(rows.find((r) => r.playerId === 'plain')!.dispute).toBeUndefined()
  })
})
