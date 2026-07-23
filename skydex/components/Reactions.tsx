"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { VOTES, type ReactionState } from "@/lib/reactions";

// Selected-state styling per vote tone. ❓ is brass (amber) rather than red:
// "can't see it" is a validity question, not a judgement.
const SELECTED: Record<string, string> = {
  up: "border-rarity-uncommon bg-rarity-uncommon/10 text-ink",
  down: "border-stamp bg-stamp/10 text-ink",
  unsure: "border-brass bg-brass/10 text-ink",
};

export default function Reactions({
  sightingId,
  currentUserId,
  state,
}: {
  sightingId: string;
  currentUserId: string | null;
  state?: ReactionState;
}) {
  const supabase = useRef(createClient()).current;
  const [counts, setCounts] = useState<Record<string, number>>(state?.counts ?? {});
  const [myVote, setMyVote] = useState<string | null>(state?.mine?.[0] ?? null);
  const [busy, setBusy] = useState(false);

  async function vote(emoji: string) {
    if (!currentUserId || busy) return;
    const prevVote = myVote;
    const prevCounts = { ...counts };
    const untap = prevVote === emoji;

    // Optimistic update — exclusive vote: tapping again clears, tapping
    // another switches.
    setMyVote(untap ? null : emoji);
    setCounts((c) => {
      const next = { ...c };
      if (untap) {
        next[emoji] = Math.max(0, (next[emoji] ?? 0) - 1);
      } else {
        next[emoji] = (next[emoji] ?? 0) + 1;
        if (prevVote) next[prevVote] = Math.max(0, (next[prevVote] ?? 0) - 1);
      }
      return next;
    });

    setBusy(true);
    const { error } = untap
      ? await supabase
          .from("reactions")
          .delete()
          .eq("sighting_id", sightingId)
          .eq("user_id", currentUserId)
      : await supabase
          .from("reactions")
          .upsert(
            { sighting_id: sightingId, user_id: currentUserId, emoji },
            { onConflict: "sighting_id,user_id" },
          );
    setBusy(false);

    if (error) {
      // Roll back to the captured pre-tap state.
      setMyVote(prevVote);
      setCounts(prevCounts);
      return;
    }

    // Review side effects, fire-and-forget: a ❓ vote also casts a community
    // photo-review "can't see it" (the RPC enforces standing/caps/self-exclusion
    // and returns soft JSON — ineligible taps stay cosmetic); leaving ❓
    // withdraws it (a no-op once the photo is already flagged).
    if (!untap && emoji === "❓") {
      void supabase.rpc("review_vote", { p_sighting: sightingId, p_can_see: false });
    } else if (prevVote === "❓") {
      void supabase.rpc("review_unvote", { p_sighting: sightingId });
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5 bg-paper-deep px-3 pb-2 pt-1">
      {VOTES.map(({ emoji, label, tone }) => {
        const n = counts[emoji] ?? 0;
        const selected = myVote === emoji;
        return (
          <button
            key={emoji}
            onClick={() => vote(emoji)}
            disabled={!currentUserId || busy}
            title={currentUserId ? label : "Sign in to vote"}
            aria-pressed={selected}
            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs transition-colors disabled:cursor-default ${
              selected
                ? SELECTED[tone]
                : "border-paper-edge text-ink-soft hover:border-ink enabled:hover:text-ink"
            }`}
          >
            <span className="text-sm leading-none">{emoji}</span>
            {n > 0 && <span className="tabular-nums">{n}</span>}
          </button>
        );
      })}
    </div>
  );
}
