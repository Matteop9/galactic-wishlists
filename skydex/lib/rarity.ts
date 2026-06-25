// Shared rarity constants — single source of truth for the five tiers.
// Colours mirror the --color-rarity-* tokens in app/globals.css.

export const RARITY_TIERS = ["common", "uncommon", "rare", "epic", "legendary"] as const;
export type Rarity = (typeof RARITY_TIERS)[number];

// Ordered rank (common = 0 … legendary = 4) for sorting.
export const RARITY_RANK: Record<string, number> = Object.fromEntries(
  RARITY_TIERS.map((t, i) => [t, i]),
);

export const RARITY_COLOR: Record<string, string> = {
  common: "var(--color-rarity-common)",
  uncommon: "var(--color-rarity-uncommon)",
  rare: "var(--color-rarity-rare)",
  epic: "var(--color-rarity-epic)",
  legendary: "var(--color-rarity-legendary)",
};
