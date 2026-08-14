'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { getLeague, isLocked, updateLockAt } from '@/lib/leagues';

export type EditDeadlineState = { error?: string; ok?: boolean };

export async function updateDeadlineAction(
  leagueId: string,
  _prev: EditDeadlineState | undefined,
  formData: FormData,
): Promise<EditDeadlineState> {
  const session = await getSession();
  if (!session) return { error: 'Signed out — sign in again' };

  const league = await getLeague(leagueId);
  if (!league) return { error: 'League not found' };
  if (league.createdBy !== session.userId) {
    return { error: 'Only the league creator can move the deadline' };
  }
  if (isLocked(league)) {
    return { error: 'Predictions are already locked — the deadline can’t be moved' };
  }

  // prefer the exact instant the client resolved from its own timezone;
  // the raw datetime-local value is only a fallback (parsed in server TZ = UTC)
  const lockAt = new Date(String(formData.get('lockAtISO') || formData.get('lockAt') || ''));
  if (Number.isNaN(lockAt.getTime())) return { error: 'Pick a valid deadline' };

  await updateLockAt(leagueId, lockAt.toISOString());
  revalidatePath(`/leagues/${leagueId}`);
  return { ok: true };
}
