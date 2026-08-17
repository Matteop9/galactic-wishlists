import { fetchJson, type HttpOptions } from './http'

const BASE = 'https://api.sleeper.app/v1'

export interface SleeperState {
  week: number
  display_week: number
  season: string
  league_season: string
  season_type: string
}

export interface SleeperLeague {
  name: string
  total_rosters: number
  roster_positions: string[]
  scoring_settings: Record<string, number>
  settings: Record<string, number | undefined>
}

export interface SleeperRoster {
  roster_id: number
  owner_id: string | null
  players: string[] | null
  starters: string[] | null
  taxi: string[] | null
  reserve: string[] | null
  settings: {
    wins?: number
    losses?: number
    ties?: number
    fpts?: number
    fpts_against?: number
  } | null
}

export interface SleeperUser {
  user_id: string
  display_name: string
}

export interface SleeperTradedPick {
  season: string
  round: number
  roster_id: number // roster the pick originally belongs to
  owner_id: number // roster that currently holds it
  previous_owner_id: number | null
}

export interface SleeperMatchup {
  roster_id: number
  matchup_id: number | null
  points: number
  starters: string[] | null
  players_points: Record<string, number> | null
}

export interface SleeperPlayer {
  full_name?: string | null
  first_name?: string | null
  last_name?: string | null
  position?: string | null
  team?: string | null
  age?: number | null
  years_exp?: number | null
  injury_status?: string | null
  status?: string | null
}

export const sleeper = {
  state: (o: HttpOptions) => fetchJson<SleeperState>(`${BASE}/state/nfl`, o),
  league: (id: string, o: HttpOptions) => fetchJson<SleeperLeague>(`${BASE}/league/${id}`, o),
  rosters: (id: string, o: HttpOptions) => fetchJson<SleeperRoster[]>(`${BASE}/league/${id}/rosters`, o),
  users: (id: string, o: HttpOptions) => fetchJson<SleeperUser[]>(`${BASE}/league/${id}/users`, o),
  tradedPicks: (id: string, o: HttpOptions) =>
    fetchJson<SleeperTradedPick[]>(`${BASE}/league/${id}/traded_picks`, o),
  matchups: (id: string, week: number, o: HttpOptions) =>
    fetchJson<SleeperMatchup[]>(`${BASE}/league/${id}/matchups/${week}`, o),
  transactions: (id: string, week: number, o: HttpOptions) =>
    fetchJson<unknown[]>(`${BASE}/league/${id}/transactions/${week}`, o),
  players: (o: HttpOptions) => fetchJson<Record<string, SleeperPlayer>>(`${BASE}/players/nfl`, o),
}
