import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchMatchDay,
  fetchMatchDayGames,
  legScores,
  seriesState,
  setMatchDayStatus,
  type LegResult,
  type MdPlayer,
  type MdTeam,
  type ScoringMode,
} from '../../lib/matchday';
import { Bar, Circle, ListSkeleton, Panel, SkeletonScreen } from '../../components/Skeleton';
import { useSkeleton } from '../../lib/useSkeleton';
import type { Profile } from '../../lib/auth';

export function toTeams(md: NonNullable<Awaited<ReturnType<typeof fetchMatchDay>>>): MdTeam[] {
  return [...md.match_day_teams].sort((a, b) => a.team_order - b.team_order);
}

export function toPlayers(md: NonNullable<Awaited<ReturnType<typeof fetchMatchDay>>>): MdPlayer[] {
  return md.match_day_players.map((p) => ({
    id: p.id,
    team_id: p.team_id,
    profile_id: p.profile_id,
    guest_name: p.guest_name,
    pairing_order: p.pairing_order,
    handicap: p.handicap,
    display_name: p.profiles?.display_name ?? p.guest_name ?? '?',
  }));
}

export default function MatchDayLive({ profile }: { profile: Profile }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const md = useQuery({
    queryKey: ['match-day', id],
    queryFn: () => fetchMatchDay(id!),
    enabled: !!id,
    refetchOnWindowFocus: true,
  });
  const games = useQuery({
    queryKey: ['match-day-games', md.data?.session_id],
    queryFn: () => fetchMatchDayGames(md.data!.session_id),
    enabled: !!md.data,
    refetchOnWindowFocus: true,
  });

  const showSkeleton = useSkeleton(md.isPending || (!!md.data && games.isPending));

  const finish = useMutation({
    mutationFn: () => setMatchDayStatus(id!, 'finished'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['match-day', id] }),
  });

  if (showSkeleton) {
    return (
      <div className="flex flex-col gap-4 px-4 py-6">
        <SkeletonScreen label="Loading the match day" className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Bar w={180} h={22} />
            <Bar w={132} h={11} />
          </div>
          <Panel className="flex items-center justify-between">
            <Bar w={104} h={16} />
            <div className="flex gap-1.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <Circle key={i} size={12} />
              ))}
            </div>
            <Bar w={104} h={16} />
          </Panel>
          <ListSkeleton rows={3} label="Loading the legs" avatar={false} bare />
        </SkeletonScreen>
      </div>
    );
  }
  if (md.isPending || (md.data && games.isPending)) return <div className="px-4 py-6" />;
  if (md.isError || !md.data) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
        <p className="font-display text-[20px] font-bold">Match day not found</p>
        <Link to="/groups" className="text-[13.5px] text-phosphor">
          Back to groups
        </Link>
      </div>
    );
  }

  const data = md.data;
  const teams = toTeams(data);
  const players = toPlayers(data);
  const mode = data.scoring_mode as ScoringMode;
  const legs = (games.data ?? []).map((g) => legScores(mode, teams, players, g));
  const series = seriesState(data.best_of, teams, legs);
  const isOrganiser = data.created_by === profile.id;
  const nextLeg = (games.data ?? []).length + 1;
  const active = data.status === 'active';
  const canScoreNext = isOrganiser && active && !series.decided && nextLeg <= data.best_of;
  const winner = teams.find((t) => t.id === series.winnerTeamId);

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[20px] font-bold">Match day</h1>
          <p className="text-[12px] text-faint">
            {data.groups?.name}
            {data.sessions?.venues?.name ? ` · ${data.sessions.venues.name}` : ''} ·{' '}
            {data.best_of === 1 ? 'single game' : `best of ${data.best_of}`} ·{' '}
            {mode === 'points' ? 'points' : 'total pins'}
          </p>
        </div>
        <Link to={`/groups/${data.group_id}`} className="shrink-0 text-[13.5px] text-dim">
          Group
        </Link>
      </header>

      {/* Series header: legs won + best-of pips */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4">
        {teams.map((team) => (
          <div key={team.id} className="flex items-center justify-between gap-3">
            <span
              className={`min-w-0 truncate font-display text-[17px] font-bold ${
                series.winnerTeamId === team.id ? 'text-phosphor' : 'text-text'
              }`}
            >
              {team.name}
              {series.winnerTeamId === team.id ? ' 🏆' : ''}
            </span>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: Math.ceil(data.best_of / 2) }, (_, i) => (
                <span
                  key={i}
                  className={`size-2.5 rounded-full ${
                    i < (series.legsWon[team.id] ?? 0) ? 'bg-phosphor shadow-glow-amber' : 'border border-line bg-well'
                  }`}
                />
              ))}
              <span className="score-text ml-1 w-5 text-right text-[18px] font-bold text-text">
                {series.legsWon[team.id] ?? 0}
              </span>
            </div>
          </div>
        ))}
        {series.drawn && <p className="text-[12px] text-dim">Series drawn — nobody's bragging tonight.</p>}
        {data.status === 'finished' && !series.drawn && winner && (
          <p className="text-[12px] text-dim">{winner.name} take the day.</p>
        )}
      </div>

      {canScoreNext && (
        <button
          type="button"
          onClick={() => navigate(`/matchday/${data.id}/leg/${nextLeg}`)}
          className="rounded-[10px] bg-phosphor py-3.5 font-display text-[15px] font-bold text-ink shadow-glow-amber"
        >
          Score leg {nextLeg}
        </button>
      )}

      {legs.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line bg-well/50 p-4 text-[13.5px] text-dim">
          No legs bowled yet{isOrganiser ? ' — score leg 1 to get going.' : '.'}
        </p>
      )}

      {[...legs].reverse().map((leg) => (
        <LegCard key={leg.gameNumber} leg={leg} mode={mode} teams={teams} />
      ))}

      {isOrganiser && active && (series.decided || legs.length > 0) && (
        <button
          type="button"
          onClick={() => finish.mutate()}
          disabled={finish.isPending}
          className={`rounded-[10px] py-3 font-display text-[14px] font-bold ${
            series.decided
              ? 'bg-phosphor text-ink'
              : 'border border-line bg-panel text-dim'
          } disabled:opacity-60`}
        >
          {finish.isPending ? 'Finishing…' : 'Finish match day'}
        </button>
      )}
    </div>
  );
}

