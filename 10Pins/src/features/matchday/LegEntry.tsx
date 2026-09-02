import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { nextRoll, score, type FrameInput } from '../../engine';
import FrameEditor from '../../components/FrameEditor';
import Scorecard from '../../components/scorecard/Scorecard';
import { fetchMatchDay, saveLeg, type MdPlayer } from '../../lib/matchday';
import { toPlayers, toTeams } from './MatchDayLive';
import { ScorecardSkeleton } from '../../components/Skeleton';
import { useSkeleton } from '../../lib/useSkeleton';
import type { Profile } from '../../lib/auth';

/**
 * Score one leg for every match-day player. Frame-by-frame by default (full
 * engine + FrameEditor per player); "Just totals" is the quick fallback.
 */
export default function LegEntry({ profile }: { profile: Profile }) {
  const { id, n } = useParams<{ id: string; n: string }>();
  const legNumber = Number(n);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const md = useQuery({ queryKey: ['match-day', id], queryFn: () => fetchMatchDay(id!), enabled: !!id });

  const [entryMode, setEntryMode] = useState<'frames' | 'totals'>('frames');
  // per match-day-player frame history (last entry = current), keyed by row id
  const showSkeleton = useSkeleton(md.isPending);
  const [frameHistories, setFrameHistories] = useState<Record<string, FrameInput[][]>>({});
  const [totals, setTotals] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const teams = useMemo(() => (md.data ? toTeams(md.data) : []), [md.data]);
  const players = useMemo(() => {
    if (!md.data) return [];
    const teamOrder = new Map(teams.map((t) => [t.id, t.team_order]));
    return [...toPlayers(md.data)].sort(
      (a, b) =>
        (teamOrder.get(a.team_id) ?? 0) - (teamOrder.get(b.team_id) ?? 0) ||
        a.pairing_order - b.pairing_order,
    );
  }, [md.data, teams]);

  const save = useMutation({
    mutationFn: () => {
      const entryPlayers = players.map((p) => {
        if (entryMode === 'frames') {
          const frames = currentFrames(p.id);
          const scored = score(frames);
          return { mdPlayer: p, frames, total: scored.total! };
        }
        return { mdPlayer: p, total: Number(totals[p.id]) };
      });
      return saveLeg({
        profileId: profile.id,
        matchDayId: md.data!.id,
        sessionId: md.data!.session_id,
        groupId: md.data!.group_id,
        gameNumber: legNumber,
        entryType: entryMode === 'frames' ? 'manual' : 'total',
        players: entryPlayers,
        teams,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      navigate(`/matchday/${id}`, { replace: true });
    },
    onError: () => setError("That didn't save — your scores are still here, try again."),
  });

  if (showSkeleton) {
    return (
      <div className="flex flex-col gap-4 px-4 py-6">
        <ScorecardSkeleton players={2} label="Loading the leg" />
      </div>
    );
  }
  if (md.isPending) return <div className="px-4 py-6" />;
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
  if (md.data.created_by !== profile.id) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
        <p className="font-display text-[20px] font-bold">Organiser only</p>
        <p className="max-w-[260px] text-[13.5px] text-dim">
          Only the match-day organiser can enter leg scores.
        </p>
        <Link to={`/matchday/${id}`} className="text-[13.5px] text-phosphor">
          Back to the match day
        </Link>
      </div>
    );
  }

  function currentFrames(playerId: string): FrameInput[] {
    const history = frameHistories[playerId] ?? [[]];
    return history[history.length - 1];
  }

  const active: MdPlayer | null = players.find((p) => p.id === activeId) ?? players[0] ?? null;
  const activeFrames = active ? currentFrames(active.id) : [];
  const activeScored = score(activeFrames);
  const activePos = nextRoll(activeFrames);
  const activeHistory = active ? frameHistories[active.id] ?? [[]] : [[]];

  const framesReady = players.every((p) => score(currentFrames(p.id)).complete);
  const totalsReady = players.every((p) => {
    const v = Number(totals[p.id]);
    return totals[p.id] !== '' && totals[p.id] !== undefined && Number.isInteger(v) && v >= 0 && v <= 300;
  });
  const ready = entryMode === 'frames' ? framesReady : totalsReady;

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-[20px] font-bold">Leg {legNumber}</h1>
        <Link to={`/matchday/${id}`} className="text-[13.5px] text-dim">
          Back
        </Link>
      </header>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setEntryMode('frames')}
          className={`flex-1 rounded-[10px] border py-2 text-[12.5px] font-bold ${
            entryMode === 'frames' ? 'border-phosphor/50 bg-phosphor/10 text-phosphor' : 'border-line bg-panel text-dim'
          }`}
        >
          Frame by frame
        </button>
        <button
          type="button"
          onClick={() => setEntryMode('totals')}
          className={`flex-1 rounded-[10px] border py-2 text-[12.5px] font-bold ${
            entryMode === 'totals' ? 'border-phosphor/50 bg-phosphor/10 text-phosphor' : 'border-line bg-panel text-dim'
          }`}
        >
          Just totals
        </button>
      </div>

      {entryMode === 'frames' && active && (
        <>
          {/* player switcher, grouped by team order */}
          <div className="flex flex-wrap gap-1.5">
            {players.map((p) => {
              const scored = score(currentFrames(p.id));
              const isActive = p.id === active.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveId(p.id)}
                  className={`rounded-full border px-3 py-1.5 text-[12px] font-bold ${
                    isActive
                      ? 'border-phosphor/60 bg-phosphor/10 text-phosphor'
                      : scored.complete
                        ? 'border-line bg-well text-success'
                        : 'border-line bg-panel text-dim'
                  }`}
                >
                  {p.display_name.split(/\s+/)[0]}
                  {scored.complete ? ` ✓ ${scored.total}` : scored.total !== null ? ` ${scored.total}` : ''}
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-line bg-panel p-3">
            <Scorecard
              players={[
                {
                  name: active.display_name.split(/\s+/)[0].toUpperCase(),
                  frames: activeFrames,
                  current: true,
                  currentFrame: activePos?.frame,
                },
              ]}
              variant="live"
            />
          </div>

          <FrameEditor
            frames={activeFrames}
            onChange={(next) =>
              setFrameHistories((h) => ({
                ...h,
                [active.id]: [...(h[active.id] ?? [[]]), next],
              }))
            }
            onUndo={() =>
              setFrameHistories((h) => {
                const history = h[active.id] ?? [[]];
                return history.length > 1 ? { ...h, [active.id]: history.slice(0, -1) } : h;
              })
            }
            canUndo={activeHistory.length > 1}
            playerName={active.display_name}
          />

          {activeScored.complete && (
            <p className="text-center text-[12.5px] text-dim">
              {active.display_name} done — {activeScored.total}. Pick the next bowler above.
            </p>
          )}
        </>
      )}

      {entryMode === 'totals' && (
        <div className="flex flex-col gap-2">
          {players.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] text-text">{p.display_name}</p>
                <p className="text-[11px] text-faint">
                  {teams.find((t) => t.id === p.team_id)?.name}
                  {p.handicap > 0 ? ` · +${p.handicap} HCP` : ''}
                </p>
              </div>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={300}
                placeholder="0–300"
                aria-label={`${p.display_name} score`}
                value={totals[p.id] ?? ''}
                onChange={(e) => setTotals((t) => ({ ...t, [p.id]: e.target.value }))}
                className="score-text w-24 rounded-[10px] border border-line bg-well px-3 py-2.5 text-right text-[16px] font-bold text-text placeholder:text-[12px] placeholder:font-normal placeholder:text-faint"
              />
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setError('');
          save.mutate();
        }}
        disabled={!ready || save.isPending}
        className="rounded-[10px] bg-phosphor py-3.5 font-display text-[15px] font-bold text-ink shadow-glow-amber disabled:opacity-50 disabled:shadow-none"
      >
        {save.isPending ? 'Saving…' : `Save leg ${legNumber}`}
      </button>
      {!ready && (
        <p className="text-center text-[11.5px] text-faint">
          {entryMode === 'frames'
            ? 'Every player needs a complete game before the leg can be saved.'
            : 'Enter a 0–300 total for every player.'}
        </p>
      )}
      {error && <p className="text-center text-[13.5px] text-signal">{error}</p>}
    </div>
  );
}
