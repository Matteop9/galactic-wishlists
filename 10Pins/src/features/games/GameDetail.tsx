import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Scorecard, { type ScorecardPlayer } from '../../components/scorecard/Scorecard';
import Strip, { StatCell, StripHeader, StripTitle } from '../../components/Strip';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import Avatar from '../../components/Avatar';
import VerificationBadge from '../../components/VerificationBadge';
import ReactionBar from '../../components/ReactionBar';
import PlayerLink from '../../components/PlayerLink';
import { deleteGame, fetchGame } from '../../lib/games';
import { addComment, deleteComment, fetchComments, fetchGameFeedEvent } from '../../lib/feed';
import { highlightLabel } from '../../lib/highlights';
import { signedPhotoUrl } from '../../lib/capture';
import ShareSheet from '../../components/share/ShareSheet';
import type { ShareCardData } from '../../components/share/ShareCard';
import { framesFromRows } from '../../lib/frames';
import { ScorecardSkeleton } from '../../components/Skeleton';
import { useSkeleton } from '../../lib/useSkeleton';
import type { Profile } from '../../lib/auth';

type Verification = 'verified' | 'live' | 'unverified';

/** How an unverified game got here; photo and live are already said by the verification line. */
const ENTRY_LABEL: Record<string, string> = {
  total: 'Quick add',
  manual: 'Entered manually',
};

/** "8.42pm": the clock in the meta register. */
function clockTime(date: Date): string {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const twelve = hours % 12 || 12;
  return `${twelve}.${minutes}${hours < 12 ? 'am' : 'pm'}`;
}

