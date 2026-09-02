import { Link, Navigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Avatar from '../../components/Avatar';
import EmptyState from '../../components/EmptyState';
import { Bar, Circle, Panel, PlayerSkeleton } from '../../components/Skeleton';
import { useSkeleton } from '../../lib/useSkeleton';
import { useAuth, type Profile } from '../../lib/auth';
import { acceptFriendRequest, fetchFriendships, sendFriendRequest } from '../../lib/friends';
import { fetchRecentScores, fetchStats } from '../../lib/games';
import {
  fetchHeadToHead,
  fetchProfileLite,
  fetchSharedGroups,
  friendState,
  meetingOutcome,
  recentForm,
  recordLine,
  type HeadToHead,
} from '../../lib/players';
import { FormGraph, formArrow, Tile } from '../stats/StatBits';

/** First word of a display name — used wherever the panel needs "Dave" rather than "Dave K". */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export default function PlayerPage({ profile }: { profile: Profile }) {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const isOwnProfile = !!id && id === profile.id;

  const player = useQuery({
    queryKey: ['player', id],
    queryFn: () => fetchProfileLite(id!),
    enabled: !!id && !isOwnProfile,
  });
  const h2h = useQuery({
    queryKey: ['h2h', profile.id, id],
    queryFn: () => fetchHeadToHead(id!),
    enabled: !!id && !isOwnProfile,
  });
  const stats = useQuery({
    queryKey: ['stats', id],
    queryFn: () => fetchStats(id!),
    enabled: !!id && !isOwnProfile,
  });
  const recent = useQuery({
    queryKey: ['recent-scores', id],
    queryFn: () => fetchRecentScores(id!),
    enabled: !!id && !isOwnProfile,
  });
  const groups = useQuery({
    queryKey: ['player-groups', id],
    queryFn: () => fetchSharedGroups(id!),
    enabled: !!id && !isOwnProfile,
  });
  const friendships = useQuery({
    queryKey: ['friendships', profile.id],
    queryFn: () => fetchFriendships(profile.id),
  });

  const sendRequest = useMutation({
    mutationFn: () => sendFriendRequest(profile.id, id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friendships', profile.id] }),
  });
  const accept = useMutation({
    mutationFn: () => acceptFriendRequest(id!, profile.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friendships', profile.id] }),
  });

  const showSkeleton = useSkeleton(player.isPending);
  const showH2H = useSkeleton(h2h.isPending);
  const showStats = useSkeleton(stats.isPending);

  if (isOwnProfile) return <Navigate to="/profile" replace />;

  if (showSkeleton) {
    return (
      <div className="flex flex-col gap-5 px-4 py-6">
        <PlayerSkeleton />
      </div>
    );
  }

  // Pending but past the skeleton window (a fast cache hit): render nothing
  // rather than the not-found state, which would flash before the real data.
  if (player.isPending) return <div className="px-4 py-6" />;

  if (player.data == null) {
    return (
      <div className="px-4 py-6">
        <EmptyState
          tone="page"
          title="Can’t find that player"
          body="They may not be in any of your groups yet."
          action={{ label: 'Back to home', to: '/' }}
        />
      </div>
    );
  }

  const them = player.data;
  const state = friendState(friendships.data ?? [], profile.id, them.id);
  const sharedGroupNames = (groups.data ?? [])
    .map((g) => g.groups?.name)
    .filter((n): n is string => !!n);

  let contextLine: string;
  if (state === 'friend') {
    contextLine = sharedGroupNames.length > 0 ? `Friend · ${sharedGroupNames.join(', ')}` : 'Friend';
  } else if (sharedGroupNames.length > 0) {
    contextLine = `Group mate · ${sharedGroupNames.join(', ')}`;
  } else {
    contextLine = 'No shared groups';
  }

  const s = stats.data;
  const scores = recent.data ?? [];
  const form = formArrow(scores.map((r) => r.score));

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={them.display_name} url={them.avatar_url} size={56} />
          <div className="min-w-0">
            <h1 className="truncate font-display text-[20px] font-bold">{them.display_name}</h1>
            <p className="text-[13px] text-faint">@{them.username}</p>
            <p className="mt-0.5 text-[12px] text-dim">{contextLine}</p>
          </div>
        </div>
        {!session?.user.is_anonymous && (
          <div className="shrink-0">
            {state === 'none' && (
              <button
                type="button"
                onClick={() => sendRequest.mutate()}
                disabled={sendRequest.isPending}
                className="rounded-control bg-phosphor px-3 py-1.5 font-display text-[12.5px] font-bold text-ink disabled:bg-disabled disabled:text-faint"
              >
                Add friend
              </button>
            )}
            {state === 'outgoing' && <span className="text-[12.5px] text-faint">Request sent</span>}
            {state === 'incoming' && (
              <button
                type="button"
                onClick={() => accept.mutate()}
                disabled={accept.isPending}
                className="rounded-control border border-line bg-panel px-3 py-1.5 text-[12.5px] font-bold text-text disabled:border-hairline disabled:text-disabled"
              >
                Accept
              </button>
            )}
          </div>
        )}
      </header>

      <section className="flex flex-col gap-2">
        <span className="label-caps">Head-to-head</span>
        {showH2H ? (
          <H2HSkeletonBlock />
        ) : (
          <HeadToHeadPanel
            h2h={h2h.data ?? { games: 0, wins: 0, losses: 0, ties: 0, my_avg: null, their_avg: null, meetings: [] }}
            myName={profile.display_name}
            theirName={them.display_name}
            myUrl={profile.avatar_url}
            theirUrl={them.avatar_url}
          />
        )}
      </section>

      <section className="flex flex-col gap-2">
        <span className="label-caps">Their stats</span>
        {showStats ? (
          <TilesSkeletonBlock />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Tile label="Average" value={s?.average != null ? String(s.average) : '—'} />
            <Tile label="High game" value={s?.high_game != null ? String(s.high_game) : '—'} />
            <Tile label="Games" value={String(s?.games ?? 0)} />
            <Tile label="Form" value={form.symbol} tone={form.tone} />
          </div>
        )}
        {!showStats && scores.length >= 2 && (
          <div className="rounded-card border border-line bg-panel p-4">
            <span className="label-caps">Last {scores.length} games</span>
            <FormGraph scores={scores.map((r) => r.score)} />
          </div>
        )}
        <p className="text-[11px] text-faint">Based on the games you can see.</p>
      </section>
    </div>
  );
}

/**
 * The head-to-head record + meetings panel — pulled out so the gallery can
 * render the exact same component from a static fixture.
 */
export function HeadToHeadPanel({
  h2h,
  myName,
  theirName,
  myUrl,
  theirUrl,
}: {
  h2h: HeadToHead;
  myName: string;
  theirName: string;
  myUrl?: string | null;
  theirUrl?: string | null;
}) {
  const theirFirst = firstName(theirName);

  if (h2h.games === 0) {
    return (
      <div className="rounded-card border border-line bg-panel p-4">
        <EmptyState
          tone="inline"
          body="No games together yet — add them to your next game and this fills in."
        />
      </div>
    );
  }

  const form = recentForm(h2h.meetings, theirFirst);

  return (
    <div className="rounded-card border border-line bg-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col items-center gap-1.5">
          <Avatar name={myName} url={myUrl} size={40} />
          <span className="text-[11px] text-faint">You</span>
        </div>
        {/* Wins–losses only in the big slot; a "· 1 tie" suffix wraps at 375px and dwarfs the avatars. */}
        <div className="flex flex-col items-center">
          <p className="score-text text-[30px] font-bold leading-none text-text">
            {recordLine({ wins: h2h.wins, losses: h2h.losses, ties: 0 })}
          </p>
          {h2h.ties > 0 && (
            <p className="mt-1 text-[11px] text-faint">
              {h2h.ties} {h2h.ties === 1 ? 'tie' : 'ties'}
            </p>
          )}
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <Avatar name={theirName} url={theirUrl} size={40} />
          <span className="text-[11px] text-faint">{theirFirst}</span>
        </div>
      </div>

      {form && <p className="mt-3 text-center text-[12.5px] text-dim">{form}</p>}

      {h2h.my_avg != null && h2h.their_avg != null && (
        <p className="mt-1 text-center text-[12px] text-dim">
          Averages · you {h2h.my_avg.toFixed(1)} · {theirFirst} {h2h.their_avg.toFixed(1)} across {h2h.games}{' '}
          {h2h.games === 1 ? 'game' : 'games'}
        </p>
      )}

      {h2h.meetings.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {h2h.meetings.map((m) => {
            const outcome = meetingOutcome(m.my_score, m.their_score);
            return (
              <Link
                key={m.game_id}
                to={`/games/${m.game_id}`}
                className="press flex flex-col gap-0.5 rounded-card border border-line bg-panel px-3 py-2.5"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 truncate text-[13px] text-text">
                    {new Date(m.played_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    {' · '}
                    <span className="text-faint">{m.venue_name ?? 'Unknown lane'}</span>
                  </p>
                  <span className="score-text shrink-0 text-[15px] font-bold text-text">
                    {m.my_score} – {m.their_score}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[11px] text-dim">
                    {outcome === 'won' ? 'You won' : outcome === 'lost' ? `${theirFirst} won` : 'Tied'}
                  </p>
                  {/* Compact status word, not the full badge: ten rows of glowing stamps
                      would blow the amber budget, and the full badge crowded out the venue. */}
                  <span
                    className={`font-display text-[10px] font-bold tracking-[.1em] ${
                      m.verification_status === 'verified'
                        ? 'text-phosphor'
                        : m.verification_status === 'live'
                          ? 'text-dim'
                          : 'text-faint'
                    }`}
                  >
                    {m.verification_status === 'verified'
                      ? 'VERIFIED'
                      : m.verification_status === 'live'
                        ? 'LIVE-SCORED'
                        : 'UNVERIFIED'}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Bare skeleton for the head-to-head section — two avatars, a wide record bar, three meeting rows. */
function H2HSkeletonBlock() {
  return (
    <Panel className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Circle size={40} />
        <Bar w={80} h={22} />
        <Circle size={40} />
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Bar key={i} h={40} className="rounded-card" />
        ))}
      </div>
    </Panel>
  );
}

/** Bare skeleton for the stats tile grid, matching `StatsSkeleton`'s tiles. */
function TilesSkeletonBlock() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Panel key={i} className="flex flex-col gap-2">
          <Bar w={62} h={10} />
          <Bar w={72} h={26} />
        </Panel>
      ))}
    </div>
  );
}
