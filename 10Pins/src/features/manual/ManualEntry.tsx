import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { nextRoll, score, type FrameInput } from '../../engine';
import FrameEditor from '../../components/FrameEditor';
import GroupPicker from '../../components/GroupPicker';
import Scorecard from '../../components/scorecard/Scorecard';
import { fetchVenueNames, saveManualGame } from '../../lib/games';
import type { Profile } from '../../lib/auth';

function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Full manual entry: blank card, sequential, engine-driven keypad. */
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
    onError: () => setError("That didn’t save — your frames are still here, try again."),
  });

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <h1 className="font-display text-[20px] font-bold">Enter frames</h1>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <label htmlFor="date" className="label-caps">
            Date
          </label>
          <input
            id="date"
            type="date"
            value={date}
            max={today()}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-[10px] border border-line bg-well px-3 py-2.5 text-[14px] text-text [color-scheme:dark]"
          />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <label htmlFor="venue" className="label-caps">
            Venue (optional)
          </label>
          <input
            id="venue"
            type="text"
            list="venue-names-manual"
            placeholder="Hollywood Bowl…"
            value={venue}
            onChange={(event) => setVenue(event.target.value)}
            className="rounded-[10px] border border-line bg-well px-3 py-2.5 text-[14px] text-text placeholder:text-faint"
          />
          <datalist id="venue-names-manual">
            {(venues.data ?? []).map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
      </div>

      <GroupPicker profileId={profile.id} value={groupId} onChange={setGroupId} id="manual-group" />

      <div className="rounded-2xl border border-line bg-panel p-3">
        <Scorecard
          players={[
            {
              name: profile.display_name.split(/\s+/)[0].toUpperCase(),
              frames,
              current: true,
              currentFrame: pos?.frame,
              settleFrames,
            },
          ]}
          variant="live"
        />
      </div>

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
          className="rounded-[10px] bg-phosphor py-3.5 font-display text-[15px] font-bold text-ink shadow-glow-amber disabled:opacity-60"
        >
          {save.isPending ? 'Saving…' : `Save game — ${scored.total}`}
        </button>
      )}
      {error && <p className="text-center text-[13.5px] text-signal">{error}</p>}
    </div>
  );
}
