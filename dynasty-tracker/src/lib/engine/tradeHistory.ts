import type { Thresholds } from '../config'
import type { FcValue, LeagueSnapshot, PlayersFile, TradeRecord } from '../types'
import { adjustedValue } from './adjust'
import { valueAtRank } from './picks'
import { ordinal } from '../format'

// Hindsight review of completed trades: what each side is worth on TODAY's
// market. Historical prices are not stored anywhere free, so this is honest
// hindsight, not a claim about whether the price was right on the day.

export interface ReviewedAsset {
  kind: 'player' | 'pick'
  playerId: string | null
  name: string
  position: string | null
  currentValue: number | null // null = cannot be valued (pick already drafted, player off the market)
  note: string | null
}

export interface ReviewedTrade {
  id: string
  created: number
  season: string
  week: number
  counterparties: string[]
  gave: ReviewedAsset[]
  got: ReviewedAsset[]
  gaveValue: number
  gotValue: number
  netValue: number
  take: string
  outcome: 'ahead' | 'behind' | 'even'
}

function pickValue(
  pick: TradeRecord['draftPicks'][number],
  curve: number[],
  currentSeason: number,
  t: Thresholds,
): number | null {
  const season = Number(pick.season)
  if (season <= currentSeason) return null // already drafted — became a player we cannot trace
  const slot =
    pick.round === 1
      ? t.picks.firstMidSlot
      : pick.round === 2
        ? t.picks.secondSlot
        : pick.round === 3
          ? t.picks.thirdSlot
          : t.picks.fourthSlot
  let value = valueAtRank(curve, slot)
  if (season - currentSeason >= 2) value *= 1 - t.picks.futureSeasonDiscount
  return Math.round(value)
}

export function reviewTrades(
  league: LeagueSnapshot,
  fcMap: Record<string, FcValue>,
  curve: number[],
  players: PlayersFile,
  userId: string,
  currentSeason: number,
  t: Thresholds,
): ReviewedTrade[] {
  const trades = league.trades ?? []
  const reviews: ReviewedTrade[] = []

  for (const trade of trades) {
    const myRosterIds = new Set(
      trade.rosterIds.filter((rid) => trade.ownerByRosterId[String(rid)] === userId),
    )
    if (myRosterIds.size === 0) continue

    const playerAsset = (playerId: string): Omit<ReviewedAsset, 'note'> & { note: string | null } => {
      const fc = fcMap[playerId] ?? null
      const info = players.players[playerId]
      return {
        kind: 'player',
        playerId,
        name: info?.name ?? fc?.name ?? `Player ${playerId}`,
        position: info?.position ?? fc?.position ?? null,
        currentValue: fc ? adjustedValue(fc, league.settings.derived, t) : null,
        note: fc ? null : 'no market value today',
      }
    }

    const gave: ReviewedAsset[] = []
    const got: ReviewedAsset[] = []
    for (const [playerId, toRosterId] of Object.entries(trade.adds)) {
      if (myRosterIds.has(toRosterId)) got.push(playerAsset(playerId))
      else gave.push(playerAsset(playerId))
    }
    for (const pick of trade.draftPicks) {
      const value = pickValue(pick, curve, currentSeason, t)
      const asset: ReviewedAsset = {
        kind: 'pick',
        playerId: null,
        name: `${pick.season} ${ordinal(pick.round)}`,
        position: null,
        currentValue: value,
        note: value === null ? 'already drafted — not traceable' : null,
      }
      if (myRosterIds.has(pick.toRosterId)) got.push(asset)
      else if (pick.fromRosterId !== null && myRosterIds.has(pick.fromRosterId)) gave.push(asset)
    }
    if (gave.length === 0 && got.length === 0) continue

    const counterparties = [
      ...new Set(
        trade.rosterIds
          .filter((rid) => !myRosterIds.has(rid))
          .map((rid) => {
            const ownerId = trade.ownerByRosterId[String(rid)]
            return (ownerId && league.users[ownerId]) || 'Former manager'
          }),
      ),
    ]

    const gaveValue = gave.reduce((sum, a) => sum + (a.currentValue ?? 0), 0)
    const gotValue = got.reduce((sum, a) => sum + (a.currentValue ?? 0), 0)
    const netValue = gotValue - gaveValue
    const outcome: ReviewedTrade['outcome'] =
      Math.abs(netValue) <= t.trades.evenBand ? 'even' : netValue > 0 ? 'ahead' : 'behind'
    const untraceable = [...gave, ...got].some((a) => a.currentValue === null)
    const take =
      (outcome === 'even'
        ? 'Even on today’s numbers.'
        : outcome === 'ahead'
          ? 'Ahead on today’s numbers.'
          : 'Behind on today’s numbers.') +
      (untraceable ? ' Some pieces cannot be valued any more, so read this loosely.' : '')

    reviews.push({
      id: trade.id,
      created: trade.created,
      season: trade.season,
      week: trade.week,
      counterparties,
      gave,
      got,
      gaveValue,
      gotValue,
      netValue,
      take,
      outcome,
    })
  }

  return reviews.sort((a, b) => b.created - a.created)
}
