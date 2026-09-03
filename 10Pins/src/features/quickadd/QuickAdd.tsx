import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import GroupPicker from '../../components/GroupPicker';
import Icon from '../../components/Icon';
import Strip from '../../components/Strip';
import { fetchVenueNames, saveQuickGame, type GuestScore } from '../../lib/games';
import type { Profile } from '../../lib/auth';

function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Quick add: totals only, labelled unverified at the point of entry. */
export default function QuickAdd({ profile }: { profile: Profile }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [scoreText, setScoreText] = useState('');
  const [date, setDate] = useState(today());
  const [venue, setVenue] = useState('');
  const [guests, setGuests] = useState<GuestScore[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const venues = useQuery({ queryKey: ['venues'], queryFn: fetchVenueNames });

  const scoreValue = Number(scoreText);
  const scoreValid = scoreText !== '' && Number.isInteger(scoreValue) && scoreValue >= 0 && scoreValue <= 300;
  const guestsValid = guests.every(
    (g) => g.name.trim().length > 0 && Number.isInteger(g.score) && g.score >= 0 && g.score <= 300,
  );

  const save = useMutation({
    mutationFn: () =>
      saveQuickGame({
        profileId: profile.id,
        score: scoreValue,
        playedAt: new Date(`${date}T12:00:00`).toISOString(),
        venueName: venue,
        guests: guests.map((g) => ({ ...g, name: g.name.trim() })),
        target: { groupId },
      }),
    onSuccess: (gameId) => {
      queryClient.invalidateQueries();
      navigate(`/games/${gameId}`, { replace: true });
    },
    onError: () => setError('That didn’t save. Check your connection and try again.'),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (scoreValid && guestsValid) save.mutate();
  }

  return (
    <form onSubmit={submit} className="flex min-h-[calc(100dvh-96px)] flex-col">
      <div className="flex items-center justify-between px-5 pt-2.5 pb-1">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Close"
          className="press -ml-2.5 flex size-11 items-center justify-center text-ink"
        >
          <Icon name="x" className="size-6" />
        </button>
        <h1 className="num text-[18px] font-semibold">Type the totals</h1>
        <span className="-mr-2.5 w-11" aria-hidden />
      </div>

      <div className="flex flex-col gap-[18px] px-5 py-[18px]">
        <Strip>
          <div className="flex flex-col items-center gap-0.5 pt-[22px] pb-4">
            <label htmlFor="score" className="label text-ink-faded">
              Your score
            </label>
            <input
              id="score"
              type="number"
              inputMode="numeric"
              min={0}
              max={300}
              required
              value={scoreText}
              onChange={(event) => setScoreText(event.target.value)}
              className="num w-full border-0 bg-transparent text-center text-[96px] font-semibold leading-none caret-blue outline-none [appearance:textfield]"
            />
            <span className="text-[13px] text-ink-faded">
              <span className="num">0</span> to <span className="num">300</span>
            </span>
          </div>
        </Strip>

        <GroupPicker profileId={profile.id} value={groupId} onChange={setGroupId} id="quick-group" />

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
              list="venue-names"
              placeholder="Hollywood Bowl"
              value={venue}
              onChange={(event) => setVenue(event.target.value)}
              className="field"
            />
            <datalist id="venue-names">
              {(venues.data ?? []).map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="label">
            Who else played <span className="optional">optional</span>
          </span>
          {guests.map((guest, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                aria-label={`Player ${i + 2} name`}
                placeholder="Name"
                value={guest.name}
                onChange={(event) =>
                  setGuests((gs) => gs.map((g, j) => (j === i ? { ...g, name: event.target.value } : g)))
                }
                className="field min-w-0 flex-1"
              />
              <input
                type="number"
                aria-label={`Player ${i + 2} score`}
                inputMode="numeric"
                min={0}
                max={300}
                placeholder="Score"
                value={Number.isNaN(guest.score) ? '' : guest.score}
                onChange={(event) =>
                  setGuests((gs) => gs.map((g, j) => (j === i ? { ...g, score: Number(event.target.value) } : g)))
                }
                className="field num w-20 text-right [appearance:textfield]"
              />
              <button
                type="button"
                aria-label={`Remove player ${i + 2}`}
                onClick={() => setGuests((gs) => gs.filter((_, j) => j !== i))}
                className="press flex size-11 shrink-0 items-center justify-center text-ink-faded"
              >
                <Icon name="x" className="size-5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setGuests((gs) => [...gs, { name: '', score: NaN }])}
            className="press self-start py-2.5 text-[13px] font-semibold text-blue"
          >
            Add another player
          </button>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3 px-5 py-3">
        <button type="submit" disabled={!scoreValid || !guestsValid || save.isPending} className="btn-primary">
          {save.isPending ? 'Saving' : 'Save game'}
        </button>
        <p className="text-center text-[12px] text-ink-faded">
          Saved as unverified. Totals-only games count in your stats and averages. Attach a photo or add
          frames later to upgrade.
        </p>
        {error && (
          <p className="text-center text-[13px] text-red" role="alert">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
