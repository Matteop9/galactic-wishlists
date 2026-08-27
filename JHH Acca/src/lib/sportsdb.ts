/* TheSportsDB club search, run from the browser so Admin → Team logos can
   resolve a brand-new club's badge without a script rerun or a deploy.
   Key '123' is TheSportsDB's public free-tier key (same one
   scripts/fetch-badges.ts uses for the bulk sweep); the API sends
   Access-Control-Allow-Origin: *, so no proxy or edge function is needed.
   Free tier is ~30 requests/minute — a human clicking Find can't get near it. */

export interface BadgeCandidate {
  id: string
  team: string
  country: string | null
  league: string | null
  /** Base badge URL; '/small' (64px) is appended when we save it. */
  badge: string
}

interface SdbTeam {
  idTeam: string
  strTeam: string
  strSport: string
  strBadge: string | null
  strCountry: string | null
  strLeague: string | null
}

export async function searchClubBadges(query: string): Promise<BadgeCandidate[]> {
  const url = `https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=${encodeURIComponent(query)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`TheSportsDB returned ${res.status}`)
  const body = (await res.json()) as { teams: SdbTeam[] | null }
  return (body.teams ?? [])
    .filter((t) => t.strSport === 'Soccer' && t.strBadge)
    .slice(0, 8)
    .map((t) => ({
      id: t.idTeam,
      team: t.strTeam,
      country: t.strCountry,
      league: t.strLeague,
      badge: t.strBadge!,
    }))
}

/** The URL we store: the 64px variant, which is plenty for every chip size. */
export const smallBadge = (badge: string) => `${badge.replace(/\/small$/, '')}/small`
