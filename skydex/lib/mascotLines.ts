// Everything the companion says, in one place, in the logbook voice: dry,
// competent, two short sentences at most, no emoji (research/mascot-design-brief.md §6).
// Picks are seeded so the same catch always gets the same line (React purity —
// no Math.random during render) while different catches vary.

import { celebrationTier, type CelebrationInput } from "./celebration.ts";

/** Small deterministic string hash (FNV-1a, 32-bit). */
export function seedHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function pickBySeed<T>(pool: readonly T[], seed: string | number): T {
  const n = typeof seed === "number" ? seed : seedHash(seed);
  return pool[n % pool.length];
}

// ---- Capture card -----------------------------------------------------------

/** Roughly how often she comments on an ordinary (tier 0–1) catch: 1 in N. */
export const CAPTURE_CHATTER_ONE_IN = 3;

export const CAPTURE_LINES = {
  repeat: [
    "Another one for the book.",
    "Clean shot. Logged.",
    "A regular. Still counts.",
    "Seen it before. Never gets old.",
    "Logged. Eyes back up.",
  ],
  new: [
    "New one for the logbook.",
    "That fills a gap.",
    "Hadn't got that one yet. Now you have.",
    "Good — that's a page you didn't have.",
  ],
  big: ["Didn't see that coming — nice catch.", "Now that's worth the walk.", "Told you to keep looking up."],
  first: ["First entry. They all start like this."],
  legendary: ["Well. That's one for the wall."],
  livery: ["Special delivery — new livery for the logbook."],
} as const;

export type CaptureLine = { pose: "wave" | "celebrate"; text: string };

/**
 * What she says on the catch card, or null to stay quiet. Tier ≥ 2 always
 * speaks; tier 0–1 speaks on about one catch in CAPTURE_CHATTER_ONE_IN, seeded
 * by the sighting id so the decision is stable across re-renders.
 */
export function captureLine(r: CelebrationInput & { id: string }): CaptureLine | null {
  const tier = celebrationTier(r);
  const seed = seedHash(r.id);
  if (r.discoveries.livery && r.specialLivery) return { pose: "celebrate", text: CAPTURE_LINES.livery[0] };
  if (tier === 3) {
    return { pose: "celebrate", text: r.firstCatch ? CAPTURE_LINES.first[0] : CAPTURE_LINES.legendary[0] };
  }
  if (tier === 2) return { pose: "celebrate", text: pickBySeed(CAPTURE_LINES.big, seed) };
  if (seed % CAPTURE_CHATTER_ONE_IN !== 0) return null;
  const d = r.discoveries;
  const anyNew = d.type || d.airline || d.origin || d.destination;
  return { pose: "wave", text: pickBySeed(anyNew ? CAPTURE_LINES.new : CAPTURE_LINES.repeat, seed >>> 3) };
}

// ---- Hints ------------------------------------------------------------------

/** Hints keyed by route prefix; "*" applies anywhere. Longest matching prefix wins the pool merge. */
export const HINTS: Record<string, readonly string[]> = {
  "*": [
    "Near an airport, aim at the approach — planes are lower and slower.",
    "The reticle turns red when a real flight lines up. That's your moment.",
    "Compass drifting? Wave the phone in a figure-of-eight.",
    "Special liveries are their own collection. Liveries shows what's around.",
    "A wet-lease badge means another airline flew it. Still counts.",
    "Every photo opens the full card — flight, route, rarity.",
  ],
  "/": ["What's new lists every change since the last release."],
  "/feed": ["Reactions are one tap. Comments are for the real stories.", "Popular sorts by reactions — see what the room liked."],
  "/scrapbook": ["Open as book to see the gaps in your collection.", "The third wheel is liveries — a collection inside the collection."],
  "/books": ["Grey slots are the ones you're missing. The Rarity book groups them by tier."],
  "/liveries": ["A livery is matched by registration — the same airframe every time."],
  "/leaderboards": ["Rarity score: one legendary is worth twenty-five commons.", "Boards count verified catches only. Same as everything here."],
  "/u/": ["Star up to three catches to feature them on a profile."],
  "/tickets": ["Reviewing other spotters' photos earns Tickets — one each."],
  "/review": ["If you can't see a plane, say so. Honest reviews keep the feed real."],
  "/settings": ["Your companion can be switched off here. No hard feelings."],
};

/** Routes where she must never pop up unprompted. */
export const HINT_QUIET_ROUTES = ["/spot", "/login", "/auth", "/privacy", "/terms", "/attributions", "/support", "/s/"];

/** Chance a page view shows a hint, once the cool-down has passed. */
export const HINT_CHANCE = 0.35;
/** Minimum gap between hints, ms. */
export const HINT_MIN_GAP_MS = 20 * 60 * 1000;
/** How long a hint stays before it slides away, ms. */
export const HINT_DWELL_MS = 9000;

export function hintPool(pathname: string): readonly string[] {
  const route = Object.keys(HINTS)
    .filter((k) => k !== "*" && (k === "/" ? pathname === "/" : pathname.startsWith(k)))
    .sort((a, b) => b.length - a.length)[0];
  return route ? [...HINTS[route], ...HINTS["*"]] : HINTS["*"];
}

export function isQuietRoute(pathname: string): boolean {
  return HINT_QUIET_ROUTES.some((q) => (q.endsWith("/") ? pathname.startsWith(q) : pathname === q || pathname.startsWith(q + "/")));
}

// ---- Intro ------------------------------------------------------------------

export const INTRO_LINES = [
  "I'm Skye. I'll turn up now and then with a pointer — never while you're aiming.",
  "Switch me off any time under Settings → Your companion.",
] as const;
