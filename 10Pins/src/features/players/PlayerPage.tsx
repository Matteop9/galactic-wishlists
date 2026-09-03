import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Avatar from '../../components/Avatar';
import CountUp from '../../components/CountUp';
import EmptyState from '../../components/EmptyState';
import Icon from '../../components/Icon';
import { Bar, Panel, PlayerSkeleton } from '../../components/Skeleton';
import Strip, { StatCell, StatTile, StripTitle } from '../../components/Strip';
import { VERIFICATION_LABEL } from '../../components/VerificationBadge';
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
  type HeadToHead,
  type Meeting,
} from '../../lib/players';
import { FormGraph, formArrow } from '../stats/StatBits';

const DASHES = '––';

/** First word of a display name, used wherever the strip needs "Dave" rather than "Dave K". */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** The RPC types `verification_status` as a loose string; only the known three get a label. */
function verificationLabel(status: string): string | null {
  return status in VERIFICATION_LABEL ? VERIFICATION_LABEL[status as keyof typeof VERIFICATION_LABEL] : null;
}

export default function PlayerPage({ profile }: { profile: Profile }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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

  const s = stats.data;
  const scores = recent.data ?? [];
  const form = formArrow(scores.map((r) => r.score));

  // The line under the name: shared groups when there are any, else their
  // average and games, else just the handle.
  const subParts: React.ReactNode[] = [];
  if (sharedGroupNames.length > 0) subParts.push(sharedGroupNames.join(', '));
  if (s?.average != null) {
    subParts.push(
      <>
        average <span className="num">{s.average}</span>
      </>,
    );
  }
  if (sharedGroupNames.length === 0 && s?.games) {
    subParts.push(
      <>
        <span className="num">{s.games}</span> {s.games === 1 ? 'game' : 'games'}
      </>,
    );
  }
  if (subParts.length === 0) subParts.push(`@${them.username}`);

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <header className="flex items-center gap-3 px-1">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="press -ml-1.5 flex size-9 shrink-0 items-center justify-center text-ink"
        >
          <Icon name="chevron-left" className="size-[22px]" />
        </button>
        <Avatar name={them.display_name} url={them.avatar_url} size={44} />
        <div className="min-w-0 flex-1">
          <h1 className="num truncate text-[22px] font-semibold leading-tight">{them.display_name}</h1>
          <p className="truncate text-[13px] text-ink-faded">
            {subParts.map((part, i) => (
              <span key={i}>
                {i > 0 && ' · '}
                {part}
              </span>
            ))}
          </p>
        </div>
        {!session?.user.is_anonymous && (
          <div className="flex shrink-0 items-center">
            {state === 'none' && (
              <button
                type="button"
                onClick={() => sendRequest.mutate()}
                disabled={sendRequest.isPending}
                className="btn-secondary-sm"
              >
                Add friend
              </button>
            )}
            {state === 'outgoing' && <span className="text-[13px] text-ink-faded">Request sent</span>}
            {state === 'friend' && <span className="text-[13px] text-ink-faded">Friends</span>}
            {state === 'incoming' && (
              <button
                type="button"
                onClick={() => accept.mutate()}
                disabled={accept.isPending}
                className="btn-secondary-sm"
              >
                Accept
              </button>
            )}
          </div>
        )}
      </header>

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

      <section className="flex flex-col gap-2">
        <span className="label px-1">Their stats</span>
        {showStats ? (
          <TilesSkeletonBlock />
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            <StatTile
              size="sm"
              tone="steady"
              value={s?.average != null ? <CountUp value={s.average} /> : DASHES}
              label="Average"
            />
            <StatTile
              size="sm"
              tone="hot"
              value={s?.high_game != null ? <CountUp value={s.high_game} /> : DASHES}
              label="High game"
            />
            <StatTile size="sm" value={<CountUp value={s?.games ?? 0} />} label="Games played" />
          </div>
        )}
        {!showStats && scores.length >= 2 && (
          <Strip>
            <StripTitle
              right={
                <>
                  Last <span className="num">{scores.length}</span> games
                  {form.symbol ? ` · ${form.symbol.toLowerCase()}` : ''}
                </>
              }
            >
              Average over time
            </StripTitle>
            <div className="px-3.5 pb-3 pt-3">
              <FormGraph scores={scores.map((r) => r.score)} />
            </div>
          </Strip>
        )}
        <p className="px-1 text-[13px] text-ink-faded">Based on the games you can see.</p>
      </section>
    </div>
  );
}

/**
 * The head-to-head record + meetings strip, pulled out so the gallery can
 * render the exact same component from a static fixture. `myName`, `myUrl`
 * and `theirUrl` stay in the props for that fixture; the strip itself says
 * "You" and draws no avatars.
 */
