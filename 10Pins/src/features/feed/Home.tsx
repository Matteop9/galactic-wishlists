import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Wordmark from '../../components/Wordmark';
import { FeedSkeleton, RefetchLine } from '../../components/Skeleton';
import VerificationBadge from '../../components/VerificationBadge';
import ReactionBar from '../../components/ReactionBar';
import { fetchFeed, highlightLabel, type FeedEvent } from '../../lib/feed';
import { fetchLiveNow } from '../../lib/live';
import { fetchUnreadCount } from '../../lib/notifications';
import { useSkeleton } from '../../lib/useSkeleton';
import EmptyState from '../../components/EmptyState';
import { useScanQueue } from '../../lib/useScanQueue';
import type { Profile } from '../../lib/auth';

/** Home: the feed — your games plus your groups' and friends' games. */
export default function Home({ profile }: { profile: Profile }) {
  const feed = useQuery({ queryKey: ['feed'], queryFn: fetchFeed });
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
            className="relative flex size-9 items-center justify-center rounded-full border border-line bg-panel text-[15px]"
          >
            🔔
            {(unread.data ?? 0) > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-phosphor px-1 font-display text-[10px] font-bold text-ink">
                {unread.data! > 9 ? '9+' : unread.data}
              </span>
            )}
          </Link>
          <Link
            to="/profile"
            className="flex size-9 items-center justify-center rounded-full border border-line bg-panel font-display text-[13px] font-bold text-glass"
          >
            {profile.display_name
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase())
              .join('')}
          </Link>
        </div>
      </header>

      <ScanQueueBanner />

      <LiveNow profile={profile} />

      <RefetchLine active={feed.isFetching && !feed.isPending} />

      {showSkeleton && <FeedSkeleton />}

      {!showSkeleton && feed.data && feed.data.length === 0 && (
        <EmptyState
          title="Nothing here yet"
          body="Scan the scoreboard from your last game and it lands here — or start with the totals, which takes ten seconds."
          action={{ label: 'Scan your first game', to: '/add/scan' }}
          secondary={{ label: 'Quick add the totals', to: '/add/quick' }}
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
            className="press flex items-center justify-between gap-3 rounded-2xl border border-phosphor/50 bg-panel px-4 py-3 shadow-glow-amber"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="size-2 shrink-0 animate-pulse rounded-full bg-signal" aria-hidden />
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
        className="press flex items-center justify-between rounded-xl border border-phosphor/40 bg-panel px-4 py-3 shadow-glow-amber"
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
      className="press flex items-center justify-between rounded-xl border border-line bg-panel px-4 py-3"
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
      className="press flex cursor-pointer flex-col gap-3 rounded-2xl border border-line bg-panel p-4"
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
            <span
              className={`text-[15px] ${p.profile_id === profile.id ? 'font-display font-bold text-text' : 'text-dim'}`}
            >
              {nameOf(p)}
            </span>
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
        <span className="text-[12px] text-faint">
          {commentCount > 0 ? `💬 ${commentCount}` : 'Comment'}
        </span>
      </div>
    </div>
  );
}
