// Gym-floor fast path: terse set logs parsed locally with no model call.
// Grammar (case-insensitive, flexible spacing):
//   "60x10"  "60 x 10 @1"  "60x10 rir 2"  "60kg 10 reps 1 rir"  "bw x 12"
//   "same"  "+2.5"  "-5"  "+1 rep"  "10" (reps only, same weight)
//   suffixes: "w" / "warmup", "drop", "myo", "lp" / "partials", "+3p" (partial reps), "L"/"R"

import type { SetType } from "./training";

export type QuickSet = {
  weightKg: number | null; // null = carry previous
  weightDelta?: number;
  reps: number | null; // null = carry previous
  repsDelta?: number;
  rir: number | null;
  setType: SetType;
  partialReps: number;
  side: "L" | "R" | null;
};

const TYPE_WORDS: Record<string, SetType> = {
  w: "warmup",
  wu: "warmup",
  warmup: "warmup",
  warm: "warmup",
  drop: "drop",
  ds: "drop",
  myo: "myo_mini",
  top: "top",
  backoff: "backoff",
  bo: "backoff",
  lp: "partials",
  partials: "partials",
  fail: "failure",
  failure: "failure",
};

export function quickParse(raw: string): QuickSet | null {
  let s = raw.trim().toLowerCase();
  if (!s || s.length > 40) return null;
  // Must look like numbers/shorthand only — anything wordy goes to the model.
  if (/[a-z]{6,}/.test(s.replace(/warmup|partials|failure|backoff/g, ""))) return null;

  const out: QuickSet = { weightKg: null, reps: null, rir: null, setType: "working", partialReps: 0, side: null };

  // rir: "@1", "rir 1", "1 rir", "1 left"
  const rir = s.match(/@\s*(\d)|rir\s*(\d)|(\d)\s*rir|(\d)\s*left/);
  if (rir) {
    out.rir = +(rir[1] ?? rir[2] ?? rir[3] ?? rir[4]);
    s = s.replace(rir[0], " ");
  }
  // side
  const side = s.match(/(?:^|\s)(l|r|left|right)(?:$|\s)/);
  if (side) {
    out.side = side[1].startsWith("l") ? "L" : "R";
    s = s.replace(side[0], " ");
  }
  // set type words
  for (const [word, type] of Object.entries(TYPE_WORDS)) {
    const re = new RegExp(`(?:^|\\s)${word}(?:$|\\s)`);
    if (re.test(s)) {
      out.setType = type;
      s = s.replace(re, " ");
    }
  }
  // partial reps: "+3p" or "3p"
  const partials = s.match(/\+?(\d+)\s*p(?:artials?)?(?:$|\s)/);
  if (partials) {
    out.partialReps = +partials[1];
    s = s.replace(partials[0], " ");
  }
  s = s.trim();

  if (s === "same" || s === "again" || s === "") {
    return s === "" && out.rir === null && out.partialReps === 0 && out.setType === "working" && !out.side ? null : out;
  }

  // weight delta only: "+2.5", "-5", "+2.5kg"
  const delta = s.match(/^([+-]\d+(?:\.\d+)?)\s*(?:kg)?$/);
  if (delta) {
    out.weightDelta = +delta[1];
    return out;
  }
  // reps delta: "+1 rep", "+1r"
  const repsDelta = s.match(/^([+-]\d+)\s*(?:reps?|r)$/);
  if (repsDelta) {
    out.repsDelta = +repsDelta[1];
    return out;
  }

  // "WxR" forms
  const wx = s.match(/^(bw|\d+(?:\.\d+)?)\s*(?:kg)?\s*(?:x|\*|for)\s*(\d+)\s*(?:reps?|r)?$/);
  if (wx) {
    out.weightKg = wx[1] === "bw" ? 0 : +wx[1];
    out.reps = +wx[2];
    return out;
  }
  // "60kg 10 reps" / "60 10"
  const sp = s.match(/^(bw|\d+(?:\.\d+)?)\s*(?:kg)\s*(\d+)\s*(?:reps?|r)?$/) ?? s.match(/^(bw|\d+(?:\.\d+)?)\s+(\d+)$/);
  if (sp) {
    out.weightKg = sp[1] === "bw" ? 0 : +sp[1];
    out.reps = +sp[2];
    return out;
  }
  // reps only: "10", "10 reps"
  const ro = s.match(/^(\d+)\s*(?:reps?|r)?$/);
  if (ro) {
    out.reps = +ro[1];
    return out;
  }
  return null;
}

/** Resolve carried values against the previous set on the same exercise. */
export function resolveQuickSet(q: QuickSet, prev: { weightKg: number; reps: number } | null): { weightKg: number; reps: number } | null {
  let weightKg = q.weightKg;
  let reps = q.reps;
  if (weightKg === null) {
    if (!prev) return null;
    weightKg = prev.weightKg + (q.weightDelta ?? 0);
  }
  if (reps === null) {
    if (!prev) return null;
    reps = prev.reps + (q.repsDelta ?? 0);
  }
  if (reps <= 0 || weightKg < 0) return null;
  return { weightKg, reps };
}
