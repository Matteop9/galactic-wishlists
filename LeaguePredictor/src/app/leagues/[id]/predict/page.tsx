import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getLeague, getPrediction, isLocked } from '@/lib/leagues';
import { getStandings, getTeams } from '@/lib/football';
import { competitionById } from '@/lib/competitions';
import PredictionEditor, { type EditorCompetition } from './PredictionEditor';

export default async function PredictPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/leagues/${id}/predict`)}`);

  const league = await getLeague(id);
  if (!league) notFound();
  if (!league.members.some((m) => m.userId === session.userId)) notFound();

  // after lock, picks are frozen — show them against reality instead
  if (isLocked(league)) redirect(`/leagues/${id}/p/${session.userId}`);

  const prediction = await getPrediction(id, session.userId);

  const comps: EditorCompetition[] = await Promise.all(
    league.competitionIds.map(async (cid) => {
      const comp = competitionById(cid);
      const teamsDoc = await getTeams(cid);
      let standingsPos = new Map<number, number>();
      try {
        const standings = await getStandings(cid);
        standingsPos = new Map(standings.table.map((r) => [r.team.id, r.position]));
      } catch {
        // fine — alphabetical fallback below
      }

      const saved = prediction?.competitions[String(cid)];
      const rosterIds = new Set(teamsDoc.teams.map((t) => t.id));
      const byId = new Map(teamsDoc.teams.map((t) => [t.id, t]));

      // start from the saved order (dropping any team no longer in the comp),
      // else last-known table order; append anything missing at the bottom
      const order: number[] = [];
      if (saved?.ranking) {
        for (const tid of saved.ranking) if (rosterIds.has(tid) && !order.includes(tid)) order.push(tid);
      } else {
        const sorted = [...teamsDoc.teams].sort((a, b) => {
          const pa = standingsPos.get(a.id) ?? 999;
          const pb = standingsPos.get(b.id) ?? 999;
          return pa - pb || a.shortName.localeCompare(b.shortName);
        });
        order.push(...sorted.map((t) => t.id));
      }
      for (const t of teamsDoc.teams) if (!order.includes(t.id)) order.push(t.id);

      return {
        id: cid,
        name: comp?.name ?? String(cid),
        flag: comp?.flag ?? '',
        teams: order.map((tid) => {
          const t = byId.get(tid)!;
          return { id: t.id, shortName: t.shortName, crest: t.crest };
        }),
        squad: teamsDoc.squad.map((p) => ({
          id: p.id,
          name: p.name,
          position: p.position,
          teamShortName: p.teamShortName,
        })),
        initialScorer: saved?.scorer ?? null,
        hasSaved: Boolean(saved?.ranking?.length),
      };
    }),
  );

  return (
    <div>
      <Link href={`/leagues/${id}`} className="text-sm text-muted hover:text-ink transition-colors">
        ← {league.name}
      </Link>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Your predictions</h1>
      <p className="mt-1 text-sm text-muted">
        Drag every team into the exact spot you think it finishes — 1st at the top, last at the
        bottom. 1 point per position off; call the top scorer for −5. Lowest total wins.
      </p>
      <PredictionEditor leagueId={id} lockAt={league.lockAt} competitions={comps} />
    </div>
  );
}
