import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import GroupPicker from '../../components/GroupPicker';
import Icon from '../../components/Icon';
import { fetchVenueNames } from '../../lib/games';
import { fetchGroup } from '../../lib/groups';
import { fetchFriendships, otherProfile } from '../../lib/friends';
import { createLiveSession, type NewLivePlayer } from '../../lib/live';
import type { Profile } from '../../lib/auth';

interface DraftPlayer extends NewLivePlayer {
  key: string;
}

/**
 * Live session · create (README §Live session): group, venue, the line-up in
 * bowling order. You are always in the game and always seat one — the phone
 * doing the scoring is at the lane.
 */
export default function LiveSetup({ profile }: { profile: Profile }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [groupId, setGroupId] = useState<string | null>(null);
  const [venue, setVenue] = useState('');
  const [guestName, setGuestName] = useState('');
  const [error, setError] = useState('');
  const [players, setPlayers] = useState<DraftPlayer[]>([
    { key: profile.id, profile_id: profile.id, guest_name: null, display_name: profile.display_name },
  ]);

  const venues = useQuery({ queryKey: ['venues'], queryFn: fetchVenueNames });
  const group = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => fetchGroup(groupId!),
    enabled: !!groupId,
  });
  const friends = useQuery({
    queryKey: ['friendships', profile.id],
    queryFn: () => fetchFriendships(profile.id),
  });

  const chosen = new Set(players.map((p) => p.key));

  const candidates: DraftPlayer[] = [
    ...(group.data?.group_members ?? []).map((m) => ({
      key: m.profile_id,
      profile_id: m.profile_id,
      guest_name: null,
      display_name: m.profiles?.display_name ?? 'Player',
    })),
    ...(friends.data ?? [])
      .filter((f) => f.status === 'accepted')
      .map((f) => otherProfile(f, profile.id))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map((p) => ({
        key: p.id,
        profile_id: p.id,
        guest_name: null,
        display_name: p.display_name,
      })),
  ].filter((c, i, all) => !chosen.has(c.key) && all.findIndex((x) => x.key === c.key) === i);

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= players.length) return;
    setPlayers((list) => {
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addGuest() {
    const name = guestName.trim();
    if (!name) return;
    if (players.some((p) => (p.guest_name ?? '').toLowerCase() === name.toLowerCase())) {
      setError(`${name} is already in this game.`);
      return;
    }
    setError('');
    setPlayers((list) => [
      ...list,
      { key: `guest:${name.toLowerCase()}`, profile_id: null, guest_name: name, display_name: name },
    ]);
    setGuestName('');
  }

  const start = useMutation({
    mutationFn: () =>
      createLiveSession({
        profileId: profile.id,
        groupId,
        venueName: venue,
        players: players.map(({ key: _key, ...player }) => player),
      }),
    onSuccess: ({ sessionId }) => {
      queryClient.invalidateQueries();
      navigate(`/live/${sessionId}`, { replace: true });
    },
    onError: () => setError("Couldn’t start the session — check your signal and try again."),
  });

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-[20px] font-bold">Score live</h1>
        <Link to="/" className="text-[13.5px] text-dim">
          Cancel
        </Link>
      </header>
      <p className="-mt-2 text-[13px] text-dim">
        This phone keeps the score. Everyone else can watch on theirs.
      </p>

      <div className="flex flex-col gap-2">
        <label htmlFor="live-venue" className="label-caps">
          Venue (optional)
        </label>
        <input
          id="live-venue"
          type="text"
          list="venue-names-live"
          placeholder="Hollywood Bowl…"
          value={venue}
          onChange={(event) => setVenue(event.target.value)}
          className="rounded-control border border-line bg-well px-3 py-2.5 text-[14px] text-text placeholder:text-faint"
        />
        <datalist id="venue-names-live">
          {(venues.data ?? []).map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>

      <GroupPicker profileId={profile.id} value={groupId} onChange={setGroupId} id="live-group" />

      <div className="flex flex-col gap-2">
        <span className="label-caps">Bowling order</span>
        <ol className="flex flex-col gap-2">
          {players.map((player, index) => (
            <li
              key={player.key}
              className="flex items-center gap-2 rounded-card border border-line bg-panel px-3 py-2.5"
            >
              <span className="score-text w-5 text-[13px] text-faint">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-[14px] text-text">
                {player.display_name}
                {player.profile_id === profile.id && <span className="text-faint"> · you</span>}
                {!player.profile_id && <span className="text-faint"> · guest</span>}
              </span>
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`Move ${player.display_name} up`}
                className="grid size-8 place-items-center rounded-chip border border-line bg-well text-dim disabled:text-disabled"
              >
                <Icon name="arrow-up" className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === players.length - 1}
                aria-label={`Move ${player.display_name} down`}
                className="grid size-8 place-items-center rounded-chip border border-line bg-well text-dim disabled:text-disabled"
              >
                <Icon name="arrow-down" className="size-4" />
              </button>
              {player.profile_id !== profile.id && (
                <button
                  type="button"
                  onClick={() => setPlayers((list) => list.filter((p) => p.key !== player.key))}
                  aria-label={`Remove ${player.display_name}`}
                  className="grid size-8 place-items-center rounded-chip border border-line bg-well text-dim"
                >
                  <Icon name="x" className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ol>
      </div>

      {candidates.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="label-caps">Add a player</span>
          <div className="flex flex-wrap gap-1.5">
            {candidates.map((candidate) => (
              <button
                key={candidate.key}
                type="button"
                onClick={() => setPlayers((list) => [...list, candidate])}
                className="rounded-full border border-line bg-panel px-3 py-1.5 text-[12.5px] text-dim"
              >
                + {candidate.display_name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="live-guest" className="label-caps">
          Add a guest
        </label>
        <div className="flex gap-2">
          <input
            id="live-guest"
            type="text"
            placeholder="Name on the monitor"
            value={guestName}
            onChange={(event) => setGuestName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addGuest();
              }
            }}
            className="min-w-0 flex-1 rounded-control border border-line bg-well px-3 py-2.5 text-[14px] text-text placeholder:text-faint"
          />
          <button
            type="button"
            onClick={addGuest}
            disabled={!guestName.trim()}
            className="rounded-control border border-line bg-panel px-4 text-[13.5px] text-dim disabled:text-disabled"
          >
            Add
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          setError('');
          start.mutate();
        }}
        disabled={start.isPending || players.length === 0}
        className="btn-primary"
      >
        {start.isPending ? 'Starting…' : 'Start scoring'}
      </button>
      {error && <p className="text-center text-[13.5px] text-signal">{error}</p>}
    </div>
  );
}
