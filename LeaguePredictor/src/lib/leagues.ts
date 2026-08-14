import 'server-only';
import { readDoc, updateDoc, writeDoc, paths } from './store';
import type {
  CodeDoc,
  League,
  LeaguesIndexDoc,
  PredictionDoc,
  CompetitionPrediction,
} from './types';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

export function currentSeasonLabel(): string {
  // European seasons roll over in July
  const now = new Date();
  const startYear = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

function generateInviteCode(): string {
  let code = '';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return code;
}

export async function createLeague(input: {
  name: string;
  competitionIds: number[];
  lockAt: string;
  createdBy: string;
}): Promise<League> {
  // ensure the invite code is unused (collisions astronomically unlikely, but cheap to check)
  let inviteCode = generateInviteCode();
  for (let i = 0; i < 3; i++) {
    if (!(await readDoc<CodeDoc>(paths.code(inviteCode)))) break;
    inviteCode = generateInviteCode();
  }

  const league: League = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    inviteCode,
    season: currentSeasonLabel(),
    competitionIds: input.competitionIds,
    lockAt: input.lockAt,
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
    members: [{ userId: input.createdBy, joinedAt: new Date().toISOString() }],
  };

  await writeDoc<League>(paths.leagueMeta(league.id), league);
  await writeDoc<CodeDoc>(paths.code(inviteCode), { leagueId: league.id });
  await updateDoc<LeaguesIndexDoc>(paths.leaguesIndex, (cur) => ({
    leagues: {
      ...(cur?.leagues ?? {}),
      [league.id]: { name: league.name, season: league.season, memberIds: [input.createdBy] },
    },
  }));
  return league;
}

export async function getLeague(leagueId: string): Promise<League | null> {
  return readDoc<League>(paths.leagueMeta(leagueId));
}

export async function getLeagueByCode(code: string): Promise<League | null> {
  const codeDoc = await readDoc<CodeDoc>(paths.code(code));
  if (!codeDoc) return null;
  return getLeague(codeDoc.leagueId);
}

export async function joinLeague(leagueId: string, userId: string): Promise<League | null> {
  const league = await getLeague(leagueId);
  if (!league) return null;
  if (league.members.some((m) => m.userId === userId)) return league;

  const updated = await updateDoc<League>(paths.leagueMeta(leagueId), (cur) => {
    const current = cur ?? league;
    if (current.members.some((m) => m.userId === userId)) return current;
    return {
      ...current,
      members: [...current.members, { userId, joinedAt: new Date().toISOString() }],
    };
  });
  await updateDoc<LeaguesIndexDoc>(paths.leaguesIndex, (cur) => {
    const leagues = { ...(cur?.leagues ?? {}) };
    const entry = leagues[leagueId] ?? {
      name: updated.name,
      season: updated.season,
      memberIds: [],
    };
    if (!entry.memberIds.includes(userId)) {
      leagues[leagueId] = { ...entry, memberIds: [...entry.memberIds, userId] };
    }
    return { leagues };
  });
  return updated;
}

export async function updateLockAt(leagueId: string, lockAt: string): Promise<League | null> {
  const league = await getLeague(leagueId);
  if (!league) return null;
  return updateDoc<League>(paths.leagueMeta(leagueId), (cur) => ({ ...(cur ?? league), lockAt }));
}

export async function getMyLeagueIds(userId: string): Promise<{ id: string; name: string; season: string }[]> {
  const index = await readDoc<LeaguesIndexDoc>(paths.leaguesIndex);
  if (!index) return [];
  return Object.entries(index.leagues)
    .filter(([, l]) => l.memberIds.includes(userId))
    .map(([id, l]) => ({ id, name: l.name, season: l.season }));
}

export function isLocked(league: League): boolean {
  return Date.now() >= new Date(league.lockAt).getTime();
}

// ---- predictions ----

export async function getPrediction(leagueId: string, userId: string): Promise<PredictionDoc | null> {
  return readDoc<PredictionDoc>(paths.prediction(leagueId, userId));
}

export async function getAllPredictions(
  league: League,
): Promise<Record<string, PredictionDoc | null>> {
  const entries = await Promise.all(
    league.members.map(async (m) => [m.userId, await getPrediction(league.id, m.userId)] as const),
  );
  return Object.fromEntries(entries);
}

export async function savePrediction(
  leagueId: string,
  userId: string,
  competitionId: number,
  prediction: CompetitionPrediction,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const league = await getLeague(leagueId);
  if (!league) return { ok: false, error: 'League not found' };
  if (!league.members.some((m) => m.userId === userId)) {
    return { ok: false, error: 'Not a member of this league' };
  }
  if (!league.competitionIds.includes(competitionId)) {
    return { ok: false, error: 'That competition is not part of this league' };
  }
  if (isLocked(league)) {
    return { ok: false, error: 'Predictions are locked — the season has started' };
  }
  // per-user doc: single writer, no cross-user race
  await updateDoc<PredictionDoc>(paths.prediction(leagueId, userId), (cur) => ({
    competitions: {
      ...(cur?.competitions ?? {}),
      [String(competitionId)]: prediction,
    },
    updatedAt: new Date().toISOString(),
  }));
  return { ok: true };
}
