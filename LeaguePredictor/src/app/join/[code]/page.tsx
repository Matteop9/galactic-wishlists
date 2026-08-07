import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getLeagueByCode } from '@/lib/leagues';
import { competitionById } from '@/lib/competitions';
import { joinLeagueAction } from './actions';

// The invite page renders for signed-out visitors too (with sign-in CTAs) so
// link unfurlers (WhatsApp, iMessage, Slack) get a 200 + the league's OG card
// instead of following a redirect to the login page.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const league = await getLeagueByCode(code);
  if (!league) return { title: 'Join a league — Spot On' };
  const title = `Join ${league.name} on Spot On`;
  const description = 'Call the final table, first to last. Lowest score wins.';
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      // explicit dimensions per the share-card wiring notes (iMessage fallback)
      images: [{ url: `/api/og/join/${code}`, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image' },
  };
}

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const session = await getSession();
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

  if (session && league.members.some((m) => m.userId === session.userId)) {
    redirect(`/leagues/${league.id}`);
  }

  const next = `/join/${code}`;

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
        {session ? (
          <form action={joinLeagueAction} className="mt-6">
            <input type="hidden" name="code" value={code} />
            <button className="w-full rounded-lg bg-primary px-5 py-3 font-display font-bold text-primary-ink hover:brightness-110 transition">
              Join league
            </button>
          </form>
        ) : (
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href={`/register?next=${encodeURIComponent(next)}`}
              className="w-full rounded-lg bg-primary px-5 py-3 font-display font-bold text-primary-ink hover:brightness-110 transition"
            >
              Create an account to join
            </Link>
            <Link
              href={`/login?next=${encodeURIComponent(next)}`}
              className="w-full rounded-lg border border-border px-5 py-3 font-display font-bold hover:border-muted transition"
            >
              I already have an account
            </Link>
          </div>
        )}
        <p className="mt-3 text-xs text-muted">
          You’ll predict the full final table for each competition before the deadline.
        </p>
      </div>
    </div>
  );
}
