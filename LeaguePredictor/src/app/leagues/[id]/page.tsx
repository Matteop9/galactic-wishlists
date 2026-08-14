import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession, getUsers } from '@/lib/auth';
import { getAllPredictions, getLeague, isLocked } from '@/lib/leagues';
import { getScorers, getStandings } from '@/lib/football';
import { scoreLeague, withRanks, type MemberPredictionInput } from '@/lib/scoring';
import { competitionById } from '@/lib/competitions';
import CopyInviteLink from '@/components/CopyInviteLink';
import EditDeadlineForm from './EditDeadlineForm';
import type { ApiScorer, ApiTableRow } from '@/lib/types';

export default async function LeaguePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/leagues/${id}`)}`);

  const league = await getLeague(id);
  if (!league) notFound();

  const isMember = league.members.some((m) => m.userId === session.userId);
  if (!isMember) {
    return (
      <div className="mx-auto mt-10 max-w-md text-center">
        <h1 className="text-2xl font-extrabold">This league is invite-only</h1>
        <p className="mt-2 text-muted">Ask a member for the invite link to join.</p>
      </div>
    );
  }

  const locked = isLocked(league);
  const [users, predictions] = await Promise.all([getUsers(), getAllPredictions(league)]);
  const nameById = new Map(users.map((u) => [u.id, u.displayName]));
  const compNames = league.competitionIds.map((cid) => competitionById(cid)?.name ?? String(cid));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{league.name}</h1>
          <p className="mt-1 text-sm text-muted">
            Season {league.season} · {compNames.join(' + ')} · {league.members.length}{' '}
            {league.members.length === 1 ? 'player' : 'players'}
          </p>
        </div>
        {!locked ? (
          <Link
            href={`/leagues/${league.id}/predict`}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-display font-bold text-primary-ink hover:brightness-110 transition"
          >
            My predictions
          </Link>
        ) : (
          <Link
            href={`/leagues/${league.id}/table`}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-display font-bold hover:border-muted transition-colors"
          >
            The grid — everyone’s picks
          </Link>
        )}
      </div>

      {locked ? (
        <Leaderboard leagueId={league.id} competitionIds={league.competitionIds} nameById={nameById} predictions={predictions} />
      ) : (
        <PreLock league={league} nameById={nameById} predictions={predictions} myUserId={session.userId} />
      )}
    </div>
  );
}

