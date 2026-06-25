"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { REACTIONS, type ReactionState } from "@/lib/reactions";

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
  const [mine, setMine] = useState<Set<string>>(new Set(state?.mine ?? []));
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(emoji: string) {
    if (!currentUserId || busy) return;
    const has = mine.has(emoji);

    // Optimistic update.
    setMine((prev) => {
      const next = new Set(prev);
      if (has) next.delete(emoji);
      else next.add(emoji);
      return next;
    });
    setCounts((prev) => ({
      ...prev,
      [emoji]: Math.max(0, (prev[emoji] ?? 0) + (has ? -1 : 1)),
    }));

    setBusy(emoji);
    const { error } = has
      ? await supabase
          .from("reactions")
          .delete()
          .eq("sighting_id", sightingId)
          .eq("user_id", currentUserId)
          .eq("emoji", emoji)
      : await supabase
          .from("reactions")
          .insert({ sighting_id: sightingId, user_id: currentUserId, emoji });
    setBusy(null);

    // Roll back on failure.
    if (error) {
      setMine((prev) => {
        const next = new Set(prev);
        if (has) next.add(emoji);
        else next.delete(emoji);
        return next;
      });
      setCounts((prev) => ({
        ...prev,
        [emoji]: Math.max(0, (prev[emoji] ?? 0) + (has ? 1 : -1)),
      }));
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5 bg-paper-deep px-3 pb-2 pt-1">
      {REACTIONS.map(({ emoji, label }) => {
        const n = counts[emoji] ?? 0;
        const reacted = mine.has(emoji);
        return (
          <button
            key={emoji}
            onClick={() => toggle(emoji)}
            disabled={!currentUserId || busy === emoji}
            title={currentUserId ? label : "Sign in to react"}
            aria-pressed={reacted}
            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs transition-colors disabled:cursor-default ${
              reacted
                ? "border-sky bg-sky/10 text-ink"
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
