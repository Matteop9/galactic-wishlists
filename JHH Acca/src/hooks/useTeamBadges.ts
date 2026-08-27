import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchTeamBadges } from '../lib/queries'

/** Runtime crest overrides keyed by team name (migration 0025). Shared by every
    TeamBadge on the page through one react-query entry, so the table is read
    once per session rather than once per chip. A present key with a null value
    means "no logo on purpose" — the initials chip, but a deliberate one.
    Unauthenticated callers just get an empty map (RLS), which is the same as
    having no overrides, so no gating is needed. */
export function useTeamBadges() {
  const { data } = useQuery({
    queryKey: ['teamBadges'],
    queryFn: fetchTeamBadges,
    staleTime: 10 * 60 * 1000,
    retry: false,
  })
  return useMemo(() => {
    const map: Record<string, string | null> = {}
    for (const r of data ?? []) map[r.team] = r.badge_url
    return map
  }, [data])
}
