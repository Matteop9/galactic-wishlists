import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Scorecard, { type ScorecardPlayer } from '../../components/scorecard/Scorecard';
import VerificationBadge from '../../components/VerificationBadge';
import ReactionBar from '../../components/ReactionBar';
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

const ENTRY_LABEL: Record<string, string> = {
  photo: 'Scanned scoreboard',
  live: 'Scored live',
  total: 'Quick add',
  manual: 'Entered manually',
};

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
  // request — the share card wants the highlights this game earned.
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
      <div className="flex flex-col gap-4 px-4 py-6">
        <ScorecardSkeleton players={2} />
      </div>
    );
  }
  if (game.isPending) return <div className="px-4 py-6" />;
  if (game.isError || !game.data) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-10">
        <p className="text-[13.5px] text-dim">That game isn’t available.</p>
        <Link to="/" className="text-[13.5px] text-phosphor underline underline-offset-2">
          Back to home
        </Link>
      </div>
    );
  }

  const data = game.data;
  const players = [...data.game_players].sort((a, b) => a.seat_order - b.seat_order);
  const framePlayers: ScorecardPlayer[] = players
    .filter((p) => p.frames.length > 0)
    .map((p) => ({
      name: (p.profiles?.display_name ?? p.guest_name ?? 'Player').split(/\s+/)[0].toUpperCase(),
      frames: framesFromRows(p.frames),
    }));
  const totalsOnly = players.filter((p) => p.frames.length === 0);
  const isOwner = data.created_by === profile.id;
  const playedAt = new Date(data.played_at);
  const venueName = data.sessions?.venues?.name;

  // The card needs a grid, so it’s offered on frame-scored games only — a
  // totals-only quick add has nothing to draw.
  const cardWinner = [...players]
    .filter((p) => p.frames.length > 0 && p.final_score !== null)
    .sort((a, b) => (b.final_score ?? 0) - (a.final_score ?? 0))[0];
  // The feed event stores the union of everyone's highlights, so it can only be
  // pinned to the winner when the winner is the only profile player on the sheet.
  const profilePlayers = players.filter((p) => p.profile_id !== null).length;
  const feedHighlights = Array.isArray(feedEvent.data?.highlights)
    ? (feedEvent.data.highlights as string[])
    : [];
  const shareData: ShareCardData | null =
    data.status === 'complete' && cardWinner
      ? {
          frames: framesFromRows(cardWinner.frames),
          players: players.map((p) => ({
            name: p.profiles?.display_name ?? p.guest_name ?? 'Player',
            score: p.final_score,
            isYou: p.profile_id === profile.id,
          })),
          verification: data.verification_status as 'verified' | 'live' | 'unverified',
          highlights: profilePlayers === 1 ? feedHighlights : [],
          strikes: cardWinner.strikes ?? undefined,
          venueName: venueName ?? null,
          playedAt: data.played_at,
        }
      : null;

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[20px] font-bold">The game</h1>
        <VerificationBadge status={data.verification_status as 'verified' | 'live' | 'unverified'} />
      </div>

      <p className="text-[13.5px] text-dim">
        {playedAt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
        {venueName ? ` · ${venueName}` : ''} · {ENTRY_LABEL[data.entry_type] ?? data.entry_type}
      </p>

      {framePlayers.length > 0 && (
        <div className="rounded-2xl border border-line bg-panel p-3">
          <Scorecard players={framePlayers} variant="full" />
        </div>
      )}

      {totalsOnly.length > 0 && (
        <div className="flex flex-col gap-2 rounded-2xl border border-line bg-panel p-3">
          {totalsOnly.map((p) => (
            <div key={p.id} className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[.08em] text-dim">
                {p.profiles?.display_name ?? p.guest_name}
                {p.guest_name ? ' (guest)' : ''}
              </span>
              <span className="score-text text-[17px] font-bold text-text">{p.final_score}</span>
            </div>
          ))}
        </div>
      )}

      {players.some((p) => p.strikes !== null) && (
        <div className="flex flex-col gap-2">
          <span className="label-caps">This game</span>
          {players
            .filter((p) => p.strikes !== null)
            .map((p) => (
              <div key={p.id} className="flex items-center gap-4 rounded-xl border border-line bg-panel px-4 py-3">
                <span className="flex-1 truncate font-mono text-[11px] font-semibold uppercase tracking-[.08em] text-dim">
                  {p.profiles?.display_name ?? p.guest_name}
                </span>
                <MiniStat label="Strikes" value={p.strikes ?? 0} />
                <MiniStat label="Spares" value={p.spares ?? 0} />
                <MiniStat label="Opens" value={p.opens ?? 0} />
              </div>
            ))}
        </div>
      )}

      {shareData && (
        <button
          type="button"
          onClick={() => setSharing(true)}
          className="press self-start rounded-[10px] border border-line bg-panel px-4 py-2.5 text-[13.5px] font-bold text-text"
        >
          Share card
        </button>
      )}
      {sharing && shareData && <ShareSheet data={shareData} onClose={() => setSharing(false)} />}

      {isOwner && data.photo_path && <ScanPhoto path={data.photo_path} />}

      <SocialSection gameId={data.id} profile={profile} />

      {isOwner && (
        <div className="mt-2 flex flex-col gap-2">
          {confirmingDelete ? (
            <div className="flex items-center justify-between rounded-xl border border-signal/40 bg-panel px-4 py-3">
              <span className="text-[13.5px] text-dim">Delete this game and its frames?</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="rounded-lg border border-line px-3 py-1.5 text-[13.5px] text-dim"
                >
                  Keep it
                </button>
                <button
                  type="button"
                  onClick={() => remove.mutate()}
                  disabled={remove.isPending}
                  className="rounded-lg bg-signal px-3 py-1.5 text-[13.5px] font-bold text-ink"
                >
                  {remove.isPending ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="self-start text-[13.5px] text-signal underline underline-offset-2"
            >
              Delete game
            </button>
          )}
          {remove.isError && (
            <p className="text-[12px] text-signal" role="alert">
              That didn’t delete — check your signal and try again.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The monitor photo behind a scanned game. Only the person who took it can
 * read it back — the storage policy is scoped to the owner’s own folder — so
 * it renders for them and quietly doesn’t exist for everyone else.
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
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className={`press overflow-hidden rounded-xl border border-line bg-well ${open ? '' : 'h-[110px]'}`}
    >
      <img
        src={photo.data}
        alt="The scoreboard this game was scanned from"
        className={`w-full ${open ? '' : 'h-[110px] object-contain'}`}
      />
      <span className="label-caps block py-1">{open ? 'Tap to collapse' : 'The photo · tap to open'}</span>
    </button>
  );
}

/** Reactions + the comment thread, hosted on the game’s feed event. */
function SocialSection({ gameId, profile }: { gameId: string; profile: Profile }) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');

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

  // Old games without a feed event (or one the viewer can’t see) just skip the section
  if (!feedEventId) return null;

  return (
    <div className="flex flex-col gap-3">
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

      <ReactionBar
        feedEventId={feedEventId}
        profileId={profile.id}
        reactions={event.data?.reactions ?? []}
      />

      <span className="label-caps">Comments</span>
      {(comments.data ?? []).map((c) => (
        <div key={c.id} className="rounded-xl border border-line bg-panel px-4 py-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] font-bold text-text">{c.profiles?.display_name}</span>
            <span className="text-[10px] text-faint">
              {new Date(c.created_at ?? '').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              {c.profile_id === profile.id && (
                <button
                  type="button"
                  onClick={() => removeComment.mutate(c.id)}
                  className="ml-2 text-signal underline underline-offset-2"
                >
                  Delete
                </button>
              )}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-[13.5px] text-dim">{c.body}</p>
        </div>
      ))}
      {comments.data && comments.data.length === 0 && (
        <p className="text-[12px] text-faint">No comments yet — say something nice (or not).</p>
      )}
      {removeComment.isError && (
        <p className="text-[12px] text-signal" role="alert">
          Couldn’t delete that comment — try again.
        </p>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim() && !post.isPending) post.mutate();
        }}
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={500}
          placeholder="Add a comment…"
          aria-label="Add a comment"
          className="min-w-0 flex-1 rounded-[10px] border border-line bg-well px-3 py-2.5 text-[14px] text-text placeholder:text-faint"
        />
        <button
          type="submit"
          disabled={!body.trim() || post.isPending}
          className="rounded-[10px] bg-phosphor px-4 font-display text-[13px] font-bold text-ink disabled:opacity-50"
        >
          Post comment
        </button>
      </form>
      {post.isError && (
        <p className="text-[12px] text-signal" role="alert">
          Couldn’t post that — try again.
        </p>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <span className="flex flex-col items-center">
      <span className="score-text text-[15px] font-bold text-text">{value}</span>
      <span className="text-[9px] uppercase tracking-[.1em] text-faint">{label}</span>
    </span>
  );
}