function LegCard({ leg, mode, teams }: { leg: LegResult; mode: ScoringMode; teams: MdTeam[] }) {
  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? '?';
  return (
    <Link
      to={`/games/${leg.gameId}`}
      className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4"
    >
      <div className="flex items-center justify-between">
        <span className="label-caps">Leg {leg.gameNumber}</span>
        {!leg.complete && <span className="text-[11px] text-faint">In progress</span>}
        {leg.complete && leg.winnerTeamId === null && <span className="text-[11px] text-dim">Drawn</span>}
      </div>

      {leg.teams.map((t) => (
        <div key={t.team.id} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between">
            <span
              className={`text-[14px] font-bold ${
                leg.winnerTeamId === t.team.id ? 'text-phosphor' : 'text-text'
              }`}
            >
              {t.team.name}
              {leg.winnerTeamId === t.team.id ? ' ✓' : ''}
            </span>
            <span className="score-text text-[17px] font-bold text-text">
              {t.handicapTotal}
              {mode === 'points' && <span className="ml-2 text-[12px] text-dim">{formatPoints(t.points)} pts</span>}
            </span>
          </div>
          {t.players.map((p) => (
            <div key={p.player.id} className="flex items-baseline justify-between pl-2">
              <span className="text-[12px] text-dim">{p.player.display_name}</span>
              <span className="score-text text-[12px] text-dim">
                {p.scratch ?? '—'}
                {p.player.handicap > 0 && p.scratch !== null && (
                  <span className="text-faint"> +{p.player.handicap} = {p.total}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      ))}

      {mode === 'points' && leg.pairings.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-line pt-2">
          {leg.pairings.map((pair, i) => (
            <div key={i} className="flex items-baseline justify-between text-[11px] text-faint">
              <span>
                {pair.a?.player.display_name ?? '—'} v {pair.b?.player.display_name ?? '—'}
              </span>
              <span className="score-text">
                {pair.pointsToA === null
                  ? '· pending'
                  : pair.pointsToA === 0.5
                    ? '½ each'
                    : pair.pointsToA === 1
                      ? `${teamName(pair.teamA)} +1`
                      : `${teamName(pair.teamB)} +1`}
              </span>
            </div>
          ))}
        </div>
      )}
    </Link>
  );
}

function formatPoints(points: number): string {
  const whole = Math.floor(points);
  const half = points - whole === 0.5;
  if (whole === 0 && half) return '½';
  return `${whole}${half ? '½' : ''}`;
}
