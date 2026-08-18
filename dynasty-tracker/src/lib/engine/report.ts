import type { LeaguesConfig, Thresholds } from '../config'
import type { LeagueDerived, PlayersFile, Snapshot } from '../types'
import { ordinal, fmtShare } from '../format'
import { classifyDirection, type Direction } from './direction'
import { buildRankCurve } from './picks'
import { buildTeamProfile, type TeamProfile, type ValuationContext } from './profile'
import {
  generateBuyTargets,
  generateVerdicts,
  type BuyTarget,
  type DisputeMap,
  type ProfileWithDirection,
  type VerdictRow,
} from './verdicts'

// Manual direction overrides, keyed by leagueId then rosterId. Overridden
// directions feed every downstream calculation (verdicts, counterparties,
// buy targets) exactly as if the classifier had produced them.
export type DirectionOverrides = Record<string, Record<number, Direction>>

export interface SummaryRow {
  leagueId: string
  label: string
  direction: Direction
  manual: boolean
  starterRank: number
  totalRank: number
  numTeams: number
  youthShare: number
  pickCapitalValue: number
  pickCapitalRank: number
}

export interface OpponentLine {
  rosterId: number
  ownerName: string
  direction: Direction
  autoDirection: Direction
  manual: boolean
  line: string
}

export interface TeamRanks {
  starter: number
  total: number
  pickCapital: number
}

export interface LeagueReport {
  leagueId: string
  label: string
  derived: LeagueDerived
  numTeams: number
  rosterPositions: string[]
  myProfile: TeamProfile
  myDirection: Direction
  myAutoDirection: Direction
  myDirectionManual: boolean
  myRanks: TeamRanks
  rosterOwners: Record<number, string>
  directionStatement: string
  verdicts: VerdictRow[]
  buyTargets: BuyTarget[]
  opponents: OpponentLine[]
}

export interface ReportModel {
  meta: Snapshot['meta']
  summary: SummaryRow[]
  leagues: LeagueReport[]
}

// 1 = highest value; ties broken by original order.
function rankValues(values: number[]): number[] {
  const order = values.map((value, index) => ({ value, index })).sort((a, b) => b.value - a.value)
  const out = new Array<number>(values.length)
  order.forEach(({ index }, position) => {
    out[index] = position + 1
  })
  return out
}

function directionStatement(direction: Direction, starterRank: number, numTeams: number): string {
  switch (direction) {
    case 'Contender':
      return `The ${ordinal(starterRank)} starting lineup in a ${numTeams}-team league with a win-now core. Push — depth and picks are trade fuel, not furniture.`
    case 'Ascending':
      return 'The value is here but the lineup is not — one or two consolidation trades from contending. Trade quantity for quality.'
    case 'Mushy middle':
      return 'Between lanes — not a contender on win-now weight, not a rebuild on assets. The danger zone: pick a lane this month before the league picks it for you.'
    case 'Rebuilding':
      return 'Bottom-tier lineup with future-weighted assets. Stay the course: sell anything old, accumulate picks and players who peak in two years.'
  }
}

function opponentLine(p: ProfileWithDirection, ranks: TeamRanks, numTeams: number): string {
  const starter = `${ordinal(ranks.starter)} lineup`
  switch (p.direction) {
    case 'Contender':
      return `Contender. ${starter} and ${fmtShare(p.winNowShare)} win-now value — buying vets, selling futures.`
    case 'Ascending':
      return `Ascending. ${ordinal(ranks.total)} in total value with ${fmtShare(p.youthShare)} of it young, but only the ${starter} — a consolidation trade waiting to happen.`
    case 'Rebuilding':
      return `Rebuilding. ${starter} of ${numTeams} with the ${ordinal(ranks.pickCapital)}-best pick capital — will sell any vet for futures.`
    case 'Mushy middle':
      return `Mushy middle. ${starter} and middling value — directionless, which makes them negotiable in both directions.`
  }
}

