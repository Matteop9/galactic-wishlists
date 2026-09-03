import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Wordmark from '../../components/Wordmark';
import Icon from '../../components/Icon';
import ChipRow from '../../components/ChipRow';
import Strip, { StripHeader } from '../../components/Strip';
import { FeedSkeleton, RefetchLine } from '../../components/Skeleton';
import { niceOnes } from '../../components/ReactionBar';
import PlayerLink from '../../components/PlayerLink';
import { fetchFeed, highlightLabel, type FeedEvent } from '../../lib/feed';
import { fetchLiveNow } from '../../lib/live';
import { fetchMyGroups } from '../../lib/groups';
import { fetchUnreadCount } from '../../lib/notifications';
import { useSkeleton } from '../../lib/useSkeleton';
import EmptyState from '../../components/EmptyState';
import { useScanQueue } from '../../lib/useScanQueue';
import type { Profile } from '../../lib/auth';
import { FEED_FILTER_KEY, normaliseFeedFilter, writeFeedFilter, type FeedFilter } from '../../lib/feedFilter';
import WhatsNewCard from '../../components/WhatsNewCard';
import { APP_VERSION, markSeen, readSeen, releasesSince } from '../../lib/changelog';

/** localStorage can throw in private mode / blocked storage, so never let that crash the feed. */
function localStorageOrNull(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** "Sat 30 Aug", the date register the whole app uses. */
function shortDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** A highlight that means the total is hot: a personal best or a threshold club. */
function isHotHighlight(code: string): boolean {
  return code === 'PB' || code.endsWith('_CLUB');
}

/** Home: the feed, your games plus your groups' and friends' games. */
export default function Home({ profile }: { profile: Profile }) {
  const myGroups = useQuery({
    queryKey: ['my-groups', profile.id],
    queryFn: () => fetchMyGroups(profile.id),
  });
  const groups = (myGroups.data ?? []).flatMap((m) => (m.groups ? [m.groups] : []));
  const groupIds = groups.map((g) => g.id);

  // The stored value has no group list to check against until `myGroups`
  // resolves. Normalising it against `[]` here would flip a real group
  // filter to "all" for one render and waste the first feed fetch. So this
  // holds the raw stored value; `effective` below is the one thing that gets
  // reconciled against the real group list, and only once it's known.
  const [filter, setFilter] = useState<FeedFilter>(() => {
    const storage = localStorageOrNull();
    if (!storage) return 'all';
    try {
      return (storage.getItem(FEED_FILTER_KEY) as FeedFilter | null) ?? 'all';
    } catch {
      return 'all';
    }
  });
  const effective: FeedFilter = myGroups.data ? normaliseFeedFilter(filter, groupIds) : filter;

  const setFeedFilter = (value: FeedFilter) => {
    setFilter(value);
    writeFeedFilter(localStorageOrNull(), value);
  };

  const feed = useQuery({
    queryKey: ['feed', effective],
    queryFn: () => fetchFeed(effective),
    placeholderData: keepPreviousData,
  });
  const showSkeleton = useSkeleton(feed.isPending);
  const unread = useQuery({
    queryKey: ['unread-count', profile.id],
    queryFn: () => fetchUnreadCount(profile.id),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const unreadCount = unread.data ?? 0;

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      <header className="flex items-center justify-between">
        <Wordmark size="sm" />
        <Link
          to="/notifications"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          className="press relative -mr-2.5 flex size-11 items-center justify-center text-ink"
        >
          <Icon name="bell" className="size-6" />
          {unreadCount > 0 && (
            <span aria-hidden className="absolute right-2 top-2 size-2 rounded-full bg-red" />
          )}
        </Link>
      </header>

      <ScanQueueBanner />

      <LiveNow profile={profile} />

      <WhatsNewBanner />

      {groupIds.length > 0 && (
        <ChipRow
          label="Show games from"
          fill={false}
          value={effective}
          onChange={setFeedFilter}
          options={[
            { value: 'all', label: 'All' },
            ...groups.map((g) => ({ value: g.id, label: g.name })),
          ]}
        />
      )}

      <RefetchLine active={feed.isFetching && !feed.isPending} />

      {showSkeleton && <FeedSkeleton />}

      {!showSkeleton && feed.data && feed.data.length === 0 && effective === 'all' && (
        <EmptyState
          title="No games this season"
          body="Games from your groups show up on this feed."
          action={{ label: 'Scan a scoreboard', to: '/add/scan' }}
          secondary={{ label: 'Type the totals', to: '/add/quick' }}
        />
      )}

      {!showSkeleton && feed.data && feed.data.length === 0 && effective !== 'all' && (
        <EmptyState
          tone="inline"
          title={`No games in ${groups.find((g) => g.id === effective)?.name ?? 'this group'} yet`}
          body="Add a game in this group and it shows up here."
          action={{ label: 'Quick add a game', to: '/add/quick' }}
          secondary={{ label: 'Show everything', onPress: () => setFeedFilter('all') }}
        />
      )}

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-[18px]">
        {(feed.data ?? []).map((event, i) =>
          event.games ? (
            <div
              key={event.id}
              className="rise-in"
              style={{ animationDelay: `${Math.min(i, 5) * 40}ms` }}
            >
              <GameCard event={event} profile={profile} />
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}

/**
 * The release note, on the feed, once per release. Sits below the two
 * banners that are actual jobs (a queued scan and a live game are things to
 * do; this is something to read) and above the filter, so it never pushes
 * the games themselves off the first screen for more than a card.
 *
 * State is local rather than a store: nothing else in the app cares whether
 * you have read the notes, and reading localStorage once on mount is cheaper
 * than a subscription.
 */
function WhatsNewBanner() {
  const [seen, setSeen] = useState<string | null>(() => readSeen(localStorageOrNull()));
  const unseen = releasesSince(seen);
  const latest = unseen[0];
  if (!latest) return null;

  return (
    <WhatsNewCard
      release={latest}
      older={unseen.length - 1}
      onDismiss={() => {
        markSeen(localStorageOrNull());
        setSeen(APP_VERSION);
      }}
    />
  );
}

/**
 * A plain strip row that goes somewhere: title, a faded line under it, and
 * the action word on the right in link blue. The two banners share it.
 */
function BannerRow({
  to,
  title,
  sub,
  action,
}: {
  to: string;
  title: string;
  sub?: string;
  action: string;
}) {
  return (
    <Link to={to} className="press flex items-center justify-between gap-3 px-3.5 py-3">
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-semibold">{title}</span>
        {sub && <span className="block truncate text-[13px] text-ink-faded">{sub}</span>}
      </span>
      <span className="shrink-0 text-[13px] font-semibold text-blue">{action}</span>
    </Link>
  );
}

/**
 * Bowling right now. The scorer gets a resume link (the LaneTalk failure mode
 * we are fixing), everyone else gets a way in to watch.
 */
function LiveNow({ profile }: { profile: Profile }) {
  const live = useQuery({
    queryKey: ['live-now'],
    queryFn: fetchLiveNow,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const sessions = live.data ?? [];
  if (sessions.length === 0) return null;

  return (
    <Strip>
      {sessions.map((session) => {
        const mine = session.created_by === profile.id;
        return (
          <BannerRow
            key={session.id}
            to={mine ? `/live/${session.id}` : `/live/${session.id}/watch`}
            title={mine ? 'Your game is still going' : `${session.profiles?.display_name ?? 'Someone'} is bowling live`}
            sub={[session.venues?.name, session.groups?.name].filter(Boolean).join(' · ') || 'Live scoring'}
            action={mine ? 'Resume' : 'Watch'}
          />
        );
      })}
    </Strip>
  );
}

/**
 * Scans taken while offline, surfaced where you will see them. A ready scan
 * is a job waiting for you; one still queued is just weather.
 */
function ScanQueueBanner() {
  const { summary, firstReady } = useScanQueue();
  if (!summary.line) return null;

  if (firstReady) {
    return (
      <Strip>
        <BannerRow
          to={`/add/scan?queued=${firstReady.id}`}
          title={summary.line}
          sub="Scanned while you were offline"
          action="Review"
        />
      </Strip>
    );
  }

  return (
    <Strip soft>
      <BannerRow to="/profile" title={summary.line} action="See the queue" />
    </Strip>
  );
}

/**
 * One feed post: a scoresheet strip per player (the feed query carries no
 * frames, so every post is the header row only) and a footer line of what
 * happened around it. The whole post opens the game.
 */
function GameCard({ event, profile }: { event: FeedEvent; profile: Profile }) {
  const navigate = useNavigate();
  const game = event.games!;
  const players = [...game.game_players].sort((a, b) => a.seat_order - b.seat_order);
  const playedAt = new Date(game.played_at);
  const highlights = Array.isArray(event.highlights) ? (event.highlights as string[]) : [];
  const commentCount = event.comments?.[0]?.count ?? 0;
  const reactionCount = event.reactions?.length ?? 0;

  const nameOf = (p: (typeof players)[number]) =>
    p.profile_id === profile.id ? 'You' : (p.profiles?.display_name ?? p.guest_name ?? '?');

  const date = shortDate(playedAt);
  const venue = game.sessions?.venues?.name;
  const meta =
    game.entry_type === 'total'
      ? `Quick add, totals only · ${date}`
      : venue
        ? `${venue} · ${date}`
        : date;

  // The event stores the union of everyone's highlights, so the hot total goes
  // to the top scorer only.
  const hot = highlights.some(isHotHighlight);
  const topScore = players.reduce<number | null>(
    (best, p) => (p.final_score !== null && (best === null || p.final_score > best) ? p.final_score : best),
    null,
  );

  const nice = niceOnes(reactionCount);
  const commentsLabel =
    commentCount === 0 ? 'Comment' : commentCount === 1 ? '1 comment' : `${commentCount} comments`;

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => navigate(`/games/${game.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(`/games/${game.id}`);
      }}
      className="press flex cursor-pointer flex-col gap-2"
    >
      <div className="flex flex-col gap-2">
        {players.map((p, i) => (
          <Strip key={i}>
            <StripHeader
              title={
                <PlayerLink profileId={p.profile_id} myId={profile.id}>
                  {nameOf(p)}
                </PlayerLink>
              }
              meta={meta}
              right={p.final_score ?? '–'}
              tone={hot && p.final_score !== null && p.final_score === topScore ? 'hot' : p.final_score === null ? 'faded' : null}
            />
          </Strip>
        ))}
      </div>

      <div className="flex flex-wrap gap-3.5 px-0.5 text-[13px] text-ink-faded">
        {highlights.map((code) => (
          <span key={code} className="font-semibold text-red">
            {highlightLabel(code)}
          </span>
        ))}
        {nice && <span>{nice}</span>}
        <span aria-label={commentCount > 0 ? `${commentCount} comments` : undefined}>{commentsLabel}</span>
      </div>
    </div>
  );
}
