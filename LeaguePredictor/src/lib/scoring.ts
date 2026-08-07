// Pure scoring functions — zero I/O, unit-tested. Computed at render time, never stored.
//
// The game: predict the complete final table. 1 point per position off, per team
// (|predicted − actual|). −5 bonus per competition for calling the top scorer.
// LOWEST total wins.

import type { ApiScorer, ApiTableRow, ScorerPick } from './types';

export const SCORER_BONUS = -5;

export type TableScoreRow = {
  teamId: number;
  predictedPos: number;
  actualPos: number | null; // null → team missing from actual table (defensive)
  diff: number; // |predicted − actual|, 0 when actualPos is null
};

export type TableScore = {
  total: number;
  rows: TableScoreRow[];
};

export function scoreTable(predictedRanking: number[], actualTable: ApiTableRow[]): TableScore {
  // Always use the API's own position field, never the array index.
  const positionByTeam = new Map<number, number>();
  for (const row of actualTable) positionByTeam.set(row.team.id, row.position);

  const rows: TableScoreRow[] = predictedRanking.map((teamId, idx) => {
    const predictedPos = idx + 1;
    const actualPos = positionByTeam.get(teamId) ?? null;
    const diff = actualPos === null ? 0 : Math.abs(predictedPos - actualPos);
    return { teamId, predictedPos, actualPos, diff };
  });

  return { total: rows.reduce((sum, r) => sum + r.diff, 0), rows };
}

export function normaliseName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

export function namesMatch(pick: string, player: string): boolean {
  const a = normaliseName(pick);
  const b = normaliseName(player);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export type ScorerBonusResult = {
  hit: boolean;
  bonus: number; // SCORER_BONUS or 0
  topScorers: string[]; // names of the (possibly joint) current leaders
  pickRank: number | null; // pick's rank in the scorer chart, null if unranked
  pickGoals: number | null;
};

export function scorerBonus(pick: ScorerPick | null, scorers: ApiScorer[]): ScorerBonusResult {
  if (scorers.length === 0 || !pick) {
    return { hit: false, bonus: 0, topScorers: [], pickRank: null, pickGoals: null };
  }
  const maxGoals = Math.max(...scorers.map((s) => s.goals));
  // Joint top scorers all count as #1.
  const top = scorers.filter((s) => s.goals === maxGoals);

  const matches = (s: ApiScorer) =>
    pick.playerId != null ? s.player.id === pick.playerId : namesMatch(pick.playerName, s.player.name);

  const hit = top.some(matches);

  // rank = 1 + number of players with strictly more goals
  const found = scorers.find(matches);
  const pickRank = found ? 1 + scorers.filter((s) => s.goals > found.goals).length : null;

  return {
    hit,
    bonus: hit ? SCORER_BONUS : 0,
    topScorers: top.map((s) => s.player.name),
    pickRank,
    pickGoals: found?.goals ?? null,
  };
}

export type CompetitionScore = {
  competitionId: number;
  tablePoints: number;
  scorerResult: ScorerBonusResult;
  submitted: boolean;
};

export type MemberScore = {
  userId: string;
  competitions: CompetitionScore[];
  total: number;
  complete: boolean; // has predictions for every competition in the league
};

export type MemberPredictionInput = {
  userId: string;
  // keyed by competition id as string, absent → not submitted for that competition
  competitions: Record<string, { ranking: number[]; scorer: ScorerPick | null } | undefined>;
};

export function scoreLeague(
  competitionIds: number[],
  members: MemberPredictionInput[],
  standingsByComp: Record<string, ApiTableRow[]>,
  scorersByComp: Record<string, ApiScorer[]>,
): MemberScore[] {
  const results = members.map((member) => {
    const competitions: CompetitionScore[] = competitionIds.map((compId) => {
      const pred = member.competitions[String(compId)];
      if (!pred || pred.ranking.length === 0) {
        return {
          competitionId: compId,
          tablePoints: 0,
          scorerResult: scorerBonus(null, []),
          submitted: false,
        };
      }
      const table = scoreTable(pred.ranking, standingsByComp[String(compId)] ?? []);
      const scorer = scorerBonus(pred.scorer, scorersByComp[String(compId)] ?? []);
      return {
        competitionId: compId,
        tablePoints: table.total,
        scorerResult: scorer,
        submitted: true,
      };
    });
    const complete = competitions.every((c) => c.submitted);
    const total = competitions.reduce((sum, c) => sum + c.tablePoints + c.scorerResult.bonus, 0);
    return { userId: member.userId, competitions, total, complete };
  });

  // Lowest wins; incomplete members sink to the bottom.
  return results.sort((a, b) => {
    if (a.complete !== b.complete) return a.complete ? -1 : 1;
    return a.total - b.total;
  });
}

// Joint positions for display: equal totals share a rank (1, 2, 2, 4 …)
export function withRanks<T extends { total: number; complete: boolean }>(
  sorted: T[],
): (T & { rank: number })[] {
  let lastTotal: number | null = null;
  let lastRank = 0;
  return sorted.map((row, idx) => {
    const rank = !row.complete || lastTotal === null || row.total !== lastTotal ? idx + 1 : lastRank;
    lastTotal = row.complete ? row.total : null;
    lastRank = rank;
    return { ...row, rank };
  });
}
