import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Wordmark from '../../components/Wordmark';
import Icon from '../../components/Icon';
import ChipRow from '../../components/ChipRow';
import { FeedSkeleton, RefetchLine } from '../../components/Skeleton';
import VerificationBadge from '../../components/VerificationBadge';
import ReactionBar from '../../components/ReactionBar';
import Avatar from '../../components/Avatar';
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

/** localStorage can throw in private mode / blocked storage — never let that crash the feed. */
function localStorageOrNull(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Home: the feed — your games plus your groups' and friends' games. */
export default function Home({ profile }: { profile: Profile }) {
  const myGroups = useQuery({
    queryKey: ['my-groups', profile.id],
    queryFn: () => fetchMyGroups(profile.id),
  });
  const groups = (myGroups.data ?? []).flatMap((m) => (m.groups ? [m.groups] : []));
  const groupIds = groups.map((g) => g.id);

  // The stored value has no group list to check against until `myGroups`
  // resolves — normalising it against `[]` here would flip a real group
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

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <Wordmark size="sm" />
        <div className="flex items-center gap-2">
          <Link
            to="/notifications"
            aria-label={`Notifications${unread.data ? ` — ${unread.data} unread` : ''}`}
            className="relative flex size-9 items-center justify-center rounded-full border border-line bg-panel text-dim"
          >
            <Icon name="bell" className="size-4" />
            {(unread.data ?? 0) > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-phosphor px-1 font-display text-[10px] font-bold text-ink">
                {unread.data! > 9 ? '9+' : unread.data}
              </span>
            )}
          </Link>
          <Link to="/profile" aria-label="Your profile">
            <Avatar name={profile.display_name} url={profile.avatar_url} size={36} />
          </Link>
        </div>
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
          title="Nothing here yet"
          body="Scan the scoreboard from your last game and it lands here — or start with the totals, which takes ten seconds."
          action={{ label: 'Scan your first game', to: '/add/scan' }}
          secondary={{ label: 'Quick add the totals', to: '/add/quick' }}
        />
      )}

      {!showSkeleton && feed.data && feed.data.length === 0 && effective !== 'all' && (
        <EmptyState
          tone="inline"
          title={`No games in ${groups.find((g) => g.id === effective)?.name ?? 'this group'} yet`}
          body="Add a game in this group and it’ll land here."
          action={{ label: 'Quick add a game', to: '/add/quick' }}
          secondary={{ label: 'Show everything', onPress: () => setFeedFilter('all') }}
        />
      )}

      <div className="flex flex-col gap-3">
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
 * The release note, on the feed, once per release (D1, 3 Sept). Sits below the
 * two banners that are actual jobs — a queued scan and a live game are things
 * to do; this is something to read — and above the filter, so it never pushes
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
 * Bowling right now — the scorer gets a resume link (the LaneTalk failure mode
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
    <div className="flex flex-col gap-2">
      {sessions.map((session) => {
        const mine = session.created_by === profile.id;
        return (
          <Link
            key={session.id}
            to={mine ? `/live/${session.id}` : `/live/${session.id}/watch`}
            className="press flex items-center justify-between gap-3 rounded-card border border-line bg-panel px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="size-2 shrink-0 live-dot rounded-full bg-signal" aria-hidden />
              <div className="min-w-0">
                <p className="truncate font-display text-[14px] font-bold text-text">
                  {mine ? 'Your game is still going' : `${session.profiles?.display_name ?? 'Someone'} is bowling live`}
                </p>
                <p className="truncate text-[11.5px] text-faint">
                  {[session.venues?.name, session.groups?.name].filter(Boolean).join(' · ') || 'Live scoring'}
                </p>
              </div>
            </div>
            <span className="shrink-0 font-display text-[12.5px] font-bold text-phosphor">
              {mine ? 'Resume' : 'Watch'}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/**
 * Scans taken without signal, surfaced where you’ll see them (design §Offline:
 * "banner + queue list in Profile"). A ready scan is a job waiting for you;
 * one still queued is just weather.
 */
function ScanQueueBanner() {
  const { summary, firstReady } = useScanQueue();
  if (!summary.line) return null;

  if (firstReady) {
    return (
      <Link
        to={`/add/scan?queued=${firstReady.id}`}
        className="press flex items-center justify-between rounded-card border border-line bg-panel px-4 py-3"
      >
        <div className="min-w-0">
          <p className="truncate font-display text-[14px] font-bold text-text">{summary.line}</p>
          <p className="truncate text-[11.5px] text-faint">Scanned while you were offline</p>
        </div>
        <span className="shrink-0 font-display text-[12.5px] font-bold text-phosphor">Review</span>
      </Link>
    );
  }

  return (
    <Link
      to="/profile"
      className="press flex items-center justify-between rounded-card border border-line bg-panel px-4 py-3"
    >
      <p className="truncate text-[13px] text-dim">{summary.line}</p>
      <span className="shrink-0 text-[12.5px] font-bold text-dim">See the queue</span>
    </Link>
  );
}

function GameCard({ event, profile }: { event: FeedEvent; profile: Profile }) {
  const navigate = useNavigate();
  const game = event.games!;
  const players = [...game.game_players].sort((a, b) => a.seat_order - b.seat_order);
  const playedAt = new Date(game.played_at);
  const highlights = Array.isArray(event.highlights) ? (event.highlights as string[]) : [];
  const commentCount = event.comments?.[0]?.count ?? 0;

  const nameOf = (p: (typeof players)[number]) =>
    p.profile_id === profile.id ? 'You' : (p.profiles?.display_name ?? p.guest_name ?? '?');

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => navigate(`/games/${game.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(`/games/${game.id}`);
      }}
      className="press flex cursor-pointer flex-col gap-3 rounded-card border border-line bg-panel p-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-faint">
          {playedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          {game.sessions?.venues?.name ? ` · ${game.sessions.venues.name}` : ''}
          {event.groups?.name ? ` · ${event.groups.name}` : ''}
        </span>
        <VerificationBadge status={game.verification_status as 'verified' | 'live' | 'unverified'} />
      </div>

      <div className="flex flex-col gap-1">
        {players.map((p, i) => (
          <div key={i} className="flex items-baseline justify-between">
            <PlayerLink
              profileId={p.profile_id}
              myId={profile.id}
              className={`text-[15px] ${p.profile_id === profile.id ? 'font-display font-bold text-text' : 'text-dim'} ${
                p.profile_id ? 'underline-offset-2 hover:text-text hover:underline' : ''
              }`}
            >
              {nameOf(p)}
            </PlayerLink>
            <span
              className={`score-text text-[18px] font-bold ${
                p.profile_id === profile.id ? 'text-phosphor' : 'text-text'
              }`}
            >
              {p.final_score ?? '—'}
            </span>
          </div>
        ))}
      </div>

      {highlights.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {highlights.map((code) => (
            <span
              key={code}
              className="rounded-full border border-phosphor/40 bg-phosphor/10 px-2 py-0.5 font-display text-[11px] font-bold text-phosphor"
            >
              {highlightLabel(code)}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <ReactionBar feedEventId={event.id} profileId={profile.id} reactions={event.reactions ?? []} />
        {commentCount > 0 ? (
          <span className="flex items-center gap-1 text-[12px] text-faint" aria-label={`${commentCount} comments`}>
            <Icon name="comment" className="size-3.5" />
            {commentCount}
          </span>
        ) : (
          <span className="text-[12px] text-faint">Comment</span>
        )}
      </div>
    </div>
  );
}
