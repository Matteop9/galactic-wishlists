// Per-team intel notes: pasted chat snippets and observations from talking to
// league mates — what they want, how they rate their team, trades off the
// menu. Local-only (localStorage), keyed `${leagueId}:${rosterId}`.
const INTEL_KEY = 'dynasty_team_intel'

export type IntelMap = Record<string, string>

export const intelKey = (leagueId: string, rosterId: number) => `${leagueId}:${rosterId}`

export function loadIntel(): IntelMap {
  try {
    const parsed = JSON.parse(localStorage.getItem(INTEL_KEY) ?? '{}') as IntelMap
    return Object.fromEntries(Object.entries(parsed).filter(([, v]) => typeof v === 'string' && v.trim() !== ''))
  } catch {
    return {}
  }
}

export function withIntel(map: IntelMap, leagueId: string, rosterId: number, text: string): IntelMap {
  const next = { ...map }
  const key = intelKey(leagueId, rosterId)
  if (text.trim() === '') delete next[key]
  else next[key] = text
  localStorage.setItem(INTEL_KEY, JSON.stringify(next))
  return next
}
