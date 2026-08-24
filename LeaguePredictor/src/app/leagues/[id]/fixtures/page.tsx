import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession, getUsers } from '@/lib/auth';
import { getAllPredictions, getLeague, isLocked } from '@/lib/leagues';
import { getFixtures, getStandings } from '@/lib/football';
import { fixtureVerdict, stakeFor, type Stake, type Verdict } from '@/lib/rooting';
import { competitionById } from '@/lib/competitions';
import Crest from '@/components/Crest';
import type { ApiMatch } from '@/lib/types';

// The cheering guide: every fixture in the next 10 days, and which result your
// prediction actually needs — per team (climb/drop/hold) and per match (the verdict).
// Post-lock it also shows which way the rest of the league is pulling.

const LONDON = 'Europe/London';

export default async function FixturesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/leagues/${id}/fixtures`)}`);

  const league = await getLeague(id);
  if (!league) notFound();
  if (!league.members.some((m) => m.userId === session.userId)) notFound();

  const locked = isLocked(league);
  const [users, predictions] = await Promise.all([getUsers(), getAllPredictions(league)]);
  const nameById = new Map(users.map((u) => [u.id, u.displayName]));

  const sections = await Promise.all(
    league.competitionIds.map(async (cid) => {
      const [fixtures, standings] = await Promise.all([getFixtures(cid), getStandings(cid)]);
      const seasonStarted = standings.season?.startDate
        ? Date.now() >= new Date(standings.season.startDate).getTime()
        : standings.table.some((r) => r.playedGames > 0);
      const currentPos = new Map(standings.table.map((r) => [r.team.id, r.position]));

      const predictedFor = (uid: string) => {
        const ranking = predictions[uid]?.competitions[String(cid)]?.ranking ?? [];
        return new Map(ranking.map((teamId, i) => [teamId, i + 1]));
      };
      const myPredicted = predictedFor(session.userId);
      // Everyone's pull per fixture — only once picks are public.
      const room = locked
        ? league.members
            .map((m) => ({
              name: firstName(nameById.get(m.userId) ?? 'Unknown'),
              predicted: predictedFor(m.userId),
            }))
            .filter((p) => p.predicted.size > 0)
        : [];
      return { cid, fixtures, seasonStarted, currentPos, myPredicted, room };
    }),
  );

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <Link href={`/leagues/${id}`} className="text-sm text-muted hover:text-ink transition-colors">
          ← {league.name}
        </Link>
        {locked && (
          <Link href={`/leagues/${id}/table`} className="text-sm font-semibold text-primary hover:underline">
            The grid →
          </Link>
        )}
      </div>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Who to cheer for</h1>
      <p className="mt-1 text-sm text-muted">
        Every fixture in the next 10 days, and which result your prediction needs. ▲ means you put them higher
        than they sit right now, ▼ means lower — ● means they’re exactly where you called it.
      </p>

      <div className="mt-6 flex flex-col gap-8">
        {sections.map((section) => {
          const comp = competitionById(section.cid);
          const noPicks = section.myPredicted.size === 0;
          const stakesOn = section.seasonStarted && !noPicks;
          return (
            <section key={section.cid}>
              <h2 className="font-display text-xl font-bold">
                {comp?.flag} {comp?.name ?? section.cid}
              </h2>
              {!section.seasonStarted && (
                <p className="mt-1 text-xs italic text-muted">
                  Season hasn’t kicked off — cheering guide switches on with the real table.
                </p>
              )}
              {section.seasonStarted && noPicks && (
                <p className="mt-1 text-xs italic text-muted">
                  You didn’t submit a prediction for this competition — fixtures only.
                </p>
              )}
              {section.fixtures.length === 0 ? (
                <p className="mt-3 rounded-xl border border-border bg-surface px-4 py-6 text-center text-sm text-muted">
                  No fixtures in the next 10 days.
                </p>
              ) : (
                groupByDay(section.fixtures).map(({ day, matches }) => (
                  <div key={day} className="mt-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{day}</h3>
                    <ul className="mt-2 overflow-hidden rounded-xl border border-border bg-surface">
                      {matches.map((m) => (
                        <FixtureCard
                          key={m.id}
                          match={m}
                          home={stakesOn ? stakeFor(m.homeTeam.id, section.myPredicted, section.currentPos) : null}
                          away={stakesOn ? stakeFor(m.awayTeam.id, section.myPredicted, section.currentPos) : null}
                          stakesOn={stakesOn}
                          room={
                            stakesOn && section.room.length > 1
                              ? section.room.map((p) => ({
                                  name: p.name,
                                  verdict: fixtureVerdict(
                                    stakeFor(m.homeTeam.id, p.predicted, section.currentPos),
                                    stakeFor(m.awayTeam.id, p.predicted, section.currentPos),
                                  ),
                                }))
                              : []
                          }
                        />
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function FixtureCard({
  match,
  home,
  away,
  stakesOn,
  room,
}: {
  match: ApiMatch;
  home: Stake | null;
  away: Stake | null;
  stakesOn: boolean;
  room: { name: string; verdict: Verdict }[];
}) {
  const live = match.status === 'IN_PLAY' || match.status === 'PAUSED';
  const { home: hGoals, away: aGoals } = match.score.fullTime;
  const verdict = stakesOn ? fixtureVerdict(home, away) : null;

  return (
    <li className="border-b border-border/40 px-4 py-3 last:border-0">
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
        <TeamSide team={match.homeTeam} stake={home} align="right" />
        <div className="pt-0.5 text-center">
          {live ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-off-bg px-2 py-0.5 font-num text-xs font-bold tabular text-off">
              LIVE{hGoals !== null && aGoals !== null ? ` ${hGoals}–${aGoals}` : ''}
            </span>
          ) : (
            <span className="font-num text-sm font-bold tabular text-muted">{timeLabel(match.utcDate)}</span>
          )}
        </div>
        <TeamSide team={match.awayTeam} stake={away} align="left" />
      </div>
      {verdict && verdict.kind !== 'none' && (
        <p className="mt-2 text-center text-sm font-semibold">
          {verdictCopy(verdict, match, home, away)}
        </p>
      )}
      <RoomLine room={room} match={match} />
    </li>
  );
}

function TeamSide({ team, stake, align }: { team: ApiMatch['homeTeam']; stake: Stake | null; align: 'left' | 'right' }) {
  const justify = align === 'right' ? 'justify-end' : 'justify-start';
  return (
    <div>
      <span className={`flex items-center gap-2 font-semibold ${justify}`}>
        {align === 'right' ? (
          <>
            <span className="truncate">{team.shortName}</span>
            <Crest src={team.crest} alt="" size={20} />
          </>
        ) : (
          <>
            <Crest src={team.crest} alt="" size={20} />
            <span className="truncate">{team.shortName}</span>
          </>
        )}
      </span>
      {stake && (
        <span className={`mt-1 flex ${justify}`}>
          <StakeChip stake={stake} />
        </span>
      )}
    </div>
  );
}

function StakeChip({ stake }: { stake: Stake }) {
  const title = `You predicted ${ordinal(stake.predictedPos)} — they’re ${ordinal(stake.currentPos)}`;
  if (stake.want === 'hold') {
    return (
      <span title={title} className="rounded-full bg-spot-bg px-2 py-0.5 text-xs font-bold text-spot">
        ● spot on
      </span>
    );
  }
  return (
    <span title={title} className="rounded-full bg-surface-2 px-2 py-0.5 font-num text-xs font-bold tabular text-ink">
      {stake.want === 'up' ? '▲' : '▼'} {stake.places} to {stake.want === 'up' ? 'climb' : 'drop'}
    </span>
  );
}

function verdictCopy(v: Verdict, match: ApiMatch, home: Stake | null, away: Stake | null): string {
  const homeName = match.homeTeam.shortName;
  const awayName = match.awayTeam.shortName;
  switch (v.kind) {
    case 'home':
      return home?.want === 'up' ? `📣 Cheer for ${homeName}` : `📣 Cheer against ${awayName}`;
    case 'away':
      return away?.want === 'up' ? `📣 Cheer for ${awayName}` : `📣 Cheer against ${homeName}`;
    case 'draw':
      return '🤝 A draw suits you — both need to drop';
    case 'either':
      return '😌 Happy either way — right where you put them';
    case 'torn':
      return v.lean
        ? `😖 Torn — both need to climb. Lean ${v.lean === 'home' ? homeName : awayName}, further to go`
        : '😖 Torn — you need both to climb';
    case 'none':
      return '';
  }
}

// Which way the rest of the league is pulling — post-lock banter fuel.
function RoomLine({ room, match }: { room: { name: string; verdict: Verdict }[]; match: ApiMatch }) {
  if (room.length === 0) return null;
  const side = (kind: Verdict['kind']) => room.filter((r) => r.verdict.kind === kind).map((r) => r.name);
  const parts: string[] = [];
  const homeFans = side('home');
  const awayFans = side('away');
  const drawFans = side('draw');
  const torn = side('torn');
  if (homeFans.length) parts.push(`${match.homeTeam.tla}: ${homeFans.join(', ')}`);
  if (awayFans.length) parts.push(`${match.awayTeam.tla}: ${awayFans.join(', ')}`);
  if (drawFans.length) parts.push(`draw: ${drawFans.join(', ')}`);
  if (torn.length) parts.push(`torn: ${torn.join(', ')}`);
  if (parts.length === 0) return null;
  return (
    <p className="mt-2 border-t border-border/40 pt-2 text-center text-xs text-muted">
      The room — {parts.join(' · ')}
    </p>
  );
}

function groupByDay(fixtures: ApiMatch[]): { day: string; matches: ApiMatch[] }[] {
  const groups: { day: string; matches: ApiMatch[] }[] = [];
  for (const m of fixtures) {
    const day = new Date(m.utcDate).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: LONDON,
    });
    const last = groups[groups.length - 1];
    if (last?.day === day) last.matches.push(m);
    else groups.push({ day, matches: [m] });
  }
  return groups;
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: LONDON });
}

function firstName(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? name;
  return first.length > 8 ? `${first.slice(0, 7)}…` : first;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}
