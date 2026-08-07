'use server';

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getLeagueByCode, joinLeague } from '@/lib/leagues';

export async function joinLeagueAction(formData: FormData) {
  const code = String(formData.get('code') ?? '');
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/join/${code}`)}`);

  const league = await getLeagueByCode(code);
  if (!league) redirect('/');

  await joinLeague(league.id, session.userId);
  redirect(`/leagues/${league.id}`);
}
