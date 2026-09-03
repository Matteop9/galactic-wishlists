import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import Scorecard from '../../components/scorecard/Scorecard';
import Strip from '../../components/Strip';
import { fetchLiveSession } from '../../lib/live';
import { applyRollEvent, liveStandings, nextUp, type LivePlayer } from '../../lib/liveState';
import { useLiveChannel } from './useLiveChannel';
import { LaneSkeleton } from '../../components/Skeleton';
import { useSkeleton } from '../../lib/useSkeleton';
import type { Profile } from '../../lib/auth';

/** The name on the strip header: first name only, as written. */
const firstName = (name: string) => name.trim().split(/\s+/)[0];

/**
 * Live session · spectator (README §Live session). Read-only and deliberately
 * large: this screen gets held up around the lane. Broadcast keeps it at the
 * scorer's pace; every reconnect refetches `frames` so it can never drift.
 */
export default function LiveSpectator({ profile }: { profile: Profile }) {
  const { id: sessionId } = useParams<{ id: string }>();
  const [players, setPlayers] = useState<LivePlayer[] | null>(null);

  const session = useQuery({
    queryKey: ['live-session', sessionId],
    queryFn: () => fetchLiveSession(sessionId!),
    enabled: !!sessionId,
    // Broadcast does the fast path; this is the belt-and-braces catch-up.
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });

  const showSkeleton = useSkeleton(session.isPending);
  const state = session.data ?? null;

  // Server state is the baseline; broadcasts layer on top until the next fetch.
  useEffect(() => {
    if (state) setPlayers(state.players);
  }, [state]);

  const { status, watching } = useLiveChannel(sessionId, {
    role: 'viewer',
    presenceKey: profile.id,
    onRoll: (event) =>
      setPlayers((current) => (current ? applyRollEvent(current, event) : current)),
    onGame: () => void session.refetch(),
    onSubscribed: () => void session.refetch(),
  });

  if (showSkeleton) {
    return (
      <div className="flex flex-col gap-3 px-4 py-6">
        <LaneSkeleton label="Finding the lane" />
      </div>
    );
  }
  if (session.isPending) return <div className="px-4 py-6" />;
  if (session.isError || !state) {
    return (
      <div className="px-4">
        <EmptyState
          title="Nothing to watch"
          body="This session has finished or the link has expired."
          action={{ label: 'Back home', to: '/' }}
        />
      </div>
    );
  }

  const lane = players ?? state.players;
  const turn = nextUp(lane);
  const standings = liveStandings(lane);
  const finished = state.sessionStatus !== 'active' || state.gameStatus !== 'in_progress';
  const sub = [state.venueName, state.groupName].filter(Boolean).join(' · ') || `Game ${state.gameNumber}`;

  return (
    <div className="flex flex-col pb-6">
      <div className="px-5 pb-1 pt-2.5">
        <PageHeader back title={`${state.hostName} is bowling`} sub={sub} />
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        <p className="num text-[13px] text-ink-faded">
          {finished ? (
            <span className="font-semibold">Finished</span>
          ) : (
            <span className="font-semibold text-red">Live</span>
          )}
          {` · Game ${state.gameNumber} · ${watching} watching`}
          {!finished && status !== 'live' ? ' · Reconnecting' : ''}
        </p>

        {finished && (
          <Strip as="section">
            <div className="px-3.5 py-2.5">
              <span className="num text-[15px] font-semibold">Game {state.gameNumber} done</span>
            </div>
            {standings.map(({ player, total }, i) => (
              <div key={player.gamePlayerId} className="flex items-baseline justify-between gap-3 px-3.5 py-[11px]">
                <span className="num w-5 shrink-0 text-[15px] text-ink-faded">{i + 1}</span>
                <span className={`min-w-0 flex-1 truncate text-[15px] ${i === 0 ? 'font-semibold' : ''}`}>
                  {player.displayName}
                  {player.profileId === profile.id && <span className="font-normal text-ink-faded"> you</span>}
                </span>
                <span className={`num shrink-0 text-[18px] ${i === 0 ? 'font-semibold text-red' : ''}`}>
                  {total ?? '-'}
                </span>
              </div>
            ))}
            <p className="px-3.5 py-2.5 text-[13px] text-ink-faded">
              {state.sessionStatus === 'active'
                ? 'Waiting for the next game to start.'
                : 'That is the session done.'}
            </p>
          </Strip>
        )}

        <Scorecard
          players={lane.map((player) => ({
            name: firstName(player.displayName),
            frames: player.frames,
            current: !finished && player.gamePlayerId === turn?.player.gamePlayerId,
            currentFrame: player.gamePlayerId === turn?.player.gamePlayerId ? turn?.frame : undefined,
          }))}
          variant="live"
        />

        <p className="text-center text-[13px] text-ink-faded">
          {finished ? 'Scores are final for this game.' : 'Scores update as they are bowled.'}
        </p>
        {state.joinCode && (
          <p className="num text-center text-[13px] text-ink-faded">
            Join code <span className="text-ink">{state.joinCode}</span>
          </p>
        )}
      </div>
    </div>
  );
}