export function HeadToHeadPanel({
  h2h,
  theirName,
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
      <EmptyState
        tone="inline"
        title="Head to head"
        body="No games together yet. Add them to your next game and this fills in."
      />
    );
  }

  const form = recentForm(h2h.meetings, theirFirst);
  const iLead = h2h.wins > h2h.losses;
  const theyLead = h2h.losses > h2h.wins;

  // High games in the games you've bowled together, from the meetings already loaded.
  const myScores = h2h.meetings.map((m) => m.my_score).filter((n): n is number => n != null);
  const theirScores = h2h.meetings.map((m) => m.their_score).filter((n): n is number => n != null);
  const highs =
    myScores.length > 0 && theirScores.length > 0
      ? { mine: Math.max(...myScores), theirs: Math.max(...theirScores) }
      : null;
  const cellCount = (h2h.my_avg != null && h2h.their_avg != null ? 1 : 0) + (highs ? 1 : 0);

  return (
    <div className="flex flex-col gap-4">
      <Strip>
        <StripTitle
          right={
            <>
              <span className="num">{h2h.games}</span> {h2h.games === 1 ? 'game' : 'games'}
            </>
          }
        >
          Head to head
        </StripTitle>
        <div className="flex flex-col gap-3 p-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center">
            <div className="flex flex-col items-center gap-0.5">
              <span className={`num text-[44px] font-semibold leading-none ${iLead ? 'text-red' : ''}`}>{h2h.wins}</span>
              <span className="text-[13px] text-ink-faded">You</span>
            </div>
            <div className="flex flex-col items-center px-4 text-[13px] text-ink-faded">
              <span>wins</span>
              {h2h.ties > 0 && (
                <span>
                  <span className="num">{h2h.ties}</span> {h2h.ties === 1 ? 'tie' : 'ties'}
                </span>
              )}
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className={`num text-[44px] font-semibold leading-none ${theyLead ? 'text-red' : ''}`}>
                {h2h.losses}
              </span>
              <span className="truncate text-[13px] text-ink-faded">{theirFirst}</span>
            </div>
          </div>
          {form && <p className="text-center text-[13px] text-ink-faded">{form}</p>}
        </div>
        {cellCount > 0 && (
          <div className={`grid divide-x divide-hairline ${cellCount === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {h2h.my_avg != null && h2h.their_avg != null && (
              <StatCell
                value={
                  <>
                    {h2h.my_avg.toFixed(1)} · {h2h.their_avg.toFixed(1)}
                  </>
                }
                label="Averages, you first"
              />
            )}
            {highs && (
              <StatCell
                value={
                  <>
                    {highs.mine} · {highs.theirs}
                  </>
                }
                label="High games"
              />
            )}
          </div>
        )}
      </Strip>

      {h2h.meetings.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="label px-1">Recent meetings</span>
          {h2h.meetings.map((m) => (
            <MeetingStrip key={m.game_id} meeting={m} theirFirst={theirFirst} />
          ))}
        </div>
      )}
    </div>
  );
}

/** One meeting: a header line (date, lane, who won) and a row each for you and them. */
function MeetingStrip({ meeting: m, theirFirst }: { meeting: Meeting; theirFirst: string }) {
  const outcome = meetingOutcome(m.my_score, m.their_score);
  const verification = verificationLabel(m.verification_status);
  return (
    <Link to={`/games/${m.game_id}`} className="press block">
      <Strip>
        <div className="flex justify-between gap-3 px-3.5 py-[9px] text-[12px] text-ink-faded">
          <span className="min-w-0 truncate">
            <span className="num">{shortDate(m.played_at)}</span> · {m.venue_name ?? 'Unknown lane'}
            {verification ? ` · ${verification}` : ''}
          </span>
          <span className={`shrink-0 ${outcome === 'won' ? 'font-semibold text-red' : ''}`}>
            {outcome === 'won' ? 'You won' : outcome === 'lost' ? `${theirFirst} won` : 'Tied'}
          </span>
        </div>
        <MeetingRow name="You" score={m.my_score} winner={outcome === 'won'} hot={outcome === 'won'} />
        <MeetingRow name={theirFirst} score={m.their_score} winner={outcome === 'lost'} hot={false} />
      </Strip>
    </Link>
  );
}

/** The winner's name and score go semibold; only your own win is hot (red), as on the design canvas. */
function MeetingRow({ name, score, winner, hot }: { name: string; score: number | null; winner: boolean; hot: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-3.5 py-2.5 text-[14px]">
      <span className={`min-w-0 truncate ${winner ? 'font-semibold' : ''}`}>{name}</span>
      <span className={`num shrink-0 text-[18px] ${winner ? 'font-semibold' : 'font-medium'} ${hot ? 'text-red' : ''}`}>
        {score ?? '–'}
      </span>
    </div>
  );
}

/** Bare skeleton for the head-to-head strip: title, two tall numerals, a two-cell stat row. */
function H2HSkeletonBlock() {
  return (
    <div className="strip">
      <div className="px-3.5 py-2.5">
        <Bar w={110} h={12} />
      </div>
      <div className="flex items-center justify-around border-t border-hairline px-3.5 py-4">
        <Bar w={36} h={44} />
        <Bar w={30} h={11} />
        <Bar w={36} h={44} />
      </div>
      <div className="grid grid-cols-2 border-t border-hairline">
        <div className="flex flex-col gap-1.5 border-r border-hairline px-3.5 py-2.5">
          <Bar w={72} h={18} />
          <Bar w={90} h={10} />
        </div>
        <div className="flex flex-col gap-1.5 px-3.5 py-2.5">
          <Bar w={72} h={18} />
          <Bar w={70} h={10} />
        </div>
      </div>
    </div>
  );
}

/** Bare skeleton for the three stat tiles. */
function TilesSkeletonBlock() {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {Array.from({ length: 3 }).map((_, i) => (
        <Panel key={i} className="flex flex-col gap-1.5 px-3 pb-2.5 pt-3">
          <Bar w={44} h={20} />
          <Bar w={60} h={10} />
        </Panel>
      ))}
    </div>
  );
}
