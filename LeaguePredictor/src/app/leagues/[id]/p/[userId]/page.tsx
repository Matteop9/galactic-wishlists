import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession, getUsers } from '@/lib/auth';
import { getLeague, getPrediction, isLocked } from '@/lib/leagues';
import { getScorers, getStandings, getTeams } from '@/lib/football';
import { scoreTable, scorerBonus } from '@/lib/scoring';
import { competitionById } from '@/lib/competitions';
import Crest from '@/components/Crest';
import DiffChip from '@/components/DiffChip';
import type { ApiTeam } from '@/lib/types';

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string; userId: string }>;
}) {
  const { id, userId } = await params;
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/leagues/${id}/p/${userId}`)}`);

  const league = await getLeague(id);
  if (!league) notFound();
  if (!league.members.some((m) => m.userId === session.userId)) notFound();
  if (!league.members.some((m) => m.userId === userId)) notFound();

  const locked = isLocked(league);
  const isSelf = userId === session.userId;
  if (!locked && !isSelf) {
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

  const [users, prediction] = await Promise.all([getUsers(), getPrediction(id, userId)]);
  const player = users.find((u) => u.id === userId);
  const playerName = player?.displayName ?? 'Unknown';

  if (!prediction) {
    return (
      <div className="mx-auto mt-10 max-w-md text-center">
        <h1 className="text-2xl font-extrabold">{playerName} hasn’t predicted yet</h1>
        <Link href={`/leagues/${id}`} className="mt-6 inline-block text-primary hover:underline">
          Back to league
        </Link>
      </div>
    );
  }

  const sections = await Promise.all(
    league.competitionIds.map(async (cid) => {
      const pred = prediction.competitions[String(cid)];
      const [standings, scorers, teamsDoc] = await Promise.all([
        getStandings(cid),
        getScorers(cid),
        getTeams(cid),
      ]);
      const teamInfo = new Map<number, ApiTeam>();
      for (const t of teamsDoc.teams) teamInfo.set(t.id, t);
      for (const row of standings.table) teamInfo.set(row.team.id, row.team);

      if (!pred || pred.ranking.length === 0) return { cid, pred: null, teamInfo, tableScore: null, scorer: null };
      return {
        cid,
        pred,
        teamInfo,
        tableScore: scoreTable(pred.ranking, standings.table),
        scorer: scorerBonus(pred.scorer, scorers),
      };
    }),
  );

  const grandTotal = sections.reduce(
    (sum, s) => sum + (s.tableScore?.total ?? 0) + (s.scorer?.bonus ?? 0),
    0,
  );
  const allIn = sections.every((s) => s.pred);

  return (
    <div>
      <Link href={`/leagues/${id}`} className="text-sm text-muted hover:text-ink transition-colors">
        ← {league.name}
      </Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">{playerName}’s picks</h1>
        {locked && allIn && (
          <p className="font-num text-2xl font-extrabold tabular">
            {grandTotal} <span className="font-body text-sm font-semibold text-muted">pts total</span>
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-8">
        {sections.map(({ cid, pred, teamInfo, tableScore, scorer }) => {
          const comp = competitionById(cid);
          if (!pred) {
            return (
              <section key={cid}>
                <h2 className="font-display text-xl font-bold">{comp?.name ?? cid}</h2>
                <p className="mt-2 text-sm italic text-muted">No prediction submitted.</p>
              </section>
            );
          }
          return (
            <section key={cid}>
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-xl font-bold">
                  {comp?.flag} {comp?.name ?? cid}
                </h2>
                {locked && tableScore && (
                  <p className="text-sm text-muted">
                    <span className="font-num text-lg font-extrabold text-ink tabular">
                      {tableScore.total + (scorer?.bonus ?? 0)}
                    </span>{' '}
                    pts
                  </p>
                )}
              </div>

              {pred.scorer && (
                <div className="mt-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm">
                  <span className="text-muted">Top scorer pick:</span>{' '}
                  <span className="font-semibold">{pred.scorer.playerName}</span>
                  {locked && scorer && (
                    <>
                      {scorer.hit ? (
                        <span className="ml-2 rounded-full bg-spot/15 px-2 py-0.5 text-xs font-bold text-spot">
                          top scorer ✓ −5
                        </span>
                      ) : scorer.pickRank ? (
                        <span className="ml-2 text-xs text-muted">
                          currently {ordinal(scorer.pickRank)} ({scorer.pickGoals} goals)
                        </span>
                      ) : scorer.topScorers.length === 0 ? (
                        <span className="ml-2 text-xs text-muted">no goals in the chart yet</span>
                      ) : (
                        <span className="ml-2 text-xs text-muted">not in the top 25</span>
                      )}
                      {scorer.topScorers.length > 0 && !scorer.hit && (
                        <span className="ml-2 text-xs text-muted">· leader: {scorer.topScorers.join(', ')}</span>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="mt-3 overflow-hidden rounded-xl border border-border">
                <table className="w-full bg-surface text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                      <th className="px-3 py-2 text-right w-12">Pick</th>
                      <th className="px-3 py-2">Team</th>
                      {locked && (
                        <>
                          <th className="px-3 py-2 text-right w-16">Now</th>
                          <th className="px-3 py-2 text-right w-24"></th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {(tableScore?.rows ?? pred.ranking.map((teamId, i) => ({ teamId, predictedPos: i + 1, actualPos: null, diff: 0 }))).map(
                      (row) => {
                        const team = teamInfo.get(row.teamId);
                        return (
                          <tr key={row.teamId} className="border-b border-border/40 last:border-0">
                            <td className="px-3 py-1.5 text-right font-num font-semibold tabular text-muted">{row.predictedPos}</td>
                            <td className="px-3 py-1.5">
                              <span className="flex items-center gap-2">
                                <Crest src={team?.crest} alt="" size={18} />
                                {team?.shortName ?? `Team ${row.teamId}`}
                              </span>
                            </td>
                            {locked && (
                              <>
                                <td className="px-3 py-1.5 text-right font-num tabular">{row.actualPos ?? '—'}</td>
                                <td className="px-3 py-1.5 text-right">
                                  <DiffChip diff={row.diff} missing={row.actualPos === null} />
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      },
                    )}
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

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}
