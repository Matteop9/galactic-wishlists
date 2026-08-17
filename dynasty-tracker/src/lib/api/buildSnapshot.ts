import type { LeaguesConfig, LeagueConfigEntry, Thresholds } from '../config'
import {
  snapshotSchema,
  type LeagueSnapshot,
  type PlayersFile,
  type Snapshot,
  type TradedPick,
} from '../types'
import { fetchFcValues } from './fantasycalc'
import { sleep, type HttpOptions } from './http'
import { sleeper, type SleeperLeague, type SleeperRoster } from './sleeper'

export class SeasonMismatchError extends Error {}

const FANTASY_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE'])

function deriveFlags(league: SleeperLeague, cfg: LeagueConfigEntry) {
  const scoring = league.scoring_settings
  return {
    tePremium: cfg.overrides.tePremium ?? (scoring.bonus_rec_te ?? 0) > 0,
    fourPointPassTd: cfg.overrides.fourPointPassTd ?? (scoring.pass_td ?? 6) <= 4,
    volumeBonus: cfg.overrides.volumeBonus ?? false,
  }
}

function normaliseRoster(r: SleeperRoster) {
  return {
    rosterId: r.roster_id,
    ownerId: r.owner_id,
    players: r.players ?? [],
    starters: r.starters ?? [],
    taxi: r.taxi ?? [],
    reserve: r.reserve ?? [],
    record: {
      wins: r.settings?.wins ?? 0,
      losses: r.settings?.losses ?? 0,
      ties: r.settings?.ties ?? 0,
      fpts: r.settings?.fpts ?? 0,
      fptsAgainst: r.settings?.fpts_against ?? 0,
    },
  }
}

export async function buildSnapshot(
  cfg: LeaguesConfig,
  t: Thresholds,
  log: (message: string) => void = () => {},
): Promise<Snapshot> {
  const o: HttpOptions = {
    retries: t.refresh.retries,
    retryBackoffMs: t.refresh.retryBackoffMs,
    timeoutMs: t.refresh.timeoutMs,
  }
  const delay = () => sleep(t.refresh.requestDelayMs)

  const state = await sleeper.state(o)
  if (state.league_season !== cfg.season) {
    throw new SeasonMismatchError(
      `Sleeper league season is ${state.league_season} but config/leagues.json says ${cfg.season}. ` +
        `League IDs roll over each season: re-resolve them via ` +
        `https://api.sleeper.app/v1/user/${cfg.userId}/leagues/nfl/${state.league_season} and update the config.`,
    )
  }
  const kind = state.season_type === 'pre' || state.week === 0 ? 'preseason' : 'week'
  const week = kind === 'preseason' ? 0 : state.week
  log(`Sleeper state: season ${state.league_season}, ${state.season_type}, week ${state.week} -> ${kind}`)

  await delay()
  const fc12 = await fetchFcValues(12, o)
  await delay()
  const fc10 = await fetchFcValues(10, o)
  log(
    `FantasyCalc: ${Object.keys(fc12.values).length} players (12-team), ` +
      `${Object.keys(fc10.values).length} (10-team); dropped without sleeperId: ${fc12.droppedNoSleeperId}/${fc10.droppedNoSleeperId}`,
  )

  const leagues: LeagueSnapshot[] = []
  for (const entry of cfg.leagues) {
    await delay()
    const league = await sleeper.league(entry.id, o)
    await delay()
    const rosters = await sleeper.rosters(entry.id, o)
    await delay()
    const users = await sleeper.users(entry.id, o)
    await delay()
    const tradedPicksRaw = await sleeper.tradedPicks(entry.id, o)

    // The current season's rookie draft has already happened; only future picks count.
    const tradedPicks: TradedPick[] = tradedPicksRaw
      .filter((p) => Number(p.season) > Number(cfg.season))
      .map((p) => ({
        season: p.season,
        round: p.round,
        originalRosterId: p.roster_id,
        currentOwnerRosterId: p.owner_id,
        previousOwnerRosterId: p.previous_owner_id,
      }))

    const snapshot: LeagueSnapshot = {
      leagueId: entry.id,
      label: entry.label,
      fantasyCalcVariant: entry.fantasyCalcVariant,
      settings: {
        name: league.name,
        numTeams: league.total_rosters,
        rosterPositions: league.roster_positions,
        taxiSlots: league.settings.taxi_slots ?? 0,
        reserveSlots: league.settings.reserve_slots ?? 0,
        draftRounds: league.settings.draft_rounds ?? 4,
        scoring: {
          passTd: league.scoring_settings.pass_td ?? 6,
          teRecBonus: league.scoring_settings.bonus_rec_te ?? 0,
          ppr: league.scoring_settings.rec ?? 1,
        },
        derived: deriveFlags(league, entry),
      },
      rosters: rosters.map(normaliseRoster),
      users: Object.fromEntries(users.map((u) => [u.user_id, u.display_name])),
      tradedPicks,
    }

    if (kind === 'week') {
      await delay()
      const matchups = await sleeper.matchups(entry.id, week, o)
      snapshot.matchups = matchups.map((m) => ({
        rosterId: m.roster_id,
        matchupId: m.matchup_id,
        points: m.points,
        starters: m.starters,
        playersPoints: m.players_points,
      }))
      await delay()
      snapshot.transactions = await sleeper.transactions(entry.id, week, o)
    }

    leagues.push(snapshot)
    log(`${entry.label}: ${snapshot.rosters.length} rosters, ${tradedPicks.length} future traded picks`)
  }

  return snapshotSchema.parse({
    meta: {
      schemaVersion: 1,
      season: cfg.season,
      kind,
      week,
      fetchedAt: new Date().toISOString(),
      sleeperState: {
        season: state.season,
        seasonType: state.season_type,
        week: state.week,
        displayWeek: state.display_week,
      },
    },
    fantasyCalc: { '12team': fc12.values, '10team': fc10.values },
    leagues,
  })
}

