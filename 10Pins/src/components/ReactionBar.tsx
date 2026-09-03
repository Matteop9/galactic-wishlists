import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { addReaction, removeReaction } from '../lib/feed';

interface ReactionRow {
  profile_id: string | null;
  emoji: string;
}

/** "3 nice ones", "1 nice one", or nothing. */
export function niceOnes(count: number): string | null {
  if (count <= 0) return null;
  return count === 1 ? '1 nice one' : `${count} nice ones`;
}

/**
 * One reaction, "Nice one", with a count; tap toggles yours. Optimistic
 * locally, reconciled by a feed refetch after the write lands. Older rows may
 * carry any of the four emoji the app used to offer; they all count as a nice
 * one here.
 */
export default function ReactionBar({
  feedEventId,
  profileId,
  reactions,
  className = '',
}: {
  feedEventId: string;
  profileId: string;
  reactions: ReactionRow[];
  className?: string;
}) {
  const queryClient = useQueryClient();
  // null = trust the server rows
  const [override, setOverride] = useState<boolean | null>(null);

  const serverMine = reactions.some((r) => r.profile_id === profileId);
  const mine = override ?? serverMine;
  const count = reactions.length + (mine === serverMine ? 0 : mine ? 1 : -1);

  async function toggle() {
    setOverride(!mine);
    try {
      if (mine) await removeReaction(feedEventId, profileId);
      else await addReaction(feedEventId, profileId);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['game-feed-event'] });
    } catch {
      setOverride(mine);
    }
  }

  return (
    <button
      type="button"
      aria-pressed={mine}
      aria-label={mine ? 'Take back your nice one' : 'Say nice one'}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        void toggle();
      }}
      className={`${mine ? 'chip-active' : 'chip'} gap-1.5 ${className}`}
    >
      Nice one
      {count > 0 && (
        <>
          <span aria-hidden>·</span>
          <span className="num">{count}</span>
        </>
      )}
    </button>
  );
}
