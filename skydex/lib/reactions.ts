// Curated reaction set — single source of truth, kept in sync with the
// CHECK constraint on public.reactions. Order = display order.
export const REACTIONS = [
  { emoji: "🛫", label: "Nice catch" },
  { emoji: "🔥", label: "Fire" },
  { emoji: "😍", label: "Love it" },
  { emoji: "👀", label: "Spotted" },
  { emoji: "🏆", label: "Grail" },
] as const;

export const REACTION_EMOJI = REACTIONS.map((r) => r.emoji);

// Per-sighting reaction state passed from the feed: counts by emoji + the
// viewer's own reactions.
export type ReactionState = {
  counts: Record<string, number>;
  mine: string[];
};