export interface ValidationResult {
  errors: string[]
  warnings: string[]
  joinRates: Record<string, number>
}

export function validateSnapshot(
  snapshot: Snapshot,
  cfg: LeaguesConfig,
  t: Thresholds,
  players?: PlayersFile,
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const joinRates: Record<string, number> = {}

  for (const league of snapshot.leagues) {
    const mine = league.rosters.find((r) => r.ownerId === cfg.userId)
    if (!mine) errors.push(`${league.label}: no roster owned by ${cfg.username} (${cfg.userId})`)

    if (league.rosters.length !== league.settings.numTeams) {
      errors.push(
        `${league.label}: ${league.rosters.length} rosters but league reports ${league.settings.numTeams} teams`,
      )
    }

    if (!league.settings.rosterPositions.includes('SUPER_FLEX')) {
      warnings.push(`${league.label}: no SUPER_FLEX slot in roster_positions — expected a superflex league`)
    }

    if (players) {
      const fcMap = snapshot.fantasyCalc[league.fantasyCalcVariant]
      const relevant: string[] = []
      const unmatched: string[] = []
      for (const roster of league.rosters) {
        for (const id of roster.players) {
          const info = players.players[id]
          if (!info || !FANTASY_POSITIONS.has(info.position)) continue
          relevant.push(id)
          if (!fcMap[id]) unmatched.push(info.name)
        }
      }
      const rate = relevant.length === 0 ? 0 : (relevant.length - unmatched.length) / relevant.length
      joinRates[league.label] = rate
      if (rate < t.refresh.fcJoinRateWarnBelow) {
        warnings.push(
          `${league.label}: FantasyCalc join rate ${(rate * 100).toFixed(1)}% — unmatched: ${[...new Set(unmatched)].join(', ')}`,
        )
      }
    }
  }

  return { errors, warnings, joinRates }
}
