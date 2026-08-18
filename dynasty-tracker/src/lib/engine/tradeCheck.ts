import type { Thresholds } from '../config'
import type { FcValue } from '../types'
import { classifyArchetype } from './archetype'
import type { Direction } from './direction'
import { optimalLineup, type PoolPlayer } from './lineup'
import type { TeamProfile } from './profile'
import { effectiveVerdict, targetArchetypesFor, type VerdictRow } from './verdicts'

// Trade shape review: not a value calculator (the user has those) — this asks
// whether the RIGHT players are being sold for the RIGHT kind of return given
// the roster's direction.

export interface IncomingAsset {
  playerId: string
  name: string
  position: string
  age: number
  fc: FcValue | null
  adjValue: number
}

export interface MarketPlayer extends IncomingAsset {
  holderName: string
}

export interface TradeNote {
  playerId: string
  name: string
  grade: 'good' | 'neutral' | 'bad'
  note: string
}

export interface TradeCheckResult {
  gives: TradeNote[]
  gets: TradeNote[]
  starterValueDelta: number
  summary: string
}

export function checkTrade(
  gives: VerdictRow[],
  gets: IncomingAsset[],
  myProfile: TeamProfile,
  direction: Direction,
  myStarterRank: number,
  numTeams: number,
  rosterPositions: string[],
  t: Thresholds,
): TradeCheckResult {
  const giveNotes: TradeNote[] = gives.map((row) => {
    const verdict = effectiveVerdict(row)
    if (verdict === 'Sell') {
      return {
        playerId: row.playerId,
        name: row.name,
        grade: 'good',
        note: 'The engine already wants him moved — right player to sell.',
      }
    }
    if (verdict === 'Unsure') {
      return {
        playerId: row.playerId,
        name: row.name,
        grade: 'neutral',
        note: 'Borderline hold — fine to move if the return is right.',
      }
    }
    return {
      playerId: row.playerId,
      name: row.name,
      grade: 'bad',
      note: `The engine wants him kept (${row.reason}) — the return has to win this trade clearly.`,
    }
  })

  const targets = new Set(targetArchetypesFor(direction, myStarterRank, numTeams))
  const getNotes: TradeNote[] = gets.map((g) => {
    const archetype = classifyArchetype(g.age, g.position, g.fc, t)
    if (targets.has(archetype)) {
      return {
        playerId: g.playerId,
        name: g.name,
        grade: 'good',
        note: `${archetype} — right-phase asset for a ${direction.toLowerCase()} roster.`,
      }
    }
    if (archetype === 'Declining') {
      return {
        playerId: g.playerId,
        name: g.name,
        grade: direction === 'Contender' ? 'neutral' : 'bad',
        note:
          direction === 'Contender'
            ? 'Declining — only worth it as cheap production for the lineup; the value will keep bleeding.'
            : 'Declining asset on your timeline — his value dies before your window opens.',
      }
    }
    return {
      playerId: g.playerId,
      name: g.name,
      grade: 'neutral',
      note: `${archetype} — not the archetype a ${direction.toLowerCase()} roster is shopping for.`,
    }
  })

  const giveIds = new Set(gives.map((g) => g.playerId))
  const pool: PoolPlayer[] = myProfile.players
    .filter((p) => !p.onTaxi && !p.onIR && !giveIds.has(p.id))
    .map((p) => ({ id: p.id, position: p.position, value: p.adjValue }))
  for (const g of gets) pool.push({ id: g.playerId, position: g.position, value: g.adjValue })
  const starterValueDelta =
    optimalLineup(pool, rosterPositions).starterValue - myProfile.lineup.starterValue

  const badGives = giveNotes.filter((n) => n.grade === 'bad').length
  const badGets = getNotes.filter((n) => n.grade === 'bad').length
  const goodGets = getNotes.filter((n) => n.grade === 'good').length

  let summary: string
  if (badGives === 0 && badGets === 0 && (goodGets > 0 || gets.length === 0)) {
    summary =
      'Right shape: moving pieces the plan does not need for assets that fit the timeline. Now win the price with the calculators.'
  } else if (badGives > 0 && (badGets > 0 || goodGets === 0)) {
    summary =
      'Wrong way round: giving up pieces the engine wants kept, for assets that do not fit the timeline. Walk away unless the price is silly.'
  } else {
    summary =
      'Mixed shape: part of this trade fits and part does not — the price has to compensate for the wrong-fit side.'
  }

  return { gives: giveNotes, gets: getNotes, starterValueDelta, summary }
}
