import { Fragment } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import EmptyState from '../../components/EmptyState';
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
import Avatar from '../../components/Avatar';
import Icon from '../../components/Icon';
import PageHeader from '../../components/PageHeader';
import Strip, { StripTitle } from '../../components/Strip';
import { Bar, ListSkeleton, Panel, SkeletonScreen } from '../../components/Skeleton';
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
    display_name: p.profiles?.display_name ?? p.guest_name ?? 'Player',
  }));
}

/**
 * Match day · live: the series score as a head-to-head, a row per leg, and
 * the two line-ups with their handicaps. The organiser enters each leg from
 * here and finishes the day when it is decided.
 */
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
      <div className="flex flex-col gap-4 px-4 py-5">
        <SkeletonScreen label="Loading the match day" className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Bar w={180} h={22} />
            <Bar w={132} h={11} />
          </div>
          <Panel className="flex items-center justify-around py-5">
            <Bar w={36} h={44} />
            <Bar w={30} h={11} />
            <Bar w={36} h={44} />
          </Panel>
          <ListSkeleton rows={3} label="Loading the legs" avatar={false} bare />
        </SkeletonScreen>
      </div>
    );
  }
  if (md.isPending || (md.data && games.isPending)) return <div className="px-4 py-5" />;
  if (md.isError || !md.data) {
    return (
      <div className="px-4">
        <EmptyState
          tone="page"
          title="Match day not found"
          body="It may have been removed, or the link is wrong."
          action={{ label: 'Back to groups', to: '/groups' }}
        />
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
  const waitingOnOrganiser = !isOrganiser && active && !series.decided && nextLeg <= data.best_of;
  const winner = teams.find((t) => t.id === series.winnerTeamId);

  // The team ahead on legs is "hot": strictly ahead, and at least one leg up.
  const topWins = Math.max(0, ...teams.map((t) => series.legsWon[t.id] ?? 0));
  const ahead = teams.filter((t) => (series.legsWon[t.id] ?? 0) === topWins);
  const leaderId = topWins > 0 && ahead.length === 1 ? ahead[0].id : null;

  const seriesLabel = data.best_of === 1 ? 'Single game' : `Best of ${data.best_of}`;
  const modeLabel = mode === 'points' ? 'points' : 'total pins';
  const venueName = data.sessions?.venues?.name;
  const legWord = legs.length === 1 ? 'leg' : 'legs';

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      <PageHeader
        back={`/groups/${data.group_id}`}
        title={teams.map((t) => t.name).join(' v ')}
        sub={`${seriesLabel} · ${modeLabel}${venueName ? ` · ${venueName}` : ''}`}
      />

      {/* The series: legs won, head to head. */}
      <Strip>
        <div className="flex items-baseline justify-between px-3.5 py-2.5">
          <span className="label">Legs won</span>
          {active && !series.decided ? (
            <span className="text-[13px] font-semibold text-red">Live</span>
          ) : (
            <span className="text-[13px] text-ink-faded">{active ? 'Decided' : 'Finished'}</span>
          )}
        </div>
        {teams.length === 2 ? (
          <div className="grid grid-cols-[1fr_auto_1fr] items-center p-4">
            <TeamLegs team={teams[0]} won={series.legsWon[teams[0].id] ?? 0} hot={leaderId === teams[0].id} />
            <span className="px-[18px] text-[13px] text-ink-faded">legs</span>
            <TeamLegs team={teams[1]} won={series.legsWon[teams[1].id] ?? 0} hot={leaderId === teams[1].id} />
          </div>
        ) : (
          <div className="grid divide-x divide-hairline" style={{ gridTemplateColumns: `repeat(${teams.length}, 1fr)` }}>
            {teams.map((team) => (
              <div key={team.id} className="flex flex-col px-3.5 py-3">
                <span
                  className={`num text-[30px] font-semibold leading-none ${
                    leaderId === team.id ? 'text-red' : 'text-ink'
                  }`}
                >
                  {series.legsWon[team.id] ?? 0}
                </span>
                <span className="truncate text-[12px] text-ink-faded">{team.name}</span>
              </div>
            ))}
          </div>
        )}
        {series.drawn && (
          <p className="px-3.5 py-2.5 text-[13px] text-ink-faded">
            Level after <span className="num">{legs.length}</span> {legWord}. The day is shared.
          </p>
        )}
        {series.decided && !series.drawn && winner && (
          <p className="px-3.5 py-2.5 text-[13px] text-ink-faded">{winner.name} take the day.</p>
        )}
      </Strip>

      {/* The legs: one row each, newest last, then the next one to play. */}
      {legs.length === 0 ? (
        <EmptyState
          tone="inline"
          title="No legs bowled yet"
          body={
            isOrganiser
              ? 'Enter the scores for leg 1 once it has been bowled.'
              : 'The organiser enters the scores after each leg.'
          }
          action={isOrganiser ? { label: 'Enter leg 1 scores', to: `/matchday/${data.id}/leg/1` } : undefined}
        />
      ) : (
        <Strip>
          <StripTitle
            right={
              <>
                <span className="num">{legs.length}</span> of <span className="num">{data.best_of}</span> played
              </>
            }
          >
            Legs
          </StripTitle>
          {legs.map((leg) => (
            <LegRow key={leg.gameNumber} leg={leg} mode={mode} teams={teams} />
          ))}
          {(canScoreNext || waitingOnOrganiser) && (
            <div className="flex items-center gap-3 px-3.5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[15px]">
                  Leg <span className="num">{nextLeg}</span>
                </p>
                <p className="text-[12px] text-ink-faded">{canScoreNext ? 'Up next' : 'Waiting for the organiser'}</p>
              </div>
              {canScoreNext && (
                <button
                  type="button"
                  onClick={() => navigate(`/matchday/${data.id}/leg/${nextLeg}`)}
                  className="btn-primary-sm"
                >
                  Enter scores
                </button>
              )}
            </div>
          )}
        </Strip>
      )}

      {/* The line-ups, with the handicap each player carries. */}
      <Strip>
        <StripTitle right={mode === 'points' ? 'Paired in order' : undefined}>Players</StripTitle>
        {teams.map((team) => {
          const lineUp = players
            .filter((p) => p.team_id === team.id)
            .sort((a, b) => a.pairing_order - b.pairing_order);
          return (
            <Fragment key={team.id}>
              <div className="flex items-baseline justify-between px-3.5 py-2">
                <span className="num text-[15px] font-semibold">{team.name}</span>
                <span className="text-[12px] text-ink-faded">
                  <span className="num">{lineUp.length}</span> {lineUp.length === 1 ? 'player' : 'players'}
                </span>
              </div>
              {lineUp.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 px-3.5 py-2.5">
                  {mode === 'points' && <span className="num w-4 shrink-0 text-[13px] text-ink-faded">{i + 1}</span>}
                  <Avatar name={p.display_name} size={32} />
                  <span className="min-w-0 flex-1 truncate text-[15px]">
                    {p.display_name}
                    {p.guest_name && <span className="text-ink-faded"> guest</span>}
                  </span>
                  <span className="num text-[15px] text-ink-faded">+{p.handicap}</span>
                </div>
              ))}
            </Fragment>
          );
        })}
      </Strip>

      {isOrganiser && active && (series.decided || legs.length > 0) && (
        <button
          type="button"
          onClick={() => finish.mutate()}
          disabled={finish.isPending}
          className={series.decided ? 'btn-primary' : 'btn-secondary'}
        >
          {finish.isPending ? 'Finishing' : 'Finish match day'}
        </button>
      )}
    </div>
  );
}

