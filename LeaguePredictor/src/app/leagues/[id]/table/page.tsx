import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession, getUsers } from '@/lib/auth';
import { getAllPredictions, getLeague, isLocked } from '@/lib/leagues';
import { getScorers, getStandings, getTeams } from '@/lib/football';
import { scorerBonus } from '@/lib/scoring';
import { competitionById } from '@/lib/competitions';
import Crest from '@/components/Crest';
import type { ApiTableRow, ApiTeam } from '@/lib/types';

// Two ways to read the same picks, tabbed:
//  - "Everyone's picks" (default): rows are predicted positions, one column per player,
//    each cell = the team that player put there. Read down a column = their table.
//  - "vs the actual table": the real table down the side, cells = where each player
//    predicted that team (the original v0.2.2 grid).

export default async function LeagueGridPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id } = await params;
  const view = (await searchParams).view === 'table' ? 'table' : 'picks';
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
      const [standings, scorers, teamsDoc] = await Promise.all([
        getStandings(cid),
        getScorers(cid),
        getTeams(cid),
      ]);
      const seasonStarted = standings.season?.startDate
        ? Date.now() >= new Date(standings.season.startDate).getTime()
        : standings.table.some((r) => r.playedGames > 0);

      const teamInfo = new Map<number, ApiTeam>();
      for (const t of teamsDoc.teams) teamInfo.set(t.id, t);
      for (const row of standings.table) teamInfo.set(row.team.id, row.team);
      const positionByTeam = new Map(standings.table.map((r) => [r.team.id, r.position]));

      const rankings = new Map<string, number[]>();
      const predictedPos = new Map<string, Map<number, number>>();
      const scorerCells = new Map<string, { label: string; title: string; hit: boolean } | null>();
      for (const p of players) {
        const pred = predictions[p.userId]?.competitions[String(cid)];
        const ranking = pred?.ranking ?? [];
        rankings.set(p.userId, ranking);
        predictedPos.set(p.userId, new Map(ranking.map((teamId, i) => [teamId, i + 1])));
        if (pred?.scorer) {
          const result = scorerBonus(pred.scorer, scorers);
          const goals = result.pickGoals !== null ? ` — ${result.pickGoals} goals` : '';
          scorerCells.set(p.userId, {
            label: pred.scorer.playerName.trim().split(/\s+/).pop() ?? pred.scorer.playerName,
            title: `${pred.scorer.playerName}${goals}${result.hit ? ' — current top scorer ✓' : ''}`,
            hit: result.hit,
          });
        } else {
          scorerCells.set(p.userId, null);
        }
      }

      const rowCount = Math.max(standings.table.length, ...players.map((p) => rankings.get(p.userId)?.length ?? 0));
      return { cid, table: standings.table, seasonStarted, teamInfo, positionByTeam, rankings, predictedPos, scorerCells, rowCount };
    }),
  );

  const tab = (active: boolean) =>
    `rounded-md px-3 py-1.5 font-display text-sm font-bold transition-colors ${
      active ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink'
    }`;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <Link href={`/leagues/${id}`} className="text-sm text-muted hover:text-ink transition-colors">
          ← {league.name}
        </Link>
        <Link href={`/leagues/${id}/fixtures`} className="text-sm font-semibold text-primary hover:underline">
          Who to cheer for →
        </Link>
      </div>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">The grid</h1>

      <div className="mt-4 inline-flex rounded-lg border border-border bg-surface p-1">
        <Link href={`/leagues/${id}/table`} className={tab(view === 'picks')}>
          Everyone’s picks
        </Link>
        <Link href={`/leagues/${id}/table?view=table`} className={tab(view === 'table')}>
          vs the actual table
        </Link>
      </div>

      <p className="mt-3 text-sm text-muted">
        {view === 'picks'
          ? 'Read down a column for someone’s full predicted table. Green is spot on right now, amber is 1–4 off, red is 5+ adrift.'
          : 'The actual table, and where everyone put each team. Green is spot on, amber is 1–4 off, red is 5+ adrift.'}
      </p>

      <div className="mt-6 flex flex-col gap-8">
        {sections.map((section) => {
          const comp = competitionById(section.cid);
          return (
            <section key={section.cid}>
              <h2 className="font-display text-xl font-bold">
                {comp?.flag} {comp?.name ?? section.cid}
              </h2>
              <ConsensusLine section={section} players={players} />
              {!section.seasonStarted && (
                <p className="mt-1 text-xs italic text-muted">
                  Season hasn’t kicked off — table order is last season’s placeholder for now.
                </p>
              )}
              {view === 'picks' ? (
                <PicksBoard section={section} players={players} leagueId={id} />
              ) : (
                <GridTable section={section} players={players} leagueId={id} />
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

type Section = {
  cid: number;
  table: ApiTableRow[];
  seasonStarted: boolean;
  teamInfo: Map<number, ApiTeam>;
  positionByTeam: Map<number, number>;
  rankings: Map<string, number[]>;
  predictedPos: Map<string, Map<number, number>>;
  scorerCells: Map<string, { label: string; title: string; hit: boolean } | null>;
  rowCount: number;
};

type Player = { userId: string; name: string };

// "Title calls: Liverpool ×2 · Arsenal ×1 — Spoon: Southampton ×3"
function ConsensusLine({ section, players }: { section: Section; players: Player[] }) {
  const tally = (slot: 'first' | 'last') => {
    const counts = new Map<number, number>();
    for (const p of players) {
      const r = section.rankings.get(p.userId);
      if (!r?.length) continue;
      const teamId = slot === 'first' ? r[0] : r[r.length - 1];
      counts.set(teamId, (counts.get(teamId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([teamId, n]) => `${section.teamInfo.get(teamId)?.shortName ?? `Team ${teamId}`} ×${n}`)
      .join(' · ');
  };
  const title = tally('first');
  const spoon = tally('last');
  if (!title) return null;
  return (
    <p className="mt-1 text-xs text-muted">
      🏆 Title calls: {title}
      {spoon && (
        <>
          <span className="mx-2 text-border">|</span>🥄 Spoon: {spoon}
        </>
      )}
    </p>
  );
}

// Default view — rows are predicted positions, cells are the team each player put there.
function PicksBoard({ section, players, leagueId }: { section: Section; players: Player[]; leagueId: string }) {
  const positions = Array.from({ length: section.rowCount }, (_, i) => i + 1);
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-max bg-surface text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
            <th className="sticky left-0 z-10 w-10 bg-surface px-3 py-2 text-right">#</th>
            {players.map((p) => (
              <th key={p.userId} className="px-2 py-2 text-center">
                <Link
                  href={`/leagues/${leagueId}/p/${p.userId}`}
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
          {positions.map((pos) => (
            <tr key={pos} className="border-b border-border/40 last:border-0">
              <td className="sticky left-0 z-10 bg-surface px-3 py-1.5 text-right font-num font-semibold tabular text-muted">
                {pos}
              </td>
              {players.map((p) => {
                const teamId = section.rankings.get(p.userId)?.[pos - 1];
                return (
                  <td key={p.userId} className="px-1.5 py-1 text-center">
                    <PickCell
                      team={teamId !== undefined ? section.teamInfo.get(teamId) : undefined}
                      predicted={pos}
                      actual={
                        teamId !== undefined && section.seasonStarted
                          ? section.positionByTeam.get(teamId)
                          : undefined
                      }
                    />
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className="border-t border-border bg-surface-2/40">
            <td className="sticky left-0 z-10 bg-surface px-3 py-2 text-right" title="Top scorer picks">
              ⚽
            </td>
            {players.map((p) => {
              const cell = section.scorerCells.get(p.userId);
              return (
                <td key={p.userId} className="px-1.5 py-2 text-center">
                  {cell ? (
                    <span
                      title={cell.title}
                      className={`inline-block max-w-24 truncate rounded-md px-1.5 py-0.5 text-xs font-bold ${
                        cell.hit ? 'bg-spot-bg text-spot' : 'text-ink'
                      }`}
                    >
                      {cell.label}
                      {cell.hit && ' ✓'}
                    </span>
                  ) : (
                    <span className="text-xs text-muted">—</span>
                  )}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function PickCell({ team, predicted, actual }: { team?: ApiTeam; predicted: number; actual?: number }) {
  if (!team) return <span className="text-xs text-muted">—</span>;
  const diff = actual === undefined ? null : Math.abs(predicted - actual);
  const tone =
    diff === null
      ? 'bg-surface-2/60 text-ink'
      : diff === 0
        ? 'bg-spot-bg text-spot'
        : diff <= 4
          ? 'bg-close-bg text-close'
          : 'bg-off-bg text-off';
  const title =
    diff === null
      ? team.name
      : `${team.name} — now ${ordinal(actual!)}${diff === 0 ? ', spot on' : `, ${diff} off`}`;
  return (
    <span title={title} className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-num text-xs font-bold tabular ${tone}`}>
      <Crest src={team.crest} alt="" size={14} />
      {team.tla || team.shortName.slice(0, 3).toUpperCase()}
    </span>
  );
}

// The original grid — actual table down the side, cells = predicted position per player.
function GridTable({ section, players, leagueId }: { section: Section; players: Player[]; leagueId: string }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-max bg-surface text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
            <th className="sticky left-0 z-10 w-10 bg-surface px-3 py-2 text-right">#</th>
            <th className="sticky left-10 z-10 bg-surface px-3 py-2">Team</th>
            {players.map((p) => (
              <th key={p.userId} className="px-2 py-2 text-center">
                <Link
                  href={`/leagues/${leagueId}/p/${p.userId}`}
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
          {section.table.map((row: ApiTableRow) => (
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
                const pos = section.predictedPos.get(p.userId)?.get(row.team.id);
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

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}
