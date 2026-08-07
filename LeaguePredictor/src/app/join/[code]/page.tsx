import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getLeagueByCode } from '@/lib/leagues';
import { competitionById } from '@/lib/competitions';
import { joinLeagueAction } from './actions';

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/join/${code}`)}`);

  const league = await getLeagueByCode(code);

  if (!league) {
    return (
      <div className="mx-auto mt-10 max-w-md text-center">
        <h1 className="text-2xl font-extrabold">Hmm, that code doesn’t work</h1>
        <p className="mt-2 text-muted">
          Double-check the invite link or code — or ask whoever sent it to send it again.
        </p>
        <Link href="/" className="mt-6 inline-block text-primary hover:underline">
          Back home
        </Link>
      </div>
    );
  }

  if (league.members.some((m) => m.userId === session.userId)) {
    redirect(`/leagues/${league.id}`);
  }

  return (
    <div className="mx-auto mt-10 max-w-md">
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">You’re invited</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{league.name}</h1>
        <p className="mt-2 text-sm text-muted">
          Season {league.season} ·{' '}
          {league.competitionIds.map((id) => competitionById(id)?.name ?? id).join(' + ')} ·{' '}
          {league.members.length} {league.members.length === 1 ? 'player' : 'players'} in
        </p>
        <form action={joinLeagueAction} className="mt-6">
          <input type="hidden" name="code" value={code} />
          <button className="w-full rounded-lg bg-primary px-5 py-3 font-display font-bold text-primary-ink hover:brightness-110 transition">
            Join league
          </button>
        </form>
        <p className="mt-3 text-xs text-muted">
          You’ll predict the full final table for each competition before the deadline.
        </p>
      </div>
    </div>
  );
}
