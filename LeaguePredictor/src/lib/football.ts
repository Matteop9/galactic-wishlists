import { getCached } from './cache';
import { currentSeasonYear } from './competitions';
import type { ApiScorer, ApiTableRow, Standings, TeamsDoc, SquadPlayer, ApiTeam } from './types';

const BASE = 'https://api.football-data.org/v4';

const TTL = {
  standings: 15 * 60, // 15 min — the "live" leaderboard freshness
  scorers: 60 * 60, // 1 hour
  teams: 7 * 24 * 60 * 60, // 7 days — season roster barely changes
};

async function apiGet<T>(path: string): Promise<T> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) throw new Error('FOOTBALL_DATA_TOKEN is not set');
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'X-Auth-Token': token },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`football-data ${path} → ${res.status}`);
  }
  return (await res.json()) as T;
}

type StandingsResponse = {
  season: { startDate: string; endDate: string };
  standings: { type: string; table: ApiTableRow[] }[];
};

export async function getStandings(competitionId: number): Promise<Standings> {
  return getCached(`standings:${competitionId}`, TTL.standings, async () => {
    // football-data caches the un-parameterised standings URL separately from the
    // ?season= one, and that copy can go badly stale — the Championship sat on
    // matchday 1's Friday-night result for days while ?season= served the real table.
    // So always pin the season; fall back to the bare URL only if that season 404s
    // (i.e. the new season isn't published yet, in the July/pre-season gap).
    const path = `/competitions/${competitionId}/standings`;
    let data: StandingsResponse;
    try {
      data = await apiGet<StandingsResponse>(`${path}?season=${currentSeasonYear(competitionId)}`);
    } catch (err) {
      console.error(`football: season-pinned standings failed for ${competitionId}`, err);
      data = await apiGet<StandingsResponse>(path);
    }
    const total = data.standings.find((s) => s.type === 'TOTAL') ?? data.standings[0];
    return { season: data.season, table: total?.table ?? [] };
  });
}

export async function getScorers(competitionId: number): Promise<ApiScorer[]> {
  return getCached(`scorers:${competitionId}`, TTL.scorers, async () => {
    const data = await apiGet<{ scorers: ApiScorer[] }>(
      `/competitions/${competitionId}/scorers?limit=25`,
    );
    return data.scorers ?? [];
  });
}

export async function getTeams(competitionId: number): Promise<TeamsDoc> {
  return getCached(`teams:${competitionId}`, TTL.teams, async () => {
    const data = await apiGet<{
      season: { startDate: string; endDate: string };
      teams: (ApiTeam & {
        squad?: { id: number; name: string; position: string | null }[];
      })[];
    }>(`/competitions/${competitionId}/teams`);
    const squad: SquadPlayer[] = [];
    for (const team of data.teams) {
      for (const p of team.squad ?? []) {
        squad.push({
          id: p.id,
          name: p.name,
          position: p.position,
          teamId: team.id,
          teamShortName: team.shortName ?? team.name,
        });
      }
    }
    return {
      season: data.season,
      teams: data.teams.map(({ id, name, shortName, tla, crest }) => ({
        id,
        name,
        shortName: shortName ?? name,
        tla,
        crest,
      })),
      squad,
    };
  });
}
