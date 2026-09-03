import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { nextRoll, score, type FrameInput } from '../../engine';
import ChipRow from '../../components/ChipRow';
import EmptyState from '../../components/EmptyState';
import FrameEditor from '../../components/FrameEditor';
import PageHeader from '../../components/PageHeader';
import Scorecard from '../../components/scorecard/Scorecard';
import Strip, { StripTitle } from '../../components/Strip';
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
    onError: () => setError('That didn’t save. Your scores are still here, so try again.'),
  });

  if (showSkeleton) {
    return (
      <div className="flex flex-col gap-4 px-4 py-5">
        <ScorecardSkeleton players={2} label="Loading the leg" />
      </div>
    );
  }
  if (md.isPending) return <div className="px-4 py-5" />;
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
  if (md.data.created_by !== profile.id) {
    return (
      <div className="px-4">
        <EmptyState
          tone="page"
          title="Organiser only"
          body="Only the person who set up the match day can enter leg scores."
          action={{ label: 'Back to the match day', to: `/matchday/${id}` }}
        />
      </div>
    );
  }

  function currentFrames(playerId: string): FrameInput[] {
    const history = frameHistories[playerId] ?? [[]];
    return history[history.length - 1];
  }

  const teamName = (teamId: string) => teams.find((t) => t.id === teamId)?.name ?? 'Team';

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
    <div className="flex flex-col gap-4 px-4 py-5">
      <PageHeader back={`/matchday/${id}`} title={`Leg ${legNumber}`} sub={teams.map((t) => t.name).join(' v ')} />

      <ChipRow
        label="How to enter scores"
        fill
        options={[
          { value: 'frames', label: 'Frame by frame' },
          { value: 'totals', label: 'Just totals' },
        ]}
        value={entryMode}
        onChange={(v) => setEntryMode(v as 'frames' | 'totals')}
      />

      {entryMode === 'frames' && active && (
        <>
          {/* Player switcher, in team then pairing order. A finished game shows its total. */}
          <div className="flex flex-col gap-1.5">
            <span className="label">Bowler</span>
            <ChipRow
              label="Bowler"
              options={players.map((p) => {
                const total = score(currentFrames(p.id)).total;
                const first = p.display_name.split(/\s+/)[0];
                return { value: p.id, label: total !== null ? `${first} · ${total}` : first };
              })}
              value={active.id}
              onChange={setActiveId}
            />
          </div>

          <Scorecard
            players={[
              {
                name: active.display_name,
                frames: activeFrames,
                meta: teamName(active.team_id),
                current: true,
                currentFrame: activePos?.frame,
              },
            ]}
            variant="live"
          />

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
            <p className="text-center text-[13px] text-ink-faded">
              {active.display_name} is done on <span className="num">{activeScored.total}</span>. Pick the next
              bowler above.
            </p>
          )}
        </>
      )}

      {entryMode === 'totals' && (
        <Strip>
          <StripTitle
            right={
              <>
                <span className="num">0</span> to <span className="num">300</span>
              </>
            }
          >
            Totals
          </StripTitle>
          {players.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-3.5 py-2.5">
              <div className="min-w-0 flex-1">
                <label htmlFor={`leg-total-${p.id}`} className="block truncate text-[15px]">
                  {p.display_name}
                </label>
                <p className="truncate text-[12px] text-ink-faded">
                  {teamName(p.team_id)}
                  {p.handicap > 0 && (
                    <>
                      {' · '}
                      <span className="num">+{p.handicap}</span> handicap
                    </>
                  )}
                </p>
              </div>
              <input
                id={`leg-total-${p.id}`}
                type="number"
                inputMode="numeric"
                min={0}
                max={300}
                aria-label={`${p.display_name} score`}
                value={totals[p.id] ?? ''}
                onChange={(e) => setTotals((t) => ({ ...t, [p.id]: e.target.value }))}
                className="field num w-20 text-right [appearance:textfield]"
              />
            </div>
          ))}
        </Strip>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => {
            setError('');
            save.mutate();
          }}
          disabled={!ready || save.isPending}
          className="btn-primary"
        >
          {save.isPending ? 'Saving' : `Save leg ${legNumber}`}
        </button>
        {!ready && (
          <p className="text-center text-[12px] text-ink-faded">
            {entryMode === 'frames'
              ? 'Every player needs a complete game before the leg can be saved.'
              : 'Enter a total for every player.'}
          </p>
        )}
        {error && (
          <p className="text-center text-[13px] text-red" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
