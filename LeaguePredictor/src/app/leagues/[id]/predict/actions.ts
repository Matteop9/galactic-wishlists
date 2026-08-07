'use server';

import { getSession } from '@/lib/auth';
import { savePrediction } from '@/lib/leagues';
import { getTeams } from '@/lib/football';
import type { ScorerPick } from '@/lib/types';

export type SaveResult = { ok: true } | { ok: false; error: string };

export async function savePredictionAction(
  leagueId: string,
  competitionId: number,
  ranking: number[],
  scorer: ScorerPick | null,
): Promise<SaveResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Signed out — sign in again' };

  if (!Array.isArray(ranking) || ranking.some((n) => typeof n !== 'number')) {
    return { ok: false, error: 'Invalid prediction' };
  }

  // the ranking must be exactly a permutation of the competition's current roster
  const teamsDoc = await getTeams(competitionId);
  const roster = teamsDoc.teams.map((t) => t.id).sort((a, b) => a - b);
  const submitted = [...ranking].sort((a, b) => a - b);
  if (roster.length !== submitted.length || roster.some((id, i) => id !== submitted[i])) {
    return { ok: false, error: 'Team list is out of date — refresh the page and try again' };
  }

  let cleanScorer: ScorerPick | null = null;
  if (scorer && typeof scorer.playerName === 'string' && scorer.playerName.trim()) {
    cleanScorer = {
      playerName: scorer.playerName.trim().slice(0, 60),
      ...(typeof scorer.playerId === 'number' ? { playerId: scorer.playerId } : {}),
    };
  }

  return savePrediction(leagueId, session.userId, competitionId, {
    ranking,
    scorer: cleanScorer,
  });
}
