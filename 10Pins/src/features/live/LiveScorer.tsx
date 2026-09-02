import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { score, type FrameInput } from '../../engine';
import FrameEditor from '../../components/FrameEditor';
import Scorecard from '../../components/scorecard/Scorecard';
import VerificationBadge from '../../components/VerificationBadge';
import {
  abandonLiveGame,
  endLiveSession,
  fetchLiveSession,
  fetchViewers,
  finishLiveGame,
  shareLink,
  startNextGame,
  upsertFrame,
  GAME_EVENT,
  ROLL_EVENT,
} from '../../lib/live';
import {
  clearSnapshot,
  diffPending,
  gameComplete,
  loadSnapshot,
  nextUp,
  queueFrame,
  runningTotal,
  saveSnapshot,
  type LivePlayer,
  type PendingFrame,
} from '../../lib/liveState';
import { useLiveChannel } from './useLiveChannel';
import { LaneSkeleton } from '../../components/Skeleton';
import { useSkeleton } from '../../lib/useSkeleton';
import { gameCelebration, rollCelebration } from '../../lib/celebrate';
import { celebrate, dismissCelebration } from '../../lib/celebrationStore';
import JoinQr from '../../components/JoinQr';
import ShareSheet from '../../components/share/ShareSheet';
import type { ShareCardData } from '../../components/share/ShareCard';
import type { Profile } from '../../lib/auth';

const firstName = (name: string) => name.trim().split(/\s+/)[0].toUpperCase();

/**
 * Live session · scorer (README §Live session). One phone owns the game: every
 * keypad tap scores locally first, mirrors to localStorage, queues a frame
 * upsert and broadcasts to spectators. Losing signal is not a failure state —
 * scoring carries on and the queue drains when the network comes back.
 */
