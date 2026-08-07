import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getMyLeagueIds } from '@/lib/leagues';

async function goToJoin(formData: FormData) {
  'use server';
  const code = String(formData.get('code') ?? '')
    .trim()
    .toUpperCase();
  if (code) redirect(`/join/${encodeURIComponent(code)}`);
}

export default async function Home() {
  const session = await getSession();

  if (!session) {
    return (
      <div className="py-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Predict the table game
          </p>
          <h1 className="text-5xl font-extrabold leading-tight tracking-tight">
            Call the table.
            <br />
            <span className="text-muted">Then live with it.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-lg text-muted">
            Before the season starts, you and your mates each predict the <em>entire</em> final
            league table — every spot, first to last, plus the top scorer.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/register"
              className="rounded-lg bg-primary px-6 py-3 font-display font-bold text-primary-ink hover:brightness-110 transition"
            >
              Start a league
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-border px-6 py-3 font-display font-bold text-ink hover:border-muted transition"
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-14 grid max-w-3xl gap-4 sm:grid-cols-3">
          {[
            ['1 point per spot', 'Predict a team 3rd, they finish 9th — that’s 6 points. Every team, every spot counts.'],
            ['Lowest score wins', 'Points are bad. Zero is perfect. The table updates live all season long.'],
            ['−5 for the top scorer', 'Call the golden boot winner and take five points off your total.'],
          ].map(([title, text]) => (
            <div key={title} className="rounded-xl border border-border bg-surface p-5">
              <h3 className="font-display font-bold">{title}</h3>
              <p className="mt-2 text-sm text-muted">{text}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const leagues = await getMyLeagueIds(session.userId);

  return (
    <div>
      <div className="flex items-end justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">Your leagues</h1>
        <Link
          href="/leagues/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-display font-bold text-primary-ink hover:brightness-110 transition"
        >
          + New league
        </Link>
      </div>

      {leagues.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border bg-surface/50 p-10 text-center">
          <p className="font-display text-lg font-bold">No leagues yet</p>
          <p className="mt-1 text-sm text-muted">
            Create one and invite your mates, or join with an invite code.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {leagues.map((l) => (
            <li key={l.id}>
              <Link
                href={`/leagues/${l.id}`}
                className="block rounded-xl border border-border bg-surface p-5 hover:border-muted transition-colors"
              >
                <p className="font-display text-lg font-bold">{l.name}</p>
                <p className="mt-1 text-sm text-muted">Season {l.season}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-display font-bold">Join a league</h2>
        <p className="mt-1 text-sm text-muted">Got an invite code from a mate?</p>
        <form action={goToJoin} className="mt-3 flex gap-2">
          <input
            name="code"
            placeholder="e.g. K7KXQ2"
            className="w-40 rounded-md border border-border bg-bg px-3 py-2 font-mono uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal placeholder:text-muted/60 focus:border-primary focus:outline-none"
            maxLength={6}
            required
          />
          <button className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:border-muted transition">
            Join
          </button>
        </form>
      </div>
    </div>
  );
}
