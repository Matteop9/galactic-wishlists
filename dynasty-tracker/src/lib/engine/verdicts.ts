import type { Thresholds } from '../config'
import type { LeagueSnapshot } from '../types'
import { ordinal, fmtValue } from '../format'
import { classifyArchetype, type Archetype } from './archetype'
import { eligibleSlotsFor, optimalLineup } from './lineup'
import type { Direction } from './direction'
import type { RosterPlayerRow, TeamProfile } from './profile'

export interface VerdictRow {
  playerId: string
  name: string
  position: string
  age: number
  ageEstimated: boolean
  adjValue: number
  trend30Day: number | null
  archetype: Archetype
  verdict: 'Sell' | 'Hold'
  reason: string
  counterparty: string | null
}

export interface BuyTarget {
  playerId: string
  name: string
  position: string
  age: number
  adjValue: number
  marginalStarterValue: number
  holderName: string
  holderDirection: Direction
  reason: string
}

export interface ProfileWithDirection extends TeamProfile {
  direction: Direction
}

// The weakest starter (by adjusted value) on a profile's optimal lineup at a
// slot the given position could fill. Empty slots count as value 0.
function weakestEligibleStarter(
  profile: TeamProfile,
  position: string,
): { slot: string; value: number; playerId: string | null } | null {
  const eligible = new Set(eligibleSlotsFor(position))
  let weakest: { slot: string; value: number; playerId: string | null } | null = null
  for (const s of profile.lineup.slots) {
    if (!eligible.has(s.slot)) continue
    const value = s.player?.value ?? 0
    if (weakest === null || value < weakest.value) {
      weakest = { slot: s.slot, value, playerId: s.player?.id ?? null }
    }
  }
  return weakest
}

function buyerDirectionsFor(archetype: Archetype): Direction[] {
  // Who buys this kind of asset: win-now pieces go to teams pushing, youth to teams waiting.
  if (archetype === 'Youth asset') return ['Rebuilding', 'Ascending']
  return ['Contender', 'Mushy middle']
}

function findCounterparty(
  player: RosterPlayerRow,
  archetype: Archetype,
  others: ProfileWithDirection[],
  playerName: (id: string) => string,
): string | null {
  const buyerDirections = new Set(buyerDirectionsFor(archetype))
  let best: { text: string; gap: number } | null = null
  for (const other of others) {
    if (!buyerDirections.has(other.direction)) continue
    const weakest = weakestEligibleStarter(other, player.position)
    if (!weakest) continue
    const gap = player.adjValue - weakest.value
    if (gap <= 0) continue
    const startsNow =
      weakest.playerId === null
        ? `has an empty ${weakest.slot} slot`
        : `starts ${playerName(weakest.playerId)} (${fmtValue(weakest.value)}) at ${weakest.slot}`
    const text = `${other.ownerName} (${other.direction}) — ${startsNow}; he clears it by ${fmtValue(gap)}`
    if (best === null || gap > best.gap) best = { text, gap }
  }
  return best?.text ?? null
}

