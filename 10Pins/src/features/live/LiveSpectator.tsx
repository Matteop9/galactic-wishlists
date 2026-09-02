import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Scorecard from '../../components/scorecard/Scorecard';
import { fetchLiveSession } from '../../lib/live';
import { applyRollEvent, liveStandings, nextUp, runningTotal, type LivePlayer } from '../../lib/liveState';
import { useLiveChannel } from './useLiveChannel';
import { LaneSkeleton } from '../../components/Skeleton';
import { useSkeleton } from '../../lib/useSkeleton';
import type { Profile } from '../../lib/auth';

const firstName = (name: string) => name.trim().split(/\s+/)[0].toUpperCase();

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
      <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
        <p className="font-display text-[20px] font-bold">Nothing to watch</p>
        <p className="max-w-[260px] text-[13.5px] text-dim">
          This session has finished or the link has expired.
        </p>
        <Link to="/" className="text-[13.5px] text-phosphor">
          Back home
        </Link>
      </div>
    );
  }

  const lane = players ?? state.players;
  const turn = nextUp(lane);
  const standings = liveStandings(lane);
  const finished = state.sessionStatus !== 'active' || state.gameStatus !== 'in_progress';

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="label-caps text-faint">
            {state.hostName}
            {state.venueName ? ` · ${state.venueName}` : ''}
          </p>
          <h1 className="truncate font-display text-[22px] font-bold">Game {state.gameNumber}</h1>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`rounded-full border px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[.12em] ${
              status === 'live'
                ? 'border-success/60 text-success'
                : 'border-line text-dim'
            }`}
          >
            {status === 'live' ? 'Synced' : 'Reconnecting'}
          </span>
          <span className="label-caps text-faint">{watching} watching</span>
        </div>
      </header>

      {finished ? (
        <p className="rounded-xl border border-line bg-panel px-4 py-3 text-center text-[13px] text-dim">
          {state.sessionStatus === 'active'
            ? 'Game over — waiting for the next one to be racked up.'
            : 'That’s the session done.'}
        </p>
      ) : (
        <div className="flex items-center justify-between rounded-2xl border-[1.5px] border-phosphor bg-panel px-4 py-4 shadow-glow-amber">
          <div className="min-w-0">
            <p className="label-caps text-phosphor">Now bowling</p>
            <p className="truncate font-display text-[24px] font-bold">
              {turn?.player.displayName ?? '—'}
            </p>
            <p className="text-[12px] text-dim">
              {turn ? `Frame ${turn.frame + 1} · Roll ${turn.roll + 1}` : 'Game complete'}
            </p>
          </div>
          <span className="score-text text-[40px] font-bold text-phosphor">
            {(turn && runningTotal(turn.player.frames)) ?? '—'}
          </span>
        </div>
      )}

      <div className="rounded-2xl border border-line bg-panel p-3">
        <Scorecard
          // No `current` flag: the panel above already says who is bowling, so
          // the card only needs the amber frame, not a second NOW BOWLING pill.
          players={lane.map((player) => ({
            name: firstName(player.displayName),
            frames: player.frames,
            currentFrame: player.gamePlayerId === turn?.player.gamePlayerId ? turn?.frame : undefined,
          }))}
          variant="live"
        />
      </div>

      <ol className="flex flex-col gap-2">
        {standings.map(({ player, total }, i) => (
          <li
            key={player.gamePlayerId}
            className="flex items-baseline justify-between rounded-xl border border-line bg-panel px-4 py-3"
          >
            <span className={`text-[16px] ${i === 0 ? 'font-display font-bold text-text' : 'text-dim'}`}>
              {i + 1}. {player.displayName}
            </span>
            <span className={`score-text text-[22px] font-bold ${i === 0 ? 'text-phosphor' : 'text-text'}`}>
              {total ?? '—'}
            </span>
          </li>
        ))}
      </ol>

      {state.joinCode && (
        <p className="text-center text-[12px] text-faint">
          Join code <span className="score-text tracking-[.18em] text-dim">{state.joinCode}</span>
        </p>
      )}
    </div>
  );
}
