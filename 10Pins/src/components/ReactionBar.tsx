import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { addReaction, REACTION_EMOJI, removeReaction, type ReactionEmoji } from '../lib/feed';

interface ReactionRow {
  profile_id: string | null;
  emoji: string;
}

/**
 * The four reaction emoji with counts; tap toggles yours. Optimistic locally,
 * reconciled by a feed refetch after the write lands.
 */
export default function ReactionBar({
  feedEventId,
  profileId,
  reactions,
}: {
  feedEventId: string;
  profileId: string;
  reactions: ReactionRow[];
}) {
  const queryClient = useQueryClient();
  // emoji -> optimistic mine-state; null = trust the server rows
  const [override, setOverride] = useState<Partial<Record<ReactionEmoji, boolean>>>({});

  async function toggle(emoji: ReactionEmoji, mine: boolean) {
    setOverride((o) => ({ ...o, [emoji]: !mine }));
    try {
      if (mine) await removeReaction(feedEventId, profileId, emoji);
      else await addReaction(feedEventId, profileId, emoji);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['game-feed-event'] });
    } catch {
      setOverride((o) => ({ ...o, [emoji]: mine }));
    }
  }

  return (
    <div className="flex gap-2" onClick={(e) => e.preventDefault()}>
      {REACTION_EMOJI.map((emoji) => {
        const serverMine = reactions.some((r) => r.emoji === emoji && r.profile_id === profileId);
        const mine = override[emoji] ?? serverMine;
        const serverCount = reactions.filter((r) => r.emoji === emoji).length;
        const count = serverCount + (mine === serverMine ? 0 : mine ? 1 : -1);
        return (
          <button
            key={emoji}
            type="button"
            aria-pressed={mine}
            aria-label={`React ${emoji}`}
            onClick={(e) => {
              e.stopPropagation();
              void toggle(emoji, mine);
            }}
            className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[13px] ${
              mine ? 'border-phosphor/50 bg-phosphor/10' : 'border-line bg-well'
            }`}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="score-text text-[11px] text-dim">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