/** "Sat 30 Aug, 8.42pm". */
function whenPlayed(date: Date): string {
  const day = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${day}, ${clockTime(date)}`;
}

/** A comment's time: the clock if it was today, otherwise the date. */
function commentTime(iso: string | null): string {
  const date = new Date(iso ?? '');
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  return sameDay
    ? clockTime(date)
    : date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** A highlight that means the total is hot: a personal best or a threshold club. */
function isHotHighlight(code: string): boolean {
  return code === 'PB' || code.endsWith('_CLUB');
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

export default function GameDetail({ profile }: { profile: Profile }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [sharing, setSharing] = useState(false);

  const game = useQuery({
    queryKey: ['game', id],
    enabled: !!id,
    queryFn: () => fetchGame(id!),
  });
  // Same key as SocialSection below, so react-query serves both from one
  // request: the share card wants the highlights this game earned.
  const feedEvent = useQuery({
    queryKey: ['game-feed-event', id],
    enabled: !!id,
    queryFn: () => fetchGameFeedEvent(id!),
  });
  const showSkeleton = useSkeleton(game.isPending);

  const remove = useMutation({
    mutationFn: () => deleteGame(id!),
    onSuccess: () => {
      queryClient.invalidateQueries();
      navigate('/', { replace: true });
    },
  });

  if (showSkeleton) {
    return (
      <div className="flex flex-col gap-4 px-4 py-5">
        <ScorecardSkeleton players={2} />
      </div>
    );
  }
  if (game.isPending) return <div className="px-4 py-5" />;
  if (game.isError || !game.data) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-10">
        <p className="text-[14px] text-ink-faded">That game is not available.</p>
        <Link to="/" className="press text-[14px] font-semibold text-blue">
          Back to home
        </Link>
      </div>
    );
  }

  const data = game.data;
  const players = [...data.game_players].sort((a, b) => a.seat_order - b.seat_order);
  const nameOf = (p: (typeof players)[number]) => p.profiles?.display_name ?? p.guest_name ?? 'Player';
  const isOwner = data.created_by === profile.id;
  const playedAt = new Date(data.played_at);
  const venueName = data.sessions?.venues?.name;
  const verification = data.verification_status as Verification;

  // The feed event stores the union of everyone's highlights, so it can only be
  // pinned to the winner when the winner is the only profile player on the sheet.
  const profilePlayers = players.filter((p) => p.profile_id !== null).length;
  const feedHighlights = Array.isArray(feedEvent.data?.highlights)
    ? (feedEvent.data.highlights as string[])
    : [];

  // The top scorer: the hot total when there is a contest, and the name in the title.
  const scored = players.filter((p) => p.final_score !== null);
  const topScorer = [...scored].sort((a, b) => (b.final_score ?? 0) - (a.final_score ?? 0))[0];
  const owner = players.find((p) => p.profile_id === data.created_by);
  const lead = players.length === 1 ? players[0] : (topScorer ?? owner ?? players[0]);
  const title = venueName && lead ? `${nameOf(lead)} at ${venueName}` : 'The game';
  const hotId =
    players.length >= 2
      ? topScorer?.id
      : feedHighlights.some(isHotHighlight)
        ? topScorer?.id
        : undefined;

  const framePlayers: ScorecardPlayer[] = players
    .filter((p) => p.frames.length > 0)
    .map((p) => ({
      name: nameOf(p),
      frames: framesFromRows(p.frames),
      meta: whenPlayed(playedAt),
      tone: p.id === hotId ? 'hot' : null,
    }));
  const totalsOnly = players.filter((p) => p.frames.length === 0);
  const withCounts = players.filter((p) => p.strikes !== null);
  const soloCounts = withCounts.length === 1 ? withCounts[0] : null;
  const entryLabel = verification === 'unverified' ? ENTRY_LABEL[data.entry_type] : undefined;

  // The card needs a grid, so it is offered on frame-scored games only. A
  // totals-only quick add has nothing to draw.
  const cardWinner = [...players]
    .filter((p) => p.frames.length > 0 && p.final_score !== null)
    .sort((a, b) => (b.final_score ?? 0) - (a.final_score ?? 0))[0];
  const shareData: ShareCardData | null =
    data.status === 'complete' && cardWinner
      ? {
          frames: framesFromRows(cardWinner.frames),
          players: players.map((p) => ({
            name: nameOf(p),
            score: p.final_score,
            isYou: p.profile_id === profile.id,
          })),
          verification,
          highlights: profilePlayers === 1 ? feedHighlights : [],
          strikes: cardWinner.strikes ?? undefined,
          venueName: venueName ?? null,
          playedAt: data.played_at,
        }
      : null;

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      <PageHeader back title={title} />

      {framePlayers.length > 0 && <Scorecard players={framePlayers} variant="full" />}

      {totalsOnly.length > 0 && (
        <Strip>
          {totalsOnly.map((p) => (
            <StripHeader
              key={p.id}
              size="lg"
              title={
                <PlayerLink profileId={p.profile_id} myId={profile.id}>
                  {nameOf(p)}
                </PlayerLink>
              }
              meta={
                framePlayers.length > 0
                  ? p.guest_name
                    ? 'Guest · Quick add, totals only'
                    : 'Quick add, totals only'
                  : `${p.guest_name ? 'Guest · ' : ''}Quick add, totals only · ${whenPlayed(playedAt)}`
              }
              right={p.final_score ?? '–'}
              tone={p.id === hotId ? 'hot' : p.final_score === null ? 'faded' : null}
            />
          ))}
        </Strip>
      )}

      <div className="flex flex-wrap gap-4 px-0.5 text-[12px] text-ink-faded">
        {soloCounts && (
          <>
            <span className="font-semibold text-red">
              <span className="num">{soloCounts.strikes ?? 0}</span> {plural(soloCounts.strikes ?? 0, 'strike', 'strikes')}
            </span>
            <span className="font-semibold text-blue">
              <span className="num">{soloCounts.spares ?? 0}</span> {plural(soloCounts.spares ?? 0, 'spare', 'spares')}
            </span>
          </>
        )}
        <VerificationBadge status={verification} />
        {entryLabel && <span>{entryLabel}</span>}
      </div>

      {withCounts.length > 1 && (
        <Strip>
          <StripTitle>This game</StripTitle>
          {withCounts.map((p) => (
            <div key={p.id} className="flex flex-col">
              <div className="px-3.5 pt-2.5 text-[14px] font-semibold">
                <PlayerLink profileId={p.profile_id} myId={profile.id}>
                  {nameOf(p)}
                </PlayerLink>
              </div>
              <div className="grid grid-cols-3 divide-x divide-hairline">
                <StatCell value={p.strikes ?? 0} label="Strikes" tone="hot" />
                <StatCell value={p.spares ?? 0} label="Spares" tone="steady" />
                <StatCell value={p.opens ?? 0} label="Opens" />
              </div>
            </div>
          ))}
        </Strip>
      )}

      {sharing && shareData && <ShareSheet data={shareData} onClose={() => setSharing(false)} />}

      {isOwner && data.photo_path && <ScanPhoto path={data.photo_path} />}

      <SocialSection
        gameId={data.id}
        profile={profile}
        onShare={shareData ? () => setSharing(true) : undefined}
      />

      {isOwner && (
        <div className="flex flex-col gap-2 pt-2">
          {confirmingDelete ? (
            <Strip soft>
              <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-3">
                <span className="text-[14px]">Delete this game and its frames?</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setConfirmingDelete(false)} className="btn-secondary-sm">
                    Keep it
                  </button>
                  <button
                    type="button"
                    onClick={() => remove.mutate()}
                    disabled={remove.isPending}
                    className="press rounded-r2 bg-red px-4 py-2 text-[13px] font-semibold text-paper disabled:bg-disabled-bg disabled:text-disabled-fg"
                  >
                    {remove.isPending ? 'Deleting' : 'Delete'}
                  </button>
                </div>
              </div>
            </Strip>
          ) : (
            <button type="button" onClick={() => setConfirmingDelete(true)} className="btn-danger-text self-start">
              Delete game
            </button>
          )}
          {remove.isError && (
            <p className="text-[13px] text-red" role="alert">
              That did not delete. Check your connection and try again.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The monitor photo behind a scanned game. Only the person who took it can
 * read it back (the storage policy is scoped to the owner's own folder), so
 * it renders for them and quietly does not exist for everyone else.
 */
function ScanPhoto({ path }: { path: string }) {
  const photo = useQuery({
    queryKey: ['scan-photo', path],
    queryFn: () => signedPhotoUrl(path),
    staleTime: 10 * 60 * 1000,
  });
  const [open, setOpen] = useState(false);
  if (!photo.data) return null;
  return (
    <Strip soft>
      <button type="button" onClick={() => setOpen((v) => !v)} className="press flex w-full flex-col text-left">
        <img
          src={photo.data}
          alt="The scoreboard this game was scanned from"
          className={`w-full ${open ? '' : 'h-[110px] object-contain'}`}
        />
        <span className="w-full border-t border-hairline px-3.5 py-2 text-[13px] text-ink-faded">
          {open ? 'Tap to collapse' : 'The photo, tap to open'}
        </span>
      </button>
    </Strip>
  );
}

/**
 * The actions row (nice one, comment, share card) and the comment thread,
 * hosted on the game's feed event.
 */
function SocialSection({
  gameId,
  profile,
  onShare,
}: {
  gameId: string;
  profile: Profile;
  onShare?: () => void;
}) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const event = useQuery({
    queryKey: ['game-feed-event', gameId],
    queryFn: () => fetchGameFeedEvent(gameId),
  });
  const feedEventId = event.data?.id;

  const comments = useQuery({
    queryKey: ['comments', feedEventId],
    enabled: !!feedEventId,
    queryFn: () => fetchComments(feedEventId!),
  });

  const post = useMutation({
    mutationFn: () => addComment(feedEventId!, profile.id, body),
    onSuccess: () => {
      setBody('');
      queryClient.invalidateQueries({ queryKey: ['comments', feedEventId] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const removeComment = useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', feedEventId] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const highlights = Array.isArray(event.data?.highlights) ? (event.data.highlights as string[]) : [];

  // Old games without a feed event (or one the viewer can't see) skip the
  // thread; the share card does not depend on it.
  if (!feedEventId) {
    if (!onShare) return null;
    return (
      <div className="flex flex-wrap items-center gap-2.5">
        <button type="button" onClick={onShare} className="btn-secondary-sm">
          Share card
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {highlights.length > 0 && (
        <div className="flex flex-wrap gap-3.5 px-0.5 text-[13px]">
          {highlights.map((code) => (
            <span key={code} className="font-semibold text-red">
              {highlightLabel(code)}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        <ReactionBar feedEventId={feedEventId} profileId={profile.id} reactions={event.data?.reactions ?? []} />
        <button type="button" onClick={() => inputRef.current?.focus()} className="chip">
          Comment
        </button>
        {onShare && (
          <button type="button" onClick={onShare} className="btn-secondary-sm">
            Share card
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {(comments.data ?? []).map((c) => {
          const name = c.profiles?.display_name ?? 'Someone';
          return (
            <div key={c.id} className="flex gap-2.5">
              <Avatar name={name} size={32} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="text-[13px]">
                  <PlayerLink profileId={c.profile_id} myId={profile.id} className="font-semibold">
                    {name}
                  </PlayerLink>{' '}
                  <span className="num text-ink-faded">{commentTime(c.created_at)}</span>
                  {c.profile_id === profile.id && (
                    <>
                      {' '}
                      <button
                        type="button"
                        onClick={() => removeComment.mutate(c.id)}
                        className="btn-danger-text text-[12px]"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </p>
                <p className="whitespace-pre-wrap text-[14px]">{c.body}</p>
              </div>
            </div>
          );
        })}
        {comments.data && comments.data.length === 0 && <EmptyState tone="quiet" body="No comments yet." />}
        {removeComment.isError && (
          <p className="text-[13px] text-red" role="alert">
            That comment did not delete. Try again.
          </p>
        )}
      </div>

      <form
        className="flex gap-2.5 border-t border-hairline pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim() && !post.isPending) post.mutate();
        }}
      >
        <input
          ref={inputRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={500}
          placeholder="Say something"
          aria-label="Add a comment"
          className="field min-w-0 flex-1"
        />
        <button type="submit" disabled={!body.trim() || post.isPending} className="btn-primary-sm shrink-0">
          Send
        </button>
      </form>
      {post.isError && (
        <p className="text-[13px] text-red" role="alert">
          That did not send. Check your connection and try again.
        </p>
      )}
    </div>
  );
}