export function generateVerdicts(
  mine: ProfileWithDirection,
  others: ProfileWithDirection[],
  t: Thresholds,
  playerName: (id: string) => string,
): VerdictRow[] {
  const rows: VerdictRow[] = []
  const valued = mine.players.filter((p) => p.adjValue > 0)

  // Depth index: my Nth-best player at each position, 1 = best.
  const depthIndex = new Map<string, number>()
  const byPosition = new Map<string, RosterPlayerRow[]>()
  for (const p of valued) {
    const list = byPosition.get(p.position) ?? []
    list.push(p)
    byPosition.set(p.position, list)
  }
  for (const list of byPosition.values()) {
    list.sort((a, b) => b.adjValue - a.adjValue)
    list.forEach((p, i) => depthIndex.set(p.id, i + 1))
  }

  for (const p of valued) {
    const archetype = classifyArchetype(p.age, p.fc, t)
    const depth = depthIndex.get(p.id) ?? 1
    let verdict: 'Sell' | 'Hold' = 'Hold'
    let reason = ''

    if (archetype === 'Declining') {
      verdict = 'Sell'
      reason = 'Ageing out with a falling market — value only goes one way from here.'
    } else if (mine.direction === 'Rebuilding' && archetype === 'Win-now vet') {
      verdict = 'Sell'
      reason = 'Win-now vet on a rebuild — his window closes before this team opens one.'
    } else if (mine.direction === 'Contender' && archetype === 'Youth asset' && !p.inOptimalLineup) {
      verdict = 'Sell'
      reason = 'Young stash on a win-now roster — convert him into someone who starts.'
    } else if (
      !p.inOptimalLineup &&
      !p.onTaxi &&
      depth >= t.verdicts.sellDuplicateDepthMinCount &&
      p.adjValue >= t.verdicts.duplicateDepthMinValue
    ) {
      verdict = 'Sell'
      reason = `${ordinal(depth)} ${p.position} behind locked starters — real value doing nothing on the bench.`
    } else if (mine.direction === 'Rebuilding' && archetype === 'Youth asset') {
      reason = 'Core of the rebuild — this is what the whole plan is built on.'
    } else if (
      mine.direction === 'Contender' &&
      p.inOptimalLineup &&
      (archetype === 'Win-now vet' || archetype === 'Prime')
    ) {
      reason = 'Exactly what a contender starts — hold and enjoy.'
    } else if (p.inOptimalLineup) {
      reason = 'Starts every week — hold.'
    } else if (p.onTaxi) {
      reason = 'Taxi stash — free upside, nothing to do yet.'
    } else {
      reason = 'Fits the timeline — hold.'
    }

    rows.push({
      playerId: p.id,
      name: p.name,
      position: p.position,
      age: p.age,
      ageEstimated: p.ageEstimated,
      adjValue: p.adjValue,
      trend30Day: p.fc?.trend30Day ?? null,
      archetype,
      verdict,
      reason,
      counterparty:
        verdict === 'Sell'
          ? (findCounterparty(p, archetype, others, playerName) ?? 'No natural buyer yet — shop it broadly')
          : null,
    })
  }

  // Sells first, then by value.
  return rows.sort((a, b) => (a.verdict === b.verdict ? b.adjValue - a.adjValue : a.verdict === 'Sell' ? -1 : 1))
}

function targetArchetypesFor(direction: Direction, starterRank: number, numTeams: number): Archetype[] {
  if (direction === 'Contender') return ['Win-now vet', 'Prime']
  if (direction === 'Ascending') return ['Prime', 'Win-now vet']
  if (direction === 'Rebuilding') return ['Youth asset']
  // Mushy middle: lean by lineup strength — closer to the top, buy to contend.
  return starterRank <= Math.ceil(numTeams / 2) ? ['Win-now vet', 'Prime'] : ['Youth asset']
}

function sourceDirectionsFor(targets: Archetype[]): Direction[] {
  return targets.includes('Youth asset') ? ['Contender', 'Mushy middle'] : ['Rebuilding', 'Ascending']
}

export function generateBuyTargets(
  mine: ProfileWithDirection,
  myStarterRank: number,
  others: ProfileWithDirection[],
  league: LeagueSnapshot,
  t: Thresholds,
): BuyTarget[] {
  const targets = targetArchetypesFor(mine.direction, myStarterRank, league.settings.numTeams)
  const sources = new Set(sourceDirectionsFor(targets))
  const targetSet = new Set(targets)

  const myPool = mine.players
    .filter((p) => !p.onTaxi && !p.onIR)
    .map((p) => ({ id: p.id, position: p.position, value: p.adjValue }))

  const candidates: BuyTarget[] = []
  for (const holder of others) {
    if (!sources.has(holder.direction)) continue
    for (const p of holder.players) {
      if (p.adjValue < t.verdicts.buyTargetMinAdjValue) continue
      const archetype = classifyArchetype(p.age, p.fc, t)
      if (!targetSet.has(archetype)) continue

      const withPlayer = optimalLineup(
        [...myPool, { id: p.id, position: p.position, value: p.adjValue }],
        league.settings.rosterPositions,
      )
      const marginal = withPlayer.starterValue - mine.starterValue
      if (marginal < t.verdicts.minMarginalStarterValue) continue

      const surplus = !p.inOptimalLineup
      const phrases = [`wrong-phase asset for a ${holder.direction.toLowerCase()} roster`]
      if (surplus) phrases.push('does not crack their optimal lineup')
      if ((p.fc?.trend30Day ?? 0) < 0) phrases.push('value drifting down — buy the dip')
      candidates.push({
        playerId: p.id,
        name: p.name,
        position: p.position,
        age: p.age,
        adjValue: p.adjValue,
        marginalStarterValue: marginal,
        holderName: holder.ownerName,
        holderDirection: holder.direction,
        reason: phrases.join('; '),
      })
    }
  }

  return candidates
    .sort((a, b) => b.marginalStarterValue - a.marginalStarterValue || b.adjValue - a.adjValue)
    .slice(0, t.verdicts.buyTargetMaxPerLeague)
}
