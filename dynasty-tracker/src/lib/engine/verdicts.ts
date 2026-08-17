import type { Thresholds } from '../config'
import type { LeagueSnapshot } from '../types'
import { ordinal, fmtValue } from '../format'
import { classifyArchetype, decliningAgeFor, isRedraftDominant, type Archetype } from './archetype'
import { eligibleSlotsFor, optimalLineup } from './lineup'
import type { Direction } from './direction'
import type { RosterPlayerRow, TeamProfile } from './profile'

export type VerdictKind = 'Sell' | 'Unsure' | 'Hold'

// A dispute is the training signal: the user disagrees with the engine's
// verdict. The full engine context is frozen at dispute time so the training
// report can explain the situation to Claude even after the data moves on.
export interface DisputeContext {
  playerName: string
  position: string
  age: number
  adjValue: number
  trend30Day: number | null
  archetype: Archetype
  myDirection: Direction
  engineVerdict: VerdictKind
  engineReason: string
  season: string
  kind: string
  week: number
}

export interface Dispute {
  leagueId: string
  playerId: string
  desiredVerdict: VerdictKind
  note: string
  createdAt: string
  context: DisputeContext
}

export type DisputeMap = Record<string, Dispute>

export const disputeKey = (leagueId: string, playerId: string) => `${leagueId}:${playerId}`

export interface VerdictDispute {
  desiredVerdict: VerdictKind
  note: string
  createdAt: string
  engineAgrees: boolean
}

export interface VerdictRow {
  playerId: string
  name: string
  position: string
  age: number
  ageEstimated: boolean
  adjValue: number
  trend30Day: number | null
  archetype: Archetype
  verdict: VerdictKind
  reason: string
  counterparty: string | null
  dispute?: VerdictDispute
}

