import type { Direction } from './engine/direction'
import type { DirectionOverrides } from './engine/report'

const OVERRIDES_KEY = 'dynasty_direction_overrides'
const ACTIVE_LEAGUE_KEY = 'dynasty_active_league'

const DIRECTIONS: Direction[] = ['Contender', 'Ascending', 'Mushy middle', 'Rebuilding']

export function loadOverrides(): DirectionOverrides {
  try {
    const parsed = JSON.parse(localStorage.getItem(OVERRIDES_KEY) ?? '{}') as DirectionOverrides
    // Drop anything malformed rather than poisoning the engine.
    const clean: DirectionOverrides = {}
    for (const [leagueId, teams] of Object.entries(parsed)) {
      for (const [rosterId, direction] of Object.entries(teams ?? {})) {
        if (!DIRECTIONS.includes(direction)) continue
        clean[leagueId] = { ...clean[leagueId], [Number(rosterId)]: direction }
      }
    }
    return clean
  } catch {
    return {}
  }
}

export function withOverride(
  overrides: DirectionOverrides,
  leagueId: string,
  rosterId: number,
  direction: Direction | null,
): DirectionOverrides {
  const league = { ...overrides[leagueId] }
  if (direction === null) delete league[rosterId]
  else league[rosterId] = direction
  const next = { ...overrides, [leagueId]: league }
  if (Object.keys(league).length === 0) delete next[leagueId]
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next))
  return next
}

export function loadActiveLeague(): string | null {
  return localStorage.getItem(ACTIVE_LEAGUE_KEY)
}

export function saveActiveLeague(leagueId: string) {
  localStorage.setItem(ACTIVE_LEAGUE_KEY, leagueId)
}