function PreLock({
  league,
  nameById,
  predictions,
  myUserId,
}: {
  league: NonNullable<Awaited<ReturnType<typeof getLeague>>>;
  nameById: Map<string, string>;
  predictions: Awaited<ReturnType<typeof getAllPredictions>>;
  myUserId: string;
}) {
  const lockDate = new Date(league.lockAt);
  const submittedCount = (userId: string) => {
    const doc = predictions[userId];
    if (!doc) return 0;
    return league.competitionIds.filter((cid) => (doc.competitions[String(cid)]?.ranking?.length ?? 0) > 0).length;
  };

  return (
    <div className="mt-8 grid gap-6 sm:grid-cols-2">
      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="font-display font-bold">Predictions lock</h2>
        <p className="mt-1 text-2xl font-extrabold tabular">
          {lockDate.toLocaleString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
        <p className="mt-1 text-xs text-muted">
          Until then, everyone’s picks stay hidden. After that — no changes, and the leaderboard goes live.
        </p>
        <div className="mt-4 border-t border-border pt-4">
          <h3 className="mb-2 text-sm font-semibold text-muted">Invite your mates</h3>
          <CopyInviteLink code={league.inviteCode} />
        </div>
        {league.createdBy === myUserId && <EditDeadlineForm leagueId={league.id} lockAt={league.lockAt} />}
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="font-display font-bold">Who’s in</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {league.members.map((m) => {
            const done = submittedCount(m.userId);
            const total = league.competitionIds.length;
            const complete = done === total;
            return (
              <li key={m.userId} className="flex items-center justify-between text-sm">
                <span>
                  {nameById.get(m.userId) ?? 'Unknown'}
                  {m.userId === myUserId && <span className="text-muted"> (you)</span>}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    complete ? 'bg-spot/15 text-spot' : done > 0 ? 'bg-close/15 text-close' : 'bg-surface-2 text-muted'
                  }`}
                >
                  {complete ? 'all picks in ✓' : `${done}/${total} tables in`}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

async function Leaderboard({
  leagueId,
  competitionIds,
  nameById,
  predictions,
}: {
  leagueId: string;
  competitionIds: number[];
  nameById: Map<string, string>;
  predictions: Awaited<ReturnType<typeof getAllPredictions>>;
}) {
  const standingsByComp: Record<string, ApiTableRow[]> = {};
  const scorersByComp: Record<string, ApiScorer[]> = {};
  const seasonStarts: string[] = [];
  const seasonEnds: string[] = [];
  await Promise.all(
    competitionIds.map(async (cid) => {
      const [standings, scorers] = await Promise.all([getStandings(cid), getScorers(cid)]);
      standingsByComp[String(cid)] = standings.table;
      scorersByComp[String(cid)] = scorers;
      if (standings.season?.startDate) seasonStarts.push(standings.season.startDate);
      if (standings.season?.endDate) seasonEnds.push(standings.season.endDate);
    }),
  );

  const members: MemberPredictionInput[] = Object.entries(predictions).map(([userId, doc]) => ({
    userId,
    competitions: doc?.competitions ?? {},
  }));

  const ranked = withRanks(scoreLeague(competitionIds, members, standingsByComp, scorersByComp));

  // Date-based checks, NOT playedGames: pre-season the API serves last season's
  // final table (38 played) as a placeholder, which would fool a games-played test.
  const tables = Object.values(standingsByComp);
  const earliestStart = [...seasonStarts].sort()[0];
  const latestEnd = [...seasonEnds].sort().pop();
  const seasonStarted = earliestStart
    ? Date.now() >= new Date(earliestStart).getTime()
    : tables.some((t) => t.some((r) => r.playedGames > 0));
  const seasonComplete =
    tables.length > 0 &&
    tables.every((t) => t.length > 0 && t.every((r) => r.playedGames >= 2 * (t.length - 1))) &&
    (latestEnd ? Date.now() >= new Date(latestEnd).getTime() : false);

  // locked but the season hasn't kicked off — a scoreboard of placeholder standings
  // is meaningless, so show the countdown state instead (brand kit: "waiting" illo)
  if (!seasonStarted) {
    const kickOff = [...seasonStarts].sort()[0];
    return (
      <div className="mt-8 rounded-xl border border-border bg-surface p-10 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/spot-on-illo-waiting.svg" alt="" aria-hidden className="mx-auto mb-4 h-32 w-auto" />
        <p className="font-display text-xl font-extrabold">Predictions locked.</p>
        <p className="mt-1 text-sm text-muted">
          {kickOff
            ? `Kick-off ${new Date(kickOff).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}. `
            : ''}
          Everyone’s picks are public now — size up the competition.
        </p>
        <ul className="mx-auto mt-6 flex max-w-sm flex-col gap-2">
          {Object.keys(predictions).map((userId) => (
            <li key={userId}>
              <Link
                href={`/leagues/${leagueId}/p/${userId}`}
                className="block rounded-lg border border-border bg-surface-2/60 px-4 py-2 text-sm font-semibold hover:border-muted transition-colors"
              >
                {nameById.get(userId) ?? 'Unknown'}’s picks
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const winner = seasonComplete && ranked[0]?.complete ? ranked[0] : null;

  return (
    <div className="mt-8">
      {winner && (
        <div className="mb-6 flex flex-col items-center gap-2 rounded-xl border border-spot/40 bg-spot-bg/40 p-8 text-center sm:flex-row sm:gap-6 sm:text-left">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/spot-on-illo-winner.svg" alt="" aria-hidden className="h-28 w-auto" />
          <div>
            <p className="font-display text-2xl font-extrabold">
              {nameById.get(winner.userId) ?? 'Unknown'} called it.
            </p>
            <p className="mt-1 text-sm text-muted">
              Season done — <span className="font-num font-bold text-spot">{winner.total} points</span>. Lowest score
              wins, and that was the lowest score.
            </p>
          </div>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[480px] bg-surface text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Player</th>
              {competitionIds.map((cid) => (
                <th key={cid} className="px-4 py-3 text-right">
                  {competitionById(cid)?.name ?? cid}
                </th>
              ))}
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((row) => (
              <tr key={row.userId} className="border-b border-border/50 last:border-0 hover:bg-surface-2/60 transition-colors">
                <td className="px-4 py-3 font-num font-bold tabular">{row.complete ? row.rank : '—'}</td>
                <td className="px-4 py-3">
                  <Link href={`/leagues/${leagueId}/p/${row.userId}`} className="font-semibold hover:text-primary transition-colors">
                    {nameById.get(row.userId) ?? 'Unknown'}
                  </Link>
                  {!row.complete && <span className="ml-2 text-xs italic text-muted">missing picks</span>}
                </td>
                {row.competitions.map((c) => (
                  <td key={c.competitionId} className="px-4 py-3 text-right font-num tabular">
                    {c.submitted ? (
                      <>
                        {c.tablePoints}
                        {c.scorerResult.hit && <span className="ml-1 font-bold text-spot">−5</span>}
                      </>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                ))}
                <td className="px-4 py-3 text-right font-num text-base font-extrabold tabular">
                  {row.complete ? row.total : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">
        1 point per position off, per team — lowest wins. <span className="text-spot font-semibold">−5</span> = called the
        top scorer. Standings refresh every 15 minutes. Tap a player to see their full picks.
      </p>
    </div>
  );
}