export function buildReport(
  snapshot: Snapshot,
  players: PlayersFile,
  cfg: LeaguesConfig,
  t: Thresholds,
  overrides: DirectionOverrides = {},
  disputes: DisputeMap = {},
): ReportModel {
  const summary: SummaryRow[] = []
  const leagues: LeagueReport[] = []

  for (const league of snapshot.leagues) {
    const fcMap = snapshot.fantasyCalc[league.fantasyCalcVariant]
    const ctx: ValuationContext = {
      fcMap,
      curve: buildRankCurve(fcMap),
      players,
      thresholds: t,
      // Preseason: no standings yet, so all owed 1sts are valued as mid.
      standings: null,
      currentSeason: Number(snapshot.meta.season),
    }

    const profiles = league.rosters.map((roster) => buildTeamProfile(roster, league, ctx))
    const starterRanks = rankValues(profiles.map((p) => p.starterValue))
    const totalRanks = rankValues(profiles.map((p) => p.totalValue))
    const pickRanks = rankValues(profiles.map((p) => p.pickCapital.total))
    const ranksAt = (i: number): TeamRanks => ({
      starter: starterRanks[i],
      total: totalRanks[i],
      pickCapital: pickRanks[i],
    })

    const withDirections: ProfileWithDirection[] = profiles.map((p, i) => {
      const autoDirection = classifyDirection(
        {
          starterRank: starterRanks[i],
          totalRank: totalRanks[i],
          pickCapitalRank: pickRanks[i],
          youthShare: p.youthShare,
          winNowShare: p.winNowShare,
          record: p.record,
          kind: snapshot.meta.kind,
          numTeams: league.settings.numTeams,
        },
        t,
      )
      const manual = overrides[league.leagueId]?.[p.rosterId]
      return {
        ...p,
        direction: manual ?? autoDirection,
        autoDirection,
        manualDirection: manual !== undefined,
      }
    })

    const myIndex = withDirections.findIndex((p) => p.ownerId === cfg.userId)
    if (myIndex === -1) continue
    const mine = withDirections[myIndex]
    const others = withDirections.filter((_, i) => i !== myIndex)
    const myRanks = ranksAt(myIndex)

    const playerName = (id: string) => players.players[id]?.name ?? fcMap[id]?.name ?? id

    leagues.push({
      leagueId: league.leagueId,
      label: league.label,
      derived: league.settings.derived,
      numTeams: league.settings.numTeams,
      rosterPositions: league.settings.rosterPositions,
      myProfile: mine,
      myDirection: mine.direction,
      myAutoDirection: mine.autoDirection,
      myDirectionManual: mine.manualDirection,
      myRanks,
      rosterOwners: Object.fromEntries(
        league.rosters.map((r) => [
          r.rosterId,
          (r.ownerId && league.users[r.ownerId]) || 'Unclaimed team',
        ]),
      ),
      directionStatement: directionStatement(mine.direction, myRanks.starter, league.settings.numTeams),
      verdicts: generateVerdicts(
        mine,
        others,
        league.settings.rosterPositions,
        t,
        playerName,
        league.leagueId,
        disputes,
      ),
      buyTargets: generateBuyTargets(mine, myRanks.starter, others, league, t),
      opponents: withDirections
        .map((p, i) => ({ p, i }))
        .filter(({ i }) => i !== myIndex)
        .map(({ p, i }) => ({
          rosterId: p.rosterId,
          ownerName: p.ownerName,
          direction: p.direction,
          autoDirection: p.autoDirection,
          manual: p.manualDirection,
          line: opponentLine(p, ranksAt(i), league.settings.numTeams),
        }))
        .sort((a, b) => a.ownerName.localeCompare(b.ownerName)),
    })

    summary.push({
      leagueId: league.leagueId,
      label: league.label,
      direction: mine.direction,
      manual: mine.manualDirection,
      starterRank: myRanks.starter,
      totalRank: myRanks.total,
      numTeams: league.settings.numTeams,
      youthShare: mine.youthShare,
      pickCapitalValue: mine.pickCapital.total,
      pickCapitalRank: myRanks.pickCapital,
    })
  }

  return { meta: snapshot.meta, summary, leagues }
}
