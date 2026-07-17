// SkyDex avatars, minted on the fly from a seed string — nothing stored but the seed.
// Two seed kinds (feedback 2026-07-17 — customisable icons):
//  - structured "c:<motif>:<bg>:<fg>:<treatment>": explicit user picks — 12 motifs ×
//    free bg/fg colour pairs from AVATAR_COLORS (bg ≠ fg) × 3 treatments.
//  - anything else (legacy random strings / handles): FNV-1a hash into
//    12 motifs × 8 curated palette pairs × 3 treatments, exactly as before —
//    existing avatars render bit-identically until their owner re-saves.
// Originally ported from files/avatar/build_avatars.py.

const GLYPHS: Record<string, string> = {
  airliner: `<path d="M50 18 L54 44 L84 58 L84 64 L54 56 L52 74 L62 82 L62 86 L50 82 L38 86 L38 82 L48 74 L46 56 L16 64 L16 58 L46 44 Z" fill="{C}"/>`,
  jet: `<g fill="{C}"><path d="M18 54 Q14 52 16 49 L40 47 L58 30 L64 30 L54 47 L74 46 L82 38 L86 38 L82 48 Q83 50 82 52 L86 52 L82 62 L78 62 L74 54 L54 53 L64 70 L58 70 L40 53 L16 51 Q14 56 18 54 Z"/></g>`,
  prop: `<g fill="none" stroke="{C}" stroke-width="4.5" stroke-linecap="round"><path d="M50 24 L50 76"/><path d="M26 50 L74 50"/><path d="M38 30 Q50 22 62 30"/><path d="M38 70 Q50 78 62 70"/></g><circle cx="50" cy="50" r="5" fill="{C}"/>`,
  helicopter: `<g fill="none" stroke="{C}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M24 36 L76 36"/><path d="M50 36 L50 44"/><path d="M34 58 Q34 44 50 44 Q60 44 64 52 L82 56 L82 60 L66 62 Q62 64 50 64 Q34 64 34 58 Z"/><path d="M28 64 L44 64"/><path d="M78 50 L78 64"/></g>`,
  control_tower: `<g fill="none" stroke="{C}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M43 82 L45 52 L55 52 L57 82"/><path d="M36 52 L64 52 L58 40 L42 40 Z"/><path d="M50 40 L50 28"/><path d="M45 28 L55 28"/><path d="M34 82 L66 82"/></g>`,
  radio_tower: `<g fill="none" stroke="{C}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M50 22 L34 84"/><path d="M50 22 L66 84"/><path d="M44 46 L56 46"/><path d="M40 62 L60 62"/><path d="M36 78 L64 78"/></g><g fill="none" stroke="{C}" stroke-width="3" stroke-linecap="round"><path d="M50 22 Q40 16 36 22"/><path d="M50 22 Q60 16 64 22"/></g><circle cx="50" cy="22" r="3.5" fill="{C}"/>`,
  suitcase: `<g fill="none" stroke="{C}" stroke-width="4" stroke-linejoin="round"><rect x="26" y="38" width="48" height="42" rx="5"/><path d="M40 38 L40 30 Q40 26 44 26 L56 26 Q60 26 60 30 L60 38"/><path d="M50 38 L50 80"/></g>`,
  binoculars: `<g fill="none" stroke="{C}" stroke-width="4" stroke-linejoin="round"><rect x="22" y="40" width="22" height="34" rx="9"/><rect x="56" y="40" width="22" height="34" rx="9"/><path d="M44 50 L56 50"/><path d="M28 40 L34 30 L38 30"/><path d="M72 40 L66 30 L62 30"/></g>`,
  windsock: `<g fill="none" stroke="{C}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M30 22 L30 82"/><path d="M30 32 L70 38 L66 50 L30 52 Z"/><path d="M70 38 L74 40"/></g>`,
  compass: `<circle cx="50" cy="50" r="28" fill="none" stroke="{C}" stroke-width="4"/><path d="M50 30 L57 50 L50 70 L43 50 Z" fill="{C}"/><circle cx="50" cy="50" r="3.5" fill="none" stroke="{C}" stroke-width="3"/>`,
  ticket: `<g fill="none" stroke="{C}" stroke-width="4" stroke-linejoin="round"><path d="M24 38 L76 38 Q76 46 80 48 Q76 50 76 58 L76 72 L24 72 L24 58 Q28 50 24 48 Q28 46 24 38 Z"/><path d="M58 38 L58 72" stroke-dasharray="3 5"/></g>`,
  globe: `<circle cx="50" cy="50" r="28" fill="none" stroke="{C}" stroke-width="4"/><g fill="none" stroke="{C}" stroke-width="3"><path d="M22 50 L78 50"/><ellipse cx="50" cy="50" rx="13" ry="28"/><path d="M28 36 Q50 44 72 36"/><path d="M28 64 Q50 56 72 64"/></g>`,
};

