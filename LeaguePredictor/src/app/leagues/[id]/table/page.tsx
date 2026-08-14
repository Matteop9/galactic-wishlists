import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession, getUsers } from '@/lib/auth';
import { getAllPredictions, getLeague, isLocked } from '@/lib/leagues';
import { getStandings } from '@/lib/football';
import { competitionById } from '@/lib/competitions';
import Crest from '@/components/Crest';
import type { ApiTableRow } from '@/lib/types';

// The grid: the actual league table down the side, one column per player,
// each cell = where that player predicted the team to finish (coloured by how far off).

export default async function LeagueGridPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/leagues/${id}/table`)}`);

  const league = await getLeague(id);
  if (!league) notFound();
  if (!league.members.some((m) => m.userId === session.userId)) notFound();

  // Same secrecy rule as player pages: nothing to see until predictions lock.
  if (!isLocked(league)) {
    return (
      <div className="mx-auto mt-10 max-w-md text-center">
        <h1 className="text-2xl font-extrabold">Nice try 👀</h1>
        <p className="mt-2 text-muted">
          Everyone’s picks stay secret until predictions lock. Come back after the deadline.
        </p>
        <Link href={`/leagues/${id}`} className="mt-6 inline-block text-primary hover:underline">
          Back to league
        </Link>
      </div>
    );
  }

  const [users, predictions] = await Promise.all([getUsers(), getAllPredictions(league)]);
  const nameById = new Map(users.map((u) => [u.id, u.displayName]));

  // Only players who actually submitted get a column.
  const players = league.members
    .map((m) => m.userId)
    .filter((uid) => {
      const doc = predictions[uid];
      return doc && Object.values(doc.competitions).some((c) => (c?.ranking?.length ?? 0) > 0);
    })
    .map((uid) => ({ userId: uid, name: nameById.get(uid) ?? 'Unknown' }));

  const sections = await Promise.all(
    league.competitionIds.map(async (cid) => {
      const standings = await getStandings(cid);
      const seasonStarted = standings.season?.startDate
        ? Date.now() >= new Date(standings.season.startDate).getTime()
        : standings.table.some((r) => r.playedGames > 0);
      // predicted position per player, keyed by team id
      const predictedPos = new Map<string, Map<number, number>>();
      for (const p of players) {
        const ranking = predictions[p.userId]?.competitions[String(cid)]?.ranking ?? [];
        predictedPos.set(p.userId, new Map(ranking.map((teamId, i) => [teamId, i + 1])));
      }
      return { cid, table: standings.table, seasonStarted, predictedPos };
    }),
  );

  return (
    <div>
      <Link href={`/leagues/${id}`} className="text-sm text-muted hover:text-ink transition-colors">
        ← {league.name}
      </Link>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">The grid</h1>
      <p className="mt-1 text-sm text-muted">
        The actual table, and where everyone put each team. Green is spot on, amber is 1–4 off, red is 5+ adrift.
      </p>

      <div className="mt-6 flex flex-col gap-8">
        {sections.map(({ cid, table, seasonStarted, predictedPos }) => {
          const comp = competitionById(cid);
          return (
            <section key={cid}>
              <h2 className="font-display text-xl font-bold">
                {comp?.flag} {comp?.name ?? cid}
              </h2>
              {!seasonStarted && (
                <p className="mt-1 text-xs italic text-muted">
                  Season hasn’t kicked off — table order is last season’s placeholder for now.
                </p>
              )}
              <div className="mt-3 overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-max bg-surface text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                      <th className="sticky left-0 z-10 bg-surface px-3 py-2 text-right w-10">#</th>
                      <th className="sticky left-10 z-10 bg-surface px-3 py-2">Team</th>
                      {players.map((p) => (
                        <th key={p.userId} className="px-2 py-2 text-center">
                          <Link
                            href={`/leagues/${id}/p/${p.userId}`}
                            className="hover:text-primary transition-colors"
                            title={p.name}
                          >
                            {shortName(p.name)}
                          </Link>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.map((row: ApiTableRow) => (
                      <tr key={row.team.id} className="border-b border-border/40 last:border-0">
                        <td className="sticky left-0 z-10 bg-surface px-3 py-1.5 text-right font-num font-semibold tabular text-muted">
                          {row.position}
                        </td>
                        <td className="sticky left-10 z-10 bg-surface px-3 py-1.5">
                          <span className="flex items-center gap-2 whitespace-nowrap">
                            <Crest src={row.team.crest} alt="" size={18} />
                            {row.team.shortName}
                          </span>
                        </td>
                        {players.map((p) => {
                          const pos = predictedPos.get(p.userId)?.get(row.team.id);
                          return (
                            <td key={p.userId} className="px-2 py-1.5 text-center">
                              <GridCell predicted={pos} actual={row.position} />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function GridCell({ predicted, actual }: { predicted: number | undefined; actual: number }) {
  if (predicted === undefined) {
    return <span className="inline-block min-w-8 rounded-md px-1.5 py-0.5 text-xs text-muted">—</span>;
  }
  const diff = Math.abs(predicted - actual);
  // brand kit: 0 = celebration, 1–4 amber, 5+ red
  const tone =
    diff === 0 ? 'bg-spot-bg text-spot' : diff <= 4 ? 'bg-close-bg text-close' : 'bg-off-bg text-off';
  return (
    <span className={`inline-block min-w-8 rounded-md px-1.5 py-0.5 font-num text-xs font-bold tabular ${tone}`}>
      {predicted}
    </span>
  );
}

// "Matteo P" → "Matteo", single long names truncate so columns stay narrow
function shortName(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? name;
  return first.length > 8 ? `${first.slice(0, 7)}…` : first;
}
