import type { Thresholds } from '../config'
import type { FcValue, LeagueSnapshot, PlayersFile, RosterSnapshot } from '../types'
import { adjustedValue } from './adjust'
import { optimalLineup, type LineupResult, type PoolPlayer } from './lineup'
import { pickCapitalForRoster, type PickAsset } from './picks'

export interface RosterPlayerRow {
  id: string
  name: string
  position: string
  team: string | null
  age: number
  ageEstimated: boolean
  fc: FcValue | null
  adjValue: number
  onTaxi: boolean
  onIR: boolean
  inOptimalLineup: boolean
}

export interface TeamProfile {
  rosterId: number
  ownerId: string | null
  ownerName: string
  record: RosterSnapshot['record']
  totalValue: number
  starterValue: number
  depthValue: number
  ageSplit: { young: number; mid: number; old: number }
  youthShare: number
  winNowShare: number
  pickCapital: { total: number; picks: PickAsset[] }
  lineup: LineupResult
  players: RosterPlayerRow[]
  unvalued: string[]
}

export interface ValuationContext {
  fcMap: Record<string, FcValue>
  curve: number[]
  players: PlayersFile
  thresholds: Thresholds
  standings: Map<number, number> | null
  currentSeason: number
}

export function buildTeamProfile(
  roster: RosterSnapshot,
  league: LeagueSnapshot,
  ctx: ValuationContext,
): TeamProfile {
  const { fcMap, players, thresholds: t } = ctx
  const derived = league.settings.derived
  const taxi = new Set(roster.taxi)
  const reserve = new Set(roster.reserve)

  const rows: RosterPlayerRow[] = roster.players.map((id) => {
    const info = players.players[id]
    const fc = fcMap[id] ?? null
    const age = info?.age ?? fc?.age ?? null
    return {
      id,
      name: info?.name ?? fc?.name ?? id,
      position: info?.position ?? fc?.position ?? 'UNK',
      team: info?.team ?? null,
      age: age ?? t.ageBands.defaultAge,
      ageEstimated: age === null,
      fc,
      adjValue: fc ? adjustedValue(fc, derived, t) : 0,
      onTaxi: taxi.has(id),
      onIR: reserve.has(id),
      inOptimalLineup: false,
    }
  })

  // Taxi and IR players are excluded from the starting lineup but count
  // towards total value and the age split.
  const pool: PoolPlayer[] = rows
    .filter((r) => !r.onTaxi && !r.onIR)
    .map((r) => ({ id: r.id, position: r.position, value: r.adjValue }))
  const lineup = optimalLineup(pool, league.settings.rosterPositions)
  for (const row of rows) row.inOptimalLineup = lineup.starterIds.has(row.id)

  const totalValue = rows.reduce((sum, r) => sum + r.adjValue, 0)
  const young = rows.filter((r) => r.age <= t.ageBands.youngMax).reduce((s, r) => s + r.adjValue, 0)
  const mid = rows
    .filter((r) => r.age > t.ageBands.youngMax && r.age <= t.ageBands.primeMax)
    .reduce((s, r) => s + r.adjValue, 0)
  const old = totalValue - young - mid
  const ageSplit =
    totalValue > 0
      ? { young: young / totalValue, mid: mid / totalValue, old: old / totalValue }
      : { young: 0, mid: 0, old: 0 }

  const pickCapital = pickCapitalForRoster(
    roster.rosterId,
    league.rosters.map((r) => r.rosterId),
    league.tradedPicks,
    league.settings.draftRounds,
    ctx.curve,
    ctx.standings,
    ctx.currentSeason,
    t,
  )

  return {
    rosterId: roster.rosterId,
    ownerId: roster.ownerId,
    ownerName: (roster.ownerId && league.users[roster.ownerId]) || 'Unclaimed team',
    record: roster.record,
    totalValue,
    starterValue: lineup.starterValue,
    depthValue: totalValue - lineup.starterValue,
    ageSplit,
    youthShare: ageSplit.young,
    winNowShare: 1 - ageSplit.young,
    pickCapital,
    lineup,
    players: rows.sort((a, b) => b.adjValue - a.adjValue),
    unvalued: rows.filter((r) => r.fc === null && !['K', 'DEF'].includes(r.position)).map((r) => r.name),
  }
}
