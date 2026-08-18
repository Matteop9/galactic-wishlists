import type { Thresholds } from '../config'
import type { PlayersFile, Snapshot } from '../types'
import type { Direction } from './direction'
import type { ReportModel } from './report'
import { effectiveVerdict, type VerdictKind } from './verdicts'

// Cross-league view: which players I hold in how many leagues (correlated
// exposure), and the best players I hold nowhere (the shopping window).

export interface OwnedExposure {
  playerId: string
  name: string
  position: string
  age: number
  leagues: { leagueId: string; label: string; verdict: VerdictKind; adjValue: number }[]
}

export interface UnownedExposure {
  playerId: string
  name: string
  position: string
  age: number | null
  value: number
  leagues: { label: string; holder: string | null; holderDirection: Direction | null }[]
}

export interface ExposureModel {
  owned: OwnedExposure[] // sorted: most leagues first, then best value
  unowned: UnownedExposure[] // top N by 12-team market value
}

export function buildExposure(
  snapshot: Snapshot,
  players: PlayersFile,
  report: ReportModel,
  t: Thresholds,
): ExposureModel {
  const owned = new Map<string, OwnedExposure>()
  for (const league of report.leagues) {
    for (const row of league.verdicts) {
      const entry = owned.get(row.playerId) ?? {
        playerId: row.playerId,
        name: row.name,
        position: row.position,
        age: row.age,
        leagues: [],
      }
      entry.leagues.push({
        leagueId: league.leagueId,
        label: league.label,
        verdict: effectiveVerdict(row),
        adjValue: row.adjValue,
      })
      owned.set(row.playerId, entry)
    }
  }
  const ownedList = [...owned.values()].sort(
    (a, b) =>
      b.leagues.length - a.leagues.length ||
      Math.max(...b.leagues.map((l) => l.adjValue)) - Math.max(...a.leagues.map((l) => l.adjValue)),
  )

  // Directions per league/roster, for naming who holds the players I don't.
  const directionByRoster = new Map<string, Map<number, { name: string; direction: Direction }>>()
  for (const league of report.leagues) {
    const map = new Map<number, { name: string; direction: Direction }>()
    for (const opp of league.opponents) map.set(opp.rosterId, { name: opp.ownerName, direction: opp.direction })
    directionByRoster.set(league.leagueId, map)
  }

  const fc = snapshot.fantasyCalc['12team']
  const unowned: UnownedExposure[] = []
  const ranked = Object.entries(fc).sort((a, b) => a[1].overallRank - b[1].overallRank)
  for (const [playerId, value] of ranked) {
    if (unowned.length >= t.overview.topUnownedCount) break
    if (owned.has(playerId)) continue
    unowned.push({
      playerId,
      name: players.players[playerId]?.name ?? value.name,
      position: players.players[playerId]?.position ?? value.position,
      age: players.players[playerId]?.age ?? value.age,
      value: value.value,
      leagues: snapshot.leagues.map((league) => {
        const roster = league.rosters.find((r) => r.players.includes(playerId))
        if (!roster) return { label: league.label, holder: null, holderDirection: null }
        const info = directionByRoster.get(league.leagueId)?.get(roster.rosterId)
        return {
          label: league.label,
          holder: info?.name ?? (roster.ownerId && league.users[roster.ownerId]) ?? 'Unclaimed team',
          holderDirection: info?.direction ?? null,
        }
      }),
    })
  }

  return { owned: ownedList, unowned }
}
