// Feed vote set — single source of truth, kept in sync with the CHECK
// constraint on public.reactions. One vote per user per sighting; ❓ also
// feeds the community photo-review tally (see components/Reactions.tsx).
// Order = display order.
export const VOTES = [
  { emoji: "🛫", label: "Great catch", tone: "up" },
  { emoji: "🛬", label: "Not feeling this one", tone: "down" },
  { emoji: "❓", label: "Can't see the plane", tone: "unsure" },
] as const;

// Per-sighting vote state passed from the feed: counts by emoji + the
// viewer's own vote (at most one entry).
export type ReactionState = {
  counts: Record<string, number>;
  mine: string[];
};
