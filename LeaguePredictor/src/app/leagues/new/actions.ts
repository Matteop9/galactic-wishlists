'use server';

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { createLeague } from '@/lib/leagues';
import { COMPETITIONS } from '@/lib/competitions';

export type CreateLeagueState = { error?: string };

export async function createLeagueAction(
  _prev: CreateLeagueState | undefined,
  formData: FormData,
): Promise<CreateLeagueState> {
  const session = await getSession();
  if (!session) redirect('/login?next=/leagues/new');

  const name = String(formData.get('name') ?? '').trim();
  const lockAtRaw = String(formData.get('lockAt') ?? '');
  const competitionIds = formData
    .getAll('competitions')
    .map((v) => Number(v))
    .filter((id) => COMPETITIONS.some((c) => c.id === id));

  if (name.length < 2 || name.length > 60) return { error: 'Give the league a name (2–60 characters)' };
  if (competitionIds.length === 0) return { error: 'Pick at least one competition' };

  const lockAt = new Date(lockAtRaw);
  if (Number.isNaN(lockAt.getTime())) return { error: 'Pick a valid prediction deadline' };

  const league = await createLeague({
    name,
    competitionIds,
    lockAt: lockAt.toISOString(),
    createdBy: session.userId,
  });

  redirect(`/leagues/${league.id}`);
}