// The verdict the board files the player under: the user's disputed call wins
// on their own board; the engine's view stays on the row for context.
export function effectiveVerdict(row: VerdictRow): VerdictKind {
  return row.dispute?.desiredVerdict ?? row.verdict
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
  autoDirection: Direction
  manualDirection: boolean
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

interface Call {
  verdict: VerdictKind
  reason: string
}

// Direction-first verdict ladder. The same player gets a different verdict on
// different teams — that is the whole point (STRATEGY.md). Two hard rules from
// the research that must never regress:
//   1. A young asset on a rebuild is NEVER sold as duplicate depth. Bench time
//      is irrelevant to a rebuild; value growth is the job.
//   2. An ageing producer who starts for a contender is a HOLD. Production
//      outweighs value bleed while you contend (the Henry rule).
function verdictFor(
  p: RosterPlayerRow,
  archetype: Archetype,
  depth: number,
  direction: Direction,
  t: Thresholds,
): Call {
  const v = t.verdicts
  const benchDepth = !p.inOptimalLineup && !p.onTaxi
  const trendingDown = (p.fc?.trend30Day ?? 0) < 0
  const depthSellEligible =
    benchDepth &&
    archetype !== 'Youth asset' &&
    !v.depthSellExcludePositions.includes(p.position) &&
    depth >= v.sellDuplicateDepthMinCount &&
    p.adjValue >= v.duplicateDepthMinValue

  if (direction === 'Contender') {
    if ((archetype === 'Win-now vet' || archetype === 'Declining') && p.inOptimalLineup) {
      return {
        verdict: 'Hold',
        reason:
          'Ageing, but he starts and scores — on a contender the production outweighs the value bleed. Hold and enjoy.',
      }
    }
    if (archetype === 'Declining') {
      return {
        verdict: 'Sell',
        reason: 'Ageing depth that does not start — the one vet a contender should move, while he still fetches something.',
      }
    }
    if (archetype === 'Youth asset' && benchDepth) {
      if (trendingDown) {
        return {
          verdict: 'Hold',
          reason: 'Young asset in a value dip — never sell the bottom. Revisit when the trend turns.',
        }
      }
      if (p.adjValue >= v.contenderYouthConsolidateMinValue) {
        return {
          verdict: 'Sell',
          reason:
            'Valuable youth doing nothing for your weekly ceiling — up-tier him into a starter upgrade. Consolidate, never discount.',
        }
      }
      return {
        verdict: 'Hold',
        reason: 'Cheap upside stash — costs the lineup nothing. Hold, or use as a trade sweetener.',
      }
    }
    if (depthSellEligible) {
      return {
        verdict: 'Sell',
        reason: `${ordinal(depth)} ${p.position} behind locked starters — real value doing nothing on the bench.`,
      }
    }
    if (p.inOptimalLineup && (archetype === 'Win-now vet' || archetype === 'Prime')) {
      return { verdict: 'Hold', reason: 'Exactly what a contender starts — hold and enjoy.' }
    }
  }

  if (direction === 'Rebuilding') {
    if (archetype === 'Youth asset') {
      return {
        verdict: 'Hold',
        reason: benchDepth
          ? 'Core of the rebuild — bench weeks are irrelevant, value growth is the job. Never sell young assets low.'
          : 'Core of the rebuild — this is what the whole plan is built on.',
      }
    }
    if (archetype === 'Declining') {
      return {
        verdict: 'Sell',
        reason: 'Ageing out on a team going nowhere — sell to a contender while pre-season production panic pays a premium.',
      }
    }
    if (archetype === 'Win-now vet') {
      return {
        verdict: 'Sell',
        reason:
          'Win-now vet on a rebuild — his window closes before this team opens one. Contenders pay most just before the season.',
      }
    }
    if (archetype === 'Prime') {
      if (isRedraftDominant(p.fc, t)) {
        return {
          verdict: 'Sell',
          reason: 'Realised-ceiling producer — he peaks before this rebuild does. Cash him in for youth or a first.',
        }
      }
      return {
        verdict: 'Unsure',
        reason: 'Peaks before this rebuild does — sell if a contender pays up, hold if the window is close.',
      }
    }
    if (depthSellEligible) {
      return {
        verdict: 'Sell',
        reason: `${ordinal(depth)} ${p.position} of real value, past the youth window and outside the lineup — package him up.`,
      }
    }
  }

  if (direction === 'Ascending') {
    if (archetype === 'Youth asset') {
      return {
        verdict: 'Hold',
        reason: 'Exactly the timeline — hold through the quiet weeks. Young value is what this team is being built on.',
      }
    }
    if (archetype === 'Declining') {
      return {
        verdict: 'Sell',
        reason: 'He will not be part of the window this team is building towards — sell while he still produces.',
      }
    }
    if (archetype === 'Win-now vet') {
      return {
        verdict: 'Unsure',
        reason: 'Sell into the pre-season window unless this is the push year — vets only bleed value while you wait.',
      }
    }
    if (depthSellEligible) {
      return {
        verdict: 'Sell',
        reason: `${ordinal(depth)} ${p.position} outside the lineup — consolidation fuel. Trade quantity for quality.`,
      }
    }
  }

  if (direction === 'Mushy middle') {
    if (archetype === 'Youth asset') {
      return {
        verdict: 'Hold',
        reason: 'Whatever lane you pick, he fits it — the middle sells vets, never youth.',
      }
    }
    if (archetype === 'Declining') {
      return {
        verdict: 'Sell',
        reason: 'Ageing while the team drifts — the middle is where his value dies quietly. Move him and pick a lane.',
      }
    }
    if (archetype === 'Win-now vet') {
      return {
        verdict: 'Unsure',
        reason: 'Valuable now, worthless to a rebuild — decide the lane before the market decides for you.',
      }
    }
    if (depthSellEligible) {
      return {
        verdict: 'Sell',
        reason: `${ordinal(depth)} ${p.position} behind locked starters — real value doing nothing on the bench.`,
      }
    }
  }

  // Shared tail: age risk, then default holds.
  if (p.age >= decliningAgeFor(p.position, t) && direction !== 'Contender') {
    return { verdict: 'Unsure', reason: 'Age risk without the decline yet — watch the 30-day trend closely.' }
  }
  if (p.inOptimalLineup) return { verdict: 'Hold', reason: 'Starts every week — hold.' }
  if (p.onTaxi) return { verdict: 'Hold', reason: 'Taxi stash — free upside, nothing to do yet.' }
  return { verdict: 'Hold', reason: 'Fits the timeline — hold.' }
}

export function generateVerdicts(
  mine: ProfileWithDirection,
  others: ProfileWithDirection[],
  t: Thresholds,
  playerName: (id: string) => string,
  leagueId = '',
  disputes: DisputeMap = {},
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
    const archetype = classifyArchetype(p.age, p.position, p.fc, t)
    const depth = depthIndex.get(p.id) ?? 1
    const { verdict, reason } = verdictFor(p, archetype, depth, mine.direction, t)

    const raw = disputes[disputeKey(leagueId, p.id)]
    const dispute: VerdictDispute | undefined = raw
      ? {
          desiredVerdict: raw.desiredVerdict,
          note: raw.note,
          createdAt: raw.createdAt,
          engineAgrees: raw.desiredVerdict === verdict,
        }
      : undefined
    const effective = dispute?.desiredVerdict ?? verdict

    // A named buyer matters whenever either view of the player is a Sell or
    // Unsure — a disputed Hold-to-Sell flip needs a counterparty too.
    const wantsBuyer = (k: VerdictKind) => k !== 'Hold'
    let counterparty: string | null = null
    if (wantsBuyer(verdict) || wantsBuyer(effective)) {
      counterparty = findCounterparty(p, archetype, others, playerName)
      if (counterparty === null && (verdict === 'Sell' || effective === 'Sell')) {
        counterparty = 'No natural buyer yet — shop it broadly'
      }
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
      counterparty,
      dispute,
    })
  }

  const kindOrder: Record<VerdictKind, number> = { Sell: 0, Unsure: 1, Hold: 2 }
  return rows.sort(
    (a, b) => kindOrder[effectiveVerdict(a)] - kindOrder[effectiveVerdict(b)] || b.adjValue - a.adjValue,
  )
}

