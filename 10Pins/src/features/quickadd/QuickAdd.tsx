import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import GroupPicker from '../../components/GroupPicker';
import Icon from '../../components/Icon';
import VerificationBadge from '../../components/VerificationBadge';
import { fetchVenueNames, saveQuickGame, type GuestScore } from '../../lib/games';
import type { Profile } from '../../lib/auth';

function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Quick add: totals only, ten-second flow, labelled unverified at the point of entry. */
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
    onError: () => setError("That didn’t save — check your connection and try again."),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (scoreValid && guestsValid) save.mutate();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[20px] font-bold">Quick add</h1>
        <VerificationBadge status="unverified" />
      </div>

      <div className="flex flex-col items-center gap-2">
        <label htmlFor="score" className="label-caps">
          Your score
        </label>
        <input
          id="score"
          type="number"
          inputMode="numeric"
          min={0}
          max={300}
          required
          placeholder="0–300"
          value={scoreText}
          onChange={(event) => setScoreText(event.target.value)}
          className="score-text w-40 rounded-card border border-line bg-well py-4 text-center text-[34px] font-bold text-text placeholder:text-[17px] placeholder:text-faint"
        />
      </div>

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
            className="rounded-control border border-line bg-well px-3 py-3 text-[14px] text-text [color-scheme:dark]"
          />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <label htmlFor="venue" className="label-caps">
            Venue (optional)
          </label>
          <input
            id="venue"
            type="text"
            list="venue-names"
            placeholder="Hollywood Bowl…"
            value={venue}
            onChange={(event) => setVenue(event.target.value)}
            className="rounded-control border border-line bg-well px-3 py-3 text-[14px] text-text placeholder:text-faint"
          />
          <datalist id="venue-names">
            {(venues.data ?? []).map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
      </div>

      <GroupPicker profileId={profile.id} value={groupId} onChange={setGroupId} id="quick-group" />

      <div className="flex flex-col gap-3">
        <span className="label-caps">Who else played? (optional)</span>
        {guests.map((guest, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              aria-label={`Player ${i + 2} name`}
              placeholder="Name"
              value={guest.name}
              onChange={(event) =>
                setGuests((gs) => gs.map((g, j) => (j === i ? { ...g, name: event.target.value } : g)))
              }
              className="min-w-0 flex-1 rounded-control border border-line bg-well px-3 py-2.5 text-[14px] text-text placeholder:text-faint"
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
              className="score-text w-20 rounded-control border border-line bg-well px-3 py-2.5 text-[14px] text-text placeholder:text-faint"
            />
            <button
              type="button"
              aria-label={`Remove player ${i + 2}`}
              onClick={() => setGuests((gs) => gs.filter((_, j) => j !== i))}
              className="text-faint"
            >
              <Icon name="x" className="size-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setGuests((gs) => [...gs, { name: '', score: NaN }])}
          className="self-start rounded-chip border border-line bg-well px-3 py-2 text-[13.5px] text-dim"
        >
          Add another player
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="submit"
          disabled={!scoreValid || !guestsValid || save.isPending}
          className="btn-primary"
        >
          {save.isPending ? 'Adding…' : 'Add game'}
        </button>
        <p className="text-center text-[12px] text-faint">
          Totals-only games count in your stats and averages. Attach a photo or add frames later to
          upgrade.
        </p>
        {error && <p className="text-center text-[13.5px] text-signal">{error}</p>}
      </div>
    </form>
  );
}
