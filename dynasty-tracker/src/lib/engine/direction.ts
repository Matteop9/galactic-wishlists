import type { Thresholds } from '../config'

export type Direction = 'Contender' | 'Ascending' | 'Mushy middle' | 'Rebuilding'

export interface DirectionInput {
  starterRank: number
  totalRank: number
  pickCapitalRank: number
  youthShare: number
  winNowShare: number
  record: { wins: number; losses: number; ties: number }
  kind: 'preseason' | 'week'
  numTeams: number
}

export function classifyDirection(i: DirectionInput, t: Thresholds): Direction {
  const d = t.direction
  const games = i.record.wins + i.record.losses + i.record.ties
  const winPct = games > 0 ? (i.record.wins + i.record.ties / 2) / games : 0
  const recordOk = i.kind === 'preseason' || games === 0 || winPct >= d.contenderMinWinPct

  if (i.starterRank <= d.contenderStarterRankMax && i.winNowShare >= d.contenderWinNowShareMin && recordOk) {
    return 'Contender'
  }
  if (
    i.totalRank <= d.ascendingTotalRankMax &&
    i.youthShare >= d.ascendingYouthShareMin &&
    i.starterRank > d.contenderStarterRankMax
  ) {
    return 'Ascending'
  }
  if (
    i.starterRank >= i.numTeams - d.rebuildingStarterRankMinFromBottom + 1 &&
    (i.pickCapitalRank <= d.rebuildingPickCapitalRankMax || i.youthShare >= d.rebuildingYouthShareMin)
  ) {
    return 'Rebuilding'
  }
  return 'Mushy middle'
}