// [bg, glyph colour] — legacy curated pairs, still used verbatim for hash seeds.
const PALETTES: [string, string][] = [
  ["#F2EBDC", "#20262B"],
  ["#20262B", "#F2EBDC"],
  ["#0E7C86", "#F2EBDC"],
  ["#CDE5E6", "#0A5D64"],
  ["#B5402E", "#F8E9E3"],
  ["#B98A2E", "#2A2010"],
  ["#3E7A5A", "#EAF3E9"],
  ["#2E5E86", "#E2EEF7"],
];

export const TREATMENTS = ["solid", "roundel", "stamp"] as const;

// The pickable colour inventory (the palette bg list, in order). Structured
// seeds index into this for BOTH background and glyph — any pair goes except
// bg === fg. Append-only: indices are persisted in avatar_seed.
export const AVATAR_COLORS = [
  "#F2EBDC", // cream
  "#20262B", // ink
  "#0E7C86", // teal
  "#CDE5E6", // pale blue
  "#B5402E", // red
  "#B98A2E", // brass
  "#3E7A5A", // green
  "#2E5E86", // blue
] as const;

// Editor-prefill equivalents: nearest AVATAR_COLORS index for each legacy
// palette's glyph colour (dark glyphs → ink, light → cream, #0A5D64 → teal).
// Rendering of legacy seeds keeps the exact pair — this is prefill only.
const PALETTE_FG_EQUIV = [1, 0, 0, 2, 0, 1, 0, 0];

export const AVATAR_SEED_RE = /^c:(\d{1,2}):(\d{1,2}):(\d{1,2}):(\d{1,2})$/;

function background(treatment: string, bg: string, glyph: string): string {
  const base = `<rect width="100" height="100" rx="22" fill="${bg}"/>`;
  if (treatment === "roundel") {
    return (
      base +
      `<circle cx="50" cy="50" r="40" fill="none" stroke="${glyph}" stroke-width="2" opacity="0.22"/>` +
      `<circle cx="50" cy="50" r="32" fill="none" stroke="${glyph}" stroke-width="1.2" opacity="0.16"/>`
    );
  }
  if (treatment === "stamp") {
    return (
      base +
      `<circle cx="50" cy="50" r="41" fill="none" stroke="${glyph}" stroke-width="2.4" opacity="0.30"/>` +
      `<circle cx="50" cy="50" r="35" fill="none" stroke="${glyph}" stroke-width="1" stroke-dasharray="2 4" opacity="0.25"/>`
    );
  }
  return base;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const MOTIFS = Object.keys(GLYPHS);

export type AvatarParts = {
  motif: number; // 0..MOTIFS.length-1
  bg: number; // 0..AVATAR_COLORS.length-1
  fg: number; // 0..AVATAR_COLORS.length-1, ≠ bg
  treatment: number; // 0..TREATMENTS.length-1
  colors: [string, string]; // exact [bg, glyph] used to render (legacy pairs verbatim)
};

export function composeAvatarSeed(motif: number, bg: number, fg: number, treatment: number): string {
  return `c:${motif}:${bg}:${fg}:${treatment}`;
}

/** True when the given structured-seed indices are all in range and bg ≠ fg. */
export function validAvatarParts(motif: number, bg: number, fg: number, treatment: number): boolean {
  return (
    motif >= 0 && motif < MOTIFS.length &&
    bg >= 0 && bg < AVATAR_COLORS.length &&
    fg >= 0 && fg < AVATAR_COLORS.length &&
    bg !== fg &&
    treatment >= 0 && treatment < TREATMENTS.length
  );
}

/** Decode any seed into parts: structured seeds verbatim, everything else hashed. */
export function avatarParts(seed: string): AvatarParts {
  const m = AVATAR_SEED_RE.exec(seed);
  if (m) {
    const [motif, bg, fg, treatment] = [+m[1], +m[2], +m[3], +m[4]];
    if (validAvatarParts(motif, bg, fg, treatment)) {
      return { motif, bg, fg, treatment, colors: [AVATAR_COLORS[bg], AVATAR_COLORS[fg]] };
    }
  }
  const h = hash(seed || "skydex");
  const motif = h % MOTIFS.length;
  const paletteIdx = (h >>> 4) % PALETTES.length;
  const treatment = (h >>> 8) % TREATMENTS.length;
  // bg/fg are editor-prefill approximations; colors carries the exact pair.
  return {
    motif,
    bg: paletteIdx,
    fg: PALETTE_FG_EQUIV[paletteIdx],
    treatment,
    colors: PALETTES[paletteIdx],
  };
}

/** Deterministic avatar SVG markup for a seed (structured pick or legacy string). */
export function avatarSvg(seed: string, size = 32): string {
  const p = avatarParts(seed);
  const [bg, glyph] = p.colors;
  const body = background(TREATMENTS[p.treatment], bg, glyph);
  const g = GLYPHS[MOTIFS[p.motif]].replace(/\{C\}/g, glyph);
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="avatar">${body}${g}</svg>`;
}