export default function LiveScorer({ profile }: { profile: Profile }) {
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const session = useQuery({
    queryKey: ['live-session', sessionId],
    queryFn: () => fetchLiveSession(sessionId!),
    enabled: !!sessionId,
  });
  const showSkeleton = useSkeleton(session.isPending);
  const viewers = useQuery({
    queryKey: ['live-viewers', sessionId],
    queryFn: () => fetchViewers(sessionId!),
    enabled: !!sessionId,
    refetchInterval: 60_000,
  });

  // History stack = undo. Empty until the game has been hydrated.
  const [history, setHistory] = useState<LivePlayer[][]>([]);
  const [gameId, setGameId] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [netError, setNetError] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [shared, setShared] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const pendingRef = useRef<PendingFrame[]>([]);
  const snapshotRef = useRef<{ gameId: string; gameNumber: number; players: LivePlayer[] } | null>(null);
  const drainingRef = useRef(false);
  const finishedRef = useRef<string | null>(null);

  const state = session.data ?? null;
  // True only once `history` holds THIS game. Between "next game" and the
  // refetched session landing, history still holds the finished game — reading
  // it then would treat the fresh game as already complete.
  const hydrated = !!state && gameId === state.gameId;
  const players = hydrated ? (history[history.length - 1] ?? []) : [];

  const setQueue = useCallback((next: PendingFrame[]) => {
    pendingRef.current = next;
    setPendingCount(next.length);
  }, []);

  /**
   * Mirror the game to localStorage. Called with new players after a roll and
   * with none after each queue drain, so the stored queue never claims writes
   * that already landed.
   */
  const persist = useCallback(
    (next?: LivePlayer[], game?: { gameId: string; gameNumber: number }) => {
      if (!sessionId) return;
      if (next && game) {
        snapshotRef.current = { gameId: game.gameId, gameNumber: game.gameNumber, players: next };
      }
      const snapshot = snapshotRef.current;
      if (!snapshot) return;
      saveSnapshot({
        sessionId,
        gameId: snapshot.gameId,
        gameNumber: snapshot.gameNumber,
        updatedAt: new Date().toISOString(),
        players: snapshot.players,
        pending: pendingRef.current,
      });
    },
    [sessionId],
  );

  /** Drain the frame queue one row at a time so partial progress is kept. */
  const drain = useCallback(async () => {
    if (drainingRef.current || pendingRef.current.length === 0) return;
    drainingRef.current = true;
    setSyncing(true);
    try {
      while (pendingRef.current.length > 0) {
        await upsertFrame(pendingRef.current[0]);
        setQueue(pendingRef.current.slice(1));
        persist();
      }
      setNetError(false);
    } catch {
      setNetError(true); // stays queued; the retry loop and 'online' both retry
    } finally {
      drainingRef.current = false;
      setSyncing(false);
    }
  }, [persist, setQueue]);

  // Hydrate: the local snapshot wins when it belongs to this game — this device
  // is the only writer, so anything it has not flushed yet is the newest truth.
  useEffect(() => {
    if (!state || !sessionId || gameId === state.gameId) return;
    const snapshot = loadSnapshot(sessionId);
    const resume = snapshot && snapshot.gameId === state.gameId;
    const restored = resume ? snapshot.players : state.players;
    setQueue(resume ? snapshot.pending : []);
    setHistory([restored]);
    snapshotRef.current = {
      gameId: state.gameId,
      gameNumber: state.gameNumber,
      players: restored,
    };
    setGameId(state.gameId);
    finishedRef.current = state.gameStatus === 'in_progress' ? null : state.gameId;
    if (resume && snapshot.pending.length > 0) void drain();
  }, [state, sessionId, gameId, drain, setQueue]);

  const { status, watching, broadcast } = useLiveChannel(sessionId, {
    role: 'scorer',
    presenceKey: profile.id,
    onSubscribed: () => void drain(),
  });

  // Retry the queue on reconnect and on a slow timer while anything is stuck.
  useEffect(() => {
    const onOnline = () => void drain();
    window.addEventListener('online', onOnline);
    const timer = window.setInterval(() => void drain(), 15_000);
    return () => {
      window.removeEventListener('online', onOnline);
      window.clearInterval(timer);
    };
  }, [drain]);

  const complete = gameComplete(players);
  const turn = nextUp(players);
  const active = turn?.player ?? players[0] ?? null;

  const [sharing, setSharing] = useState(false);

  const finish = useMutation({
    mutationFn: () =>
      finishLiveGame({
        profileId: profile.id,
        sessionId: sessionId!,
        groupId: state?.groupId ?? null,
        gameId: state!.gameId,
        players,
      }),
    onSuccess: (result) => {
      clearSnapshot(sessionId!);
      queryClient.invalidateQueries();
      // Your own highlights first. If you weren’t bowling — someone else’s
      // phone, or you’re just keeping score — celebrate the loudest thing that
      // happened on the lane, because this is the only screen that saw it.
      const mine = result.byProfile[profile.id];
      const loudest = mine ?? result.highlights;
      // The roll ladder already celebrated the turkey when the third strike
      // landed; the end-of-game moment is for things only the total can tell you.
      celebrate(gameCelebration(loudest.filter((code) => code !== 'TURKEY'), state?.gameId));
    },
    onError: () => {
      finishedRef.current = null;
      setError("Couldn’t save the game — tap Save game to try again.");
    },
  });

  // Complete + everything written = save it. Once per game.
  useEffect(() => {
    if (!state || !hydrated || !complete || pendingCount > 0 || netError) return;
    if (state.gameStatus !== 'in_progress' || finishedRef.current === state.gameId) return;
    finishedRef.current = state.gameId;
    finish.mutate();
    // finish is a stable mutation object from react-query
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, hydrated, complete, pendingCount, netError]);

  const nextGame = useMutation({
    mutationFn: () =>
      startNextGame({
        profileId: profile.id,
        sessionId: sessionId!,
        gameNumber: state!.gameNumber,
        players,
      }),
    onSuccess: async (newGameId) => {
      clearSnapshot(sessionId!);
      setGameId(null); // forces re-hydration from the refetched session
      broadcast(GAME_EVENT, { gameId: newGameId, gameNumber: (state?.gameNumber ?? 1) + 1 });
      await queryClient.invalidateQueries();
    },
    onError: () => setError("Couldn’t start the next game — try again."),
  });

  const endSession = useMutation({
    mutationFn: async () => {
      if (state && state.gameStatus === 'in_progress' && !complete) {
        await abandonLiveGame(state.gameId);
      }
      await endLiveSession({ sessionId: sessionId!, groupId: state?.groupId ?? null });
    },
    onSuccess: async () => {
      clearSnapshot(sessionId!);
      await queryClient.invalidateQueries();
      navigate('/', { replace: true });
    },
    onError: () => setError("Couldn’t end the session — try again."),
  });

  /** Every state change goes through here: queue, persist, broadcast, drain. */
  function commit(next: LivePlayer[]) {
    if (!state) return;

    // Celebrate whoever just bowled — the scorer’s phone is keeping score for
    // the whole lane, and the point is the table reacting, not the phone’s
    // owner. Fired before any network work, so it lands at keypad speed. A
    // roll that isn’t worth celebrating clears the last one: that is what
    // makes the ladder feel skippable rather than sticky.
    const bowler = active?.gamePlayerId;
    const before = players.find((p) => p.gamePlayerId === bowler)?.frames ?? [];
    const after = next.find((p) => p.gamePlayerId === bowler)?.frames ?? [];
    const moment = rollCelebration(before, after, active?.displayName);
    if (moment) celebrate(moment);
    else dismissCelebration();

    const writes = diffPending(players, next);
    let queue = pendingRef.current;
    for (const write of writes) queue = queueFrame(queue, write);
    setQueue(queue);
    setHistory((h) => [...h, next]);
    persist(next, state);
    for (const write of writes) {
      broadcast(ROLL_EVENT, {
        gameId: state.gameId,
        gamePlayerId: write.gamePlayerId,
        frameNo: write.frameNo,
        rolls: write.rolls,
      });
    }
    void drain();
  }

  function undo() {
    if (history.length < 2 || !state) return;
    dismissCelebration(); // whatever it was celebrating just stopped being true
    const previous = history[history.length - 2];
    const writes = diffPending(players, previous);
    let queue = pendingRef.current;
    for (const write of writes) queue = queueFrame(queue, write);
    setQueue(queue);
    setHistory((h) => h.slice(0, -1));
    persist(previous, state);
    for (const write of writes) {
      broadcast(ROLL_EVENT, {
        gameId: state.gameId,
        gamePlayerId: write.gamePlayerId,
        frameNo: write.frameNo,
        rolls: write.rolls,
      });
    }
    void drain();
  }

  async function share() {
    if (!state?.joinCode) return;
    const url = shareLink(state.joinCode);
    const text = `Watch me bowl live on 10 Pins — ${url}`;
    try {
      if (navigator.share) await navigator.share({ title: '10 Pins — live', text, url });
      else await navigator.clipboard.writeText(url);
      setShared(true);
      window.setTimeout(() => setShared(false), 2500);
    } catch {
      /* dismissed the share sheet — nothing to report */
    }
  }

  if (showSkeleton) {
    return (
      <div className="flex flex-col gap-3 px-4 py-6">
        <LaneSkeleton />
      </div>
    );
  }
  if (session.isPending) return <div className="px-4 py-6" />;
  if (session.isError || !state) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
        <h1 className="font-display text-[20px] font-bold">Session not found</h1>
        <Link to="/" className="text-[13.5px] text-phosphor">
          Back home
        </Link>
      </div>
    );
  }
  if (state.hostId !== profile.id) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
        <h1 className="font-display text-[20px] font-bold">{state.hostName} is scoring</h1>
        <p className="max-w-[260px] text-[13.5px] text-dim">
          One phone keeps the score. You can watch this one live.
        </p>
        <Link to={`/live/${sessionId}/watch`} className="text-[13.5px] text-phosphor">
          Watch the game
        </Link>
      </div>
    );
  }

  const saved = pendingCount === 0 && !netError;

  // Everything the card needs is already on this phone.
  const cardWinner = [...players].sort(
    (a, b) => (runningTotal(b.frames) ?? 0) - (runningTotal(a.frames) ?? 0),
  )[0];
  const liveShareData: ShareCardData | null = cardWinner
    ? {
        frames: cardWinner.frames,
        players: players.map((p) => ({
          name: p.displayName,
          score: score(p.frames).total,
          isYou: p.profileId === profile.id,
        })),
        verification: 'live',
        highlights: cardWinner.profileId ? (finish.data?.byProfile[cardWinner.profileId] ?? []) : [],
        strikes: score(cardWinner.frames).frames.filter((f) => f.isStrike).length,
        groupName: state.groupName ?? null,
        venueName: state.venueName ?? null,
        playedAt: new Date().toISOString(),
      }
    : null;

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="size-2 shrink-0 live-dot rounded-full bg-signal" aria-hidden />
          <h1 className="truncate font-display text-[18px] font-bold">Game {state.gameNumber}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-faint">{watching} watching</span>
          <button
            type="button"
            onClick={() => setShowShare((open) => !open)}
            className="rounded-chip border border-line bg-panel px-3 py-1.5 text-[12.5px] text-dim"
          >
            Share
          </button>
        </div>
      </header>

      <div className="flex items-center justify-between text-[11.5px]">
        <span className={saved ? 'text-success' : netError ? 'text-signal' : 'text-dim'}>
          {netError
            ? `Offline — scoring locally (${pendingCount} to sync)`
            : syncing || pendingCount > 0
              ? 'Syncing…'
              : status === 'live'
                ? 'Synced'
                : 'Connecting…'}
        </span>
        <span className="text-faint">
          {state.venueName ?? 'No venue'}
          {state.groupName ? ` · ${state.groupName}` : ''}
        </span>
      </div>

      {showShare && (
        <div className="flex flex-col gap-3 rounded-card border border-line bg-panel p-4">
          <p className="text-[13px] text-dim">Send this to anyone who wants to watch along.</p>
          {state.joinCode && (
            <JoinQr url={`${window.location.origin}/live/join/${state.joinCode}`} label="Scan to watch" />
          )}
          <p className="score-text text-center text-[26px] font-bold tracking-[.18em] text-phosphor">
            {state.joinCode ?? '——'}
          </p>
          <button
            type="button"
            onClick={share}
            className="rounded-control border border-line bg-well py-2.5 text-[13.5px] text-text"
          >
            {shared ? 'Link copied' : 'Share the link'}
          </button>
          {(viewers.data ?? []).length > 0 && (
            <p className="text-[12px] text-faint">
              Joined: {(viewers.data ?? []).map((v) => v.profiles?.display_name ?? 'Someone').join(', ')}
            </p>
          )}
        </div>
      )}

      <div className="rounded-card border border-line bg-panel p-3">
        <Scorecard
          players={players.map((player) => ({
            name: firstName(player.displayName),
            frames: player.frames,
            current: player.gamePlayerId === active?.gamePlayerId,
            currentFrame: player.gamePlayerId === active?.gamePlayerId ? turn?.frame : undefined,
          }))}
          variant="live"
        />
      </div>

      {!complete && active && (
        <FrameEditor
          frames={active.frames}
          onChange={(next: FrameInput[]) =>
            commit(players.map((p) => (p.gamePlayerId === active.gamePlayerId ? { ...p, frames: next } : p)))
          }
          onUndo={undo}
          canUndo={history.length > 1}
          playerName={active.displayName}
        />
      )}

      {complete && (
        <div className="flex flex-col gap-3 rounded-card border border-line bg-panel p-4">
          <div className="flex items-center justify-between">
            <p className="font-display text-[17px] font-bold">
              {finish.isPending ? 'Saving the game…' : `Game ${state.gameNumber} done`}
            </p>
            <VerificationBadge status="live" />
          </div>
          <ol className="flex flex-col gap-1.5">
            {[...players]
              .sort((a, b) => (runningTotal(b.frames) ?? 0) - (runningTotal(a.frames) ?? 0))
              .map((player, i) => (
                <li key={player.gamePlayerId} className="flex items-baseline justify-between">
                  <span className={`text-[14px] ${i === 0 ? 'font-display font-bold text-text' : 'text-dim'}`}>
                    {i + 1}. {player.displayName}
                  </span>
                  <span
                    className={`score-text text-[16px] font-bold ${i === 0 ? 'text-phosphor' : 'text-text'}`}
                  >
                    {score(player.frames).total ?? '—'}
                  </span>
                </li>
              ))}
          </ol>
          <p className="text-[12px] text-faint">
            Frame-by-frame scores count as live-scored. Photo verification lands with the scan flow.
          </p>

          {!finish.isPending && !finish.isError && (
            <button
              type="button"
              onClick={() => setSharing(true)}
              className="press rounded-control border border-line bg-well py-2.5 text-[13.5px] font-bold text-text"
            >
              Share the card
            </button>
          )}

          {finish.isError && (
            <button
              type="button"
              onClick={() => {
                setError('');
                finish.mutate();
              }}
              className="rounded-control border border-line bg-well py-2.5 text-[13.5px] text-text"
            >
              Save game
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setError('');
              nextGame.mutate();
            }}
            disabled={
              nextGame.isPending ||
              finish.isPending ||
              (state.gameStatus === 'in_progress' && !finish.isSuccess)
            }
            className="btn-primary"
          >
            {nextGame.isPending ? 'Racking up…' : 'Next game — same players'}
          </button>
          <Link
            to={`/games/${state.gameId}`}
            className="text-center text-[13.5px] text-dim underline underline-offset-4"
          >
            See the scorecard
          </Link>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setError('');
          endSession.mutate();
        }}
        disabled={endSession.isPending}
        className="rounded-control border border-line bg-panel py-3 text-[13.5px] text-dim"
      >
        {endSession.isPending
          ? 'Ending…'
          : complete || state.gameStatus !== 'in_progress'
            ? 'End session'
            : 'Abandon game and end session'}
      </button>
      {error && <p className="text-center text-[13.5px] text-signal">{error}</p>}

      {sharing && liveShareData && (
        <ShareSheet data={liveShareData} onClose={() => setSharing(false)} />
      )}
    </div>
  );
}