function targetArchetypesFor(direction: Direction, starterRank: number, numTeams: number): Archetype[] {
  if (direction === 'Contender') return ['Win-now vet', 'Prime']
  // Ascending teams buy players who can still rise: prime pieces entering the
  // window and youth — not ageing vets who bleed value while the team waits.
  if (direction === 'Ascending') return ['Prime', 'Youth asset']
  if (direction === 'Rebuilding') return ['Youth asset']
  // Mushy middle: lean by lineup strength — closer to the top, buy to contend.
  return starterRank <= Math.ceil(numTeams / 2) ? ['Win-now vet', 'Prime'] : ['Youth asset']
}

// Where each kind of asset is naturally for sale.
function sourceDirectionsFor(archetype: Archetype): Direction[] {
  return archetype === 'Youth asset' ? ['Contender', 'Mushy middle'] : ['Rebuilding', 'Ascending']
}

export function generateBuyTargets(
  mine: ProfileWithDirection,
  myStarterRank: number,
  others: ProfileWithDirection[],
  league: LeagueSnapshot,
  t: Thresholds,
): BuyTarget[] {
  const targets = targetArchetypesFor(mine.direction, myStarterRank, league.settings.numTeams)
  const targetSet = new Set(targets)
  // Win-now buys must raise the starting lineup ("does it raise your weekly
  // ceiling?"); youth buys for rebuilding/ascending teams are value plays and
  // are ranked by asset value instead — a stash does not need to start.
  const requireLineupGain = targetSet.has('Win-now vet')

  const myPool = mine.players
    .filter((p) => !p.onTaxi && !p.onIR)
    .map((p) => ({ id: p.id, position: p.position, value: p.adjValue }))

  const candidates: BuyTarget[] = []
  for (const holder of others) {
    for (const p of holder.players) {
      if (p.adjValue < t.verdicts.buyTargetMinAdjValue) continue
      const archetype = classifyArchetype(p.age, p.position, p.fc, t)
      if (!targetSet.has(archetype)) continue
      if (!sourceDirectionsFor(archetype).includes(holder.direction)) continue

      const withPlayer = optimalLineup(
        [...myPool, { id: p.id, position: p.position, value: p.adjValue }],
        league.settings.rosterPositions,
      )
      const marginal = withPlayer.starterValue - mine.starterValue
      if (requireLineupGain && marginal < t.verdicts.minMarginalStarterValue) continue

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
    .sort((a, b) =>
      requireLineupGain
        ? b.marginalStarterValue - a.marginalStarterValue || b.adjValue - a.adjValue
        : b.adjValue - a.adjValue || b.marginalStarterValue - a.marginalStarterValue,
    )
    .slice(0, t.verdicts.buyTargetMaxPerLeague)
}
