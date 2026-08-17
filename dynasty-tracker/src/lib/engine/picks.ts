import type { Thresholds } from '../config'
import type { FcValue, TradedPick } from '../types'

export interface PickAsset {
  season: string
  round: number
  originalRosterId: number
  value: number
}

// FantasyCalc values sorted by overallRank; index rank-1 = value at that rank.
export function buildRankCurve(fcMap: Record<string, FcValue>): number[] {
  return Object.values(fcMap)
    .sort((a, b) => a.overallRank - b.overallRank)
    .map((v) => v.value)
}

export function valueAtRank(curve: number[], rank: number): number {
  if (curve.length === 0) return 0
  return curve[Math.min(Math.max(rank, 1), curve.length) - 1]
}

function firstRoundSlot(
  originalRosterId: number,
  standings: Map<number, number> | null,
  t: Thresholds,
): number {
  if (standings === null) return t.picks.firstMidSlot
  const rank = standings.get(originalRosterId)
  if (rank === undefined) return t.picks.firstMidSlot
  // Standings rank 1 = best team: good teams owe late 1sts, bad teams early 1sts.
  if (rank <= t.picks.earlyStandingsCutoff) return t.picks.firstLateSlot
  if (rank >= t.picks.lateStandingsCutoff) return t.picks.firstEarlySlot
  return t.picks.firstMidSlot
}

export function pickCapitalForRoster(
  rosterId: number,
  allRosterIds: number[],
  tradedPicks: TradedPick[],
  draftRounds: number,
  curve: number[],
  standings: Map<number, number> | null,
  currentSeason: number,
  t: Thresholds,
): { total: number; picks: PickAsset[] } {
  const rounds = Math.min(draftRounds, t.picks.roundsValued)
  const picks: PickAsset[] = []

  for (let offset = 1; offset <= t.picks.seasonsAhead; offset++) {
    const season = String(currentSeason + offset)
    for (let round = 1; round <= rounds; round++) {
      for (const originalRosterId of allRosterIds) {
        // Native owner unless a traded_picks row moved it; last row wins on multi-hop trades.
        const moves = tradedPicks.filter(
          (p) => p.season === season && p.round === round && p.originalRosterId === originalRosterId,
        )
        const holder = moves.length > 0 ? moves[moves.length - 1].currentOwnerRosterId : originalRosterId
        if (holder !== rosterId) continue

        const slot =
          round === 1
            ? firstRoundSlot(originalRosterId, standings, t)
            : round === 2
              ? t.picks.secondSlot
              : round === 3
                ? t.picks.thirdSlot
                : t.picks.fourthSlot
        let value = valueAtRank(curve, slot)
        if (offset >= 2) value *= 1 - t.picks.futureSeasonDiscount
        picks.push({ season, round, originalRosterId, value: Math.round(value) })
      }
    }
  }

  picks.sort((a, b) => b.value - a.value)
  return { total: picks.reduce((sum, p) => sum + p.value, 0), picks }
}