/** One side of the head to head: legs won over the team name. */
function TeamLegs({ team, won, hot }: { team: MdTeam; won: number; hot: boolean }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-0.5">
      <span className={`num text-[44px] font-semibold leading-none ${hot ? 'text-red' : 'text-ink'}`}>{won}</span>
      <span className="max-w-full truncate text-[13px] text-ink-faded">{team.name}</span>
    </div>
  );
}

/**
 * A leg: the row links to the game; under it, the breakdown that only this
 * screen knows (handicaps, and in points mode the pairings).
 */
function LegRow({ leg, mode, teams }: { leg: LegResult; mode: ScoringMode; teams: MdTeam[] }) {
  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? 'Team';
  const status = !leg.complete
    ? 'In progress'
    : leg.winnerTeamId === null
      ? 'Drawn'
      : `${teamName(leg.winnerTeamId)} won`;

  return (
    <div className="flex flex-col">
      <Link to={`/games/${leg.gameId}`} className="press flex items-center gap-3 px-3.5 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[15px]">
            Leg <span className="num">{leg.gameNumber}</span>
          </p>
          <p className="text-[12px] text-ink-faded">{status}</p>
        </div>
        <span className="num shrink-0 text-[18px] font-semibold leading-none">
          {leg.teams.map((t, i) => (
            <Fragment key={t.team.id}>
              {i > 0 && <span className="text-ink-faded"> · </span>}
              <span className={leg.winnerTeamId === t.team.id ? 'text-red' : 'text-ink'}>{t.handicapTotal}</span>
            </Fragment>
          ))}
        </span>
        <Icon name="chevron-right" className="size-5 shrink-0 text-ink-faded" />
      </Link>

      <div className="flex flex-col gap-0.5 px-3.5 pb-3 text-[12px] text-ink-faded">
        {mode === 'points' && (
          <p>
            Points:{' '}
            {leg.teams.map((t, i) => (
              <Fragment key={t.team.id}>
                {i > 0 && ', '}
                {t.team.name} <span className="num">{formatPoints(t.points)}</span>
              </Fragment>
            ))}
          </p>
        )}
        {mode === 'points' && leg.pairings.length > 0
          ? leg.pairings.map((pair, i) => (
              <p key={i} className="truncate">
                <PlayerScore entry={pair.a} /> v <PlayerScore entry={pair.b} />
                {' · '}
                {pair.pointsToA === null
                  ? 'pending'
                  : pair.pointsToA === 0.5
                    ? 'a half each'
                    : pair.pointsToA === 1
                      ? teamName(pair.teamA)
                      : teamName(pair.teamB)}
              </p>
            ))
          : leg.teams.map((t) => (
              <p key={t.team.id} className="truncate">
                {t.team.name}:{' '}
                {t.players.map((p, i) => (
                  <Fragment key={p.player.id}>
                    {i > 0 && ', '}
                    <PlayerScore entry={p} />
                  </Fragment>
                ))}
              </p>
            ))}
      </div>
    </div>
  );
}

/** "Dan 163 +12", or "Dan, no score" while the leg is in progress. */
function PlayerScore({ entry }: { entry: LegResult['teams'][number]['players'][number] | null }) {
  if (!entry) return <>unpaired</>;
  if (entry.scratch === null) return <>{entry.player.display_name}, no score</>;
  return (
    <>
      {entry.player.display_name} <span className="num">{entry.scratch}</span>
      {entry.player.handicap > 0 && (
        <>
          {' '}
          <span className="num">+{entry.player.handicap}</span>
        </>
      )}
    </>
  );
}

function formatPoints(points: number): string {
  return String(points);
}
