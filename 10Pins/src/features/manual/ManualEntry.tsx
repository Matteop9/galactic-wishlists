import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { nextRoll, score, type FrameInput } from '../../engine';
import FrameEditor from '../../components/FrameEditor';
import GroupPicker from '../../components/GroupPicker';
import Icon from '../../components/Icon';
import Scorecard from '../../components/scorecard/Scorecard';
import { fetchVenueNames, saveManualGame } from '../../lib/games';
import type { Profile } from '../../lib/auth';

function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Full manual entry: a blank sheet, filled in frame by frame with the engine-driven keypad. */
export default function ManualEntry({ profile }: { profile: Profile }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [history, setHistory] = useState<FrameInput[][]>([[]]);
  const [date, setDate] = useState(today());
  const [venue, setVenue] = useState('');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const frames = history[history.length - 1];
  const scored = score(frames);
  const pos = nextRoll(frames);
  const venues = useQuery({ queryKey: ['venues'], queryFn: fetchVenueNames });

  const cumulatives = scored.frames.map((f) => f.cumulative);
  const previous = useRef<(number | null)[]>([]);
  const settleFrames = cumulatives
    .map((c, i) => (c !== null && previous.current[i] !== c ? i : -1))
    .filter((i) => i >= 0);
  useEffect(() => {
    previous.current = cumulatives;
  });

  const save = useMutation({
    mutationFn: () =>
      saveManualGame({
        profileId: profile.id,
        frames,
        playedAt: new Date(`${date}T12:00:00`).toISOString(),
        venueName: venue,
        target: { groupId },
      }),
    onSuccess: (gameId) => {
      queryClient.invalidateQueries();
      navigate(`/games/${gameId}`, { replace: true });
    },
    onError: () => setError('That didn’t save. Your frames are still here, try again.'),
  });

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-5 pt-2.5 pb-1">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Close"
          className="press -ml-2.5 flex size-11 items-center justify-center text-ink"
        >
          <Icon name="x" className="size-6" />
        </button>
        <h1 className="num text-[18px] font-semibold">Enter the frames</h1>
        <span className="-mr-2.5 w-11" aria-hidden />
      </div>

      <div className="flex flex-col gap-[18px] px-5 py-[18px]">
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="date" className="label">
              Date
            </label>
            <input
              id="date"
              type="date"
              value={date}
              max={today()}
              onChange={(event) => setDate(event.target.value)}
              className="field num"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="venue" className="label">
              Venue <span className="optional">optional</span>
            </label>
            <input
              id="venue"
              type="text"
              list="venue-names-manual"
              placeholder="Hollywood Bowl"
              value={venue}
              onChange={(event) => setVenue(event.target.value)}
              className="field"
            />
            <datalist id="venue-names-manual">
              {(venues.data ?? []).map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
        </div>

        <GroupPicker profileId={profile.id} value={groupId} onChange={setGroupId} id="manual-group" />

        <Scorecard
          players={[
            {
              name: profile.display_name.split(/\s+/)[0],
              frames,
              current: true,
              currentFrame: pos?.frame,
              settleFrames,
            },
          ]}
          variant="live"
        />

        <FrameEditor
          frames={frames}
          onChange={(next) => setHistory((h) => [...h, next])}
          onUndo={() => setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h))}
          canUndo={history.length > 1}
          playerName={profile.display_name}
        />

        {scored.complete && (
          <button
            type="button"
            onClick={() => {
              setError('');
              save.mutate();
            }}
            disabled={save.isPending}
            className="btn-primary"
          >
            {save.isPending ? (
              'Saving'
            ) : (
              <>
                Save game
                <span className="num ml-2">{scored.total}</span>
              </>
            )}
          </button>
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
