import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import GroupPicker from '../../components/GroupPicker';
import Icon from '../../components/Icon';
import Strip from '../../components/Strip';
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
 * bowling order. You are always in the game and always seat one, because the
 * phone doing the scoring is at the lane.
 */
export default function LiveSetup({ profile }: { profile: Profile }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [groupId, setGroupId] = useState<string | null>(null);
  const [venue, setVenue] = useState('');
  const [guestName, setGuestName] = useState('');
  const [adding, setAdding] = useState(false);
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
    onError: () => setError('That didn’t start. Check your connection and try again.'),
  });

  return (
    <div className="flex flex-col pb-6">
      <header className="flex items-center justify-between px-5 pb-1 pt-2.5">
        <Link
          to="/"
          aria-label="Cancel"
          className="press -ml-2.5 flex size-11 shrink-0 items-center justify-center text-ink"
        >
          <Icon name="x" className="size-6" />
        </Link>
        <h1 className="num text-[18px] font-semibold">Score live</h1>
        <span className="size-11 shrink-0" aria-hidden />
      </header>

      <div className="flex flex-col gap-[18px] px-5 py-[18px]">
        <p className="text-[13px] text-ink-faded">This phone keeps the score. Everyone else can watch on theirs.</p>

        <div className="flex flex-col gap-1.5">
          <span className="label">Bowling order</span>
          <Strip as="ul">
            {players.map((player, index) => (
              <li key={player.key} className="flex items-center gap-1 py-1 pl-3.5 pr-1">
                <span className="num w-5 shrink-0 text-[15px] text-ink-faded">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[15px]">
                  {player.display_name}
                  {player.profile_id === profile.id && <span className="text-ink-faded"> you</span>}
                  {!player.profile_id && <span className="text-ink-faded"> guest</span>}
                </span>
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${player.display_name} up`}
                  className="press flex size-11 items-center justify-center text-ink disabled:text-disabled-fg"
                >
                  <Icon name="arrow-up" className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === players.length - 1}
                  aria-label={`Move ${player.display_name} down`}
                  className="press flex size-11 items-center justify-center text-ink disabled:text-disabled-fg"
                >
                  <Icon name="arrow-down" className="size-5" />
                </button>
                {player.profile_id !== profile.id ? (
                  <button
                    type="button"
                    onClick={() => setPlayers((list) => list.filter((p) => p.key !== player.key))}
                    aria-label={`Remove ${player.display_name}`}
                    className="press flex size-11 items-center justify-center text-ink"
                  >
                    <Icon name="x" className="size-5" />
                  </button>
                ) : (
                  <span className="size-11 shrink-0" aria-hidden />
                )}
              </li>
            ))}
            {adding && (
              <li className="flex flex-col gap-3 p-3.5">
                {candidates.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[13px] text-ink-faded">Friends and group members</span>
                    <div className="flex flex-wrap gap-2">
                      {candidates.map((candidate) => (
                        <button
                          key={candidate.key}
                          type="button"
                          onClick={() => setPlayers((list) => [...list, candidate])}
                          className="chip"
                        >
                          {candidate.display_name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="live-guest" className="label">
                    Guest <span className="optional">name on the monitor</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="live-guest"
                      type="text"
                      value={guestName}
                      onChange={(event) => setGuestName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          addGuest();
                        }
                      }}
                      className="field min-w-0 flex-1"
                    />
                    <button type="button" onClick={addGuest} disabled={!guestName.trim()} className="btn-secondary-sm">
                      Add
                    </button>
                  </div>
                </div>
              </li>
            )}
          </Strip>
          <button
            type="button"
            onClick={() => setAdding((open) => !open)}
            aria-expanded={adding}
            className="press self-start pt-0.5 text-[13px] font-semibold text-blue"
          >
            {adding ? 'Done adding' : 'Add a player'}
          </button>
        </div>

        <GroupPicker profileId={profile.id} value={groupId} onChange={setGroupId} id="live-group" />

        <div className="flex flex-col gap-1">
          <label htmlFor="live-venue" className="label">
            Venue <span className="optional">optional</span>
          </label>
          <input
            id="live-venue"
            type="text"
            list="venue-names-live"
            value={venue}
            onChange={(event) => setVenue(event.target.value)}
            className="field"
          />
          <datalist id="venue-names-live">
            {(venues.data ?? []).map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
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
          {start.isPending ? 'Starting' : 'Start scoring'}
        </button>
        {error && <p className="text-center text-[13px] text-red">{error}</p>}
      </div>
    </div>
  );
}
