// How loudly the Discovery moment should celebrate a catch. Pure function so
// the tier is decided once, at render, from server-supplied facts only — never
// from the late-arriving type_popularity RPC (that would visibly "upgrade" the
// animation mid-play). The "only one in the world" hero line stays a separate,
// later upgrade, exactly as before.
//
// Relative import (not "@/lib/rarity") so `node --test` can run the unit test
// without the TS path alias.
import { RARITY_RANK } from "./rarity.ts";

export type CelebrationTier = 0 | 1 | 2 | 3;

export type CelebrationInput = {
  discoveries: { type: boolean; airline: boolean; origin: boolean; destination: boolean };
  rarity: string; // common | uncommon | rare | epic | legendary
  specialLivery: string | null;
  /** Server flag: the user's very first sighting. Optional — older responses omit it. */
  firstCatch?: boolean;
  /** Server flag: the user has never caught this rarity tier (or higher) before. */
  newRarityTier?: boolean;
};

/**
 * 0 — repeat catch: quiet card entrance only.
 * 1 — anything new to the collection (type / carrier / departure / destination).
 * 2 — rare or better, a special livery, or a rarity tier never caught before.
 * 3 — first ever catch, or a legendary.
 */
export function celebrationTier(r: CelebrationInput): CelebrationTier {
  const rank = RARITY_RANK[r.rarity] ?? 0;
  if (r.firstCatch || r.rarity === "legendary") return 3;
  if (r.newRarityTier || r.specialLivery || rank >= RARITY_RANK.rare) return 2;
  const d = r.discoveries;
  if (d.type || d.airline || d.origin || d.destination) return 1;
  return 0;
}

/** Header copy for the Discovery moment, by tier + facts. */
export function celebrationHeadline(r: CelebrationInput, tier: CelebrationTier): string {
  if (tier === 3) return r.firstCatch ? "First catch" : "Legendary";
  if (tier >= 1) return "New discovery";
  return "Caught!";
}
