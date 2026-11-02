// Pure training maths: e1RM, progression, volume counting, PR detection.
// No DB access here so it can be unit-tested and reused by tools and dashboards.

export type SetType =
  | "warmup"
  | "working"
  | "top"
  | "backoff"
  | "drop"
  | "myo_activation"
  | "myo_mini"
  | "partials"
  | "failure";

export const SET_TYPES: SetType[] = [
  "warmup",
  "working",
  "top",
  "backoff",
  "drop",
  "myo_activation",
  "myo_mini",
  "partials",
  "failure",
];

/** Set types that count as a "hard set" for volume and e1RM purposes. */
export const HARD_SET_TYPES: ReadonlySet<SetType> = new Set(["working", "top", "backoff", "failure"]);

export type SetLike = {
  setType: SetType | string;
  weightKg: number;
  reps: number;
  rir?: number | null;
  partialReps?: number;
};

/** RIR-adjusted Epley. Only meaningful for ≤12 reps and hard sets. */
export function e1rm(weightKg: number, reps: number, rir: number | null | undefined = 0): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  const effectiveReps = reps + Math.max(0, Math.min(rir ?? 0, 5));
  return round(weightKg * (1 + effectiveReps / 30), 1);
}

export function setQualifiesForE1rm(s: SetLike): boolean {
  return HARD_SET_TYPES.has(s.setType as SetType) && s.reps > 0 && s.reps <= 12 && s.weightKg > 0;
}

export function bestE1rm(sets: SetLike[]): number {
  return sets.filter(setQualifiesForE1rm).reduce((best, s) => Math.max(best, e1rm(s.weightKg, s.reps, s.rir)), 0);
}

/** Working sets within ~4 RIR count as hard sets (Pelland 2024 style counting). */
export function isHardSet(s: SetLike): boolean {
  if (!HARD_SET_TYPES.has(s.setType as SetType)) return false;
  if (s.rir == null) return true;
  return s.rir <= 4;
}

export type ExerciseMuscles = { primaryMuscle: string; secondaryMuscles: string[] };

/**
 * Fractional set counting: primary muscle 1.0, each secondary 0.5.
 * Returns muscle -> hard sets.
 */
export function volumeByMuscle(
  rows: Array<{ set: SetLike; exercise: ExerciseMuscles }>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const { set, exercise } of rows) {
    if (!isHardSet(set)) continue;
    out[exercise.primaryMuscle] = (out[exercise.primaryMuscle] ?? 0) + 1;
    for (const m of exercise.secondaryMuscles) {
      out[m] = (out[m] ?? 0) + 0.5;
    }
  }
  return out;
}

export function volumeLoad(sets: SetLike[]): number {
  return sets.filter(isHardSet).reduce((acc, s) => acc + s.weightKg * s.reps, 0);
}

// ---------- progression ----------

export type ProgressionInput = {
  repMin: number;
  repMax: number;
  targetRir: number;
  incrementKg: number;
  /** Last session's hard sets for this exercise, in order. */
  lastSets: SetLike[];
};

export type Suggestion = {
  weightKg: number;
  reps: number;
  rir: number;
  reason: string;
};

/**
 * Double progression: hit the top of the rep range on every hard set at or
 * under target RIR -> add load and drop to the bottom of the range; otherwise
 * repeat the weight and aim for +1 rep on the weakest set.
 */
export function suggestNext(input: ProgressionInput): Suggestion {
  const hard = input.lastSets.filter(isHardSet);
  if (hard.length === 0) {
    return {
      weightKg: 0,
      reps: input.repMin,
      rir: input.targetRir,
      reason: "No history yet — pick a weight you can do for the bottom of the rep range with the target RIR.",
    };
  }
  const weight = Math.max(...hard.map((s) => s.weightKg));
  const atWeight = hard.filter((s) => s.weightKg === weight);
  const allTop = atWeight.every((s) => s.reps >= input.repMax && (s.rir ?? 0) >= 0);
  const tooHard = atWeight.some((s) => (s.rir ?? input.targetRir) <= input.targetRir && s.reps < input.repMin);

  if (allTop) {
    return {
      weightKg: roundToIncrement(weight + input.incrementKg, input.incrementKg),
      reps: input.repMin,
      rir: input.targetRir,
      reason: `Hit ${input.repMax} on every set at ${weight} kg — add ${input.incrementKg} kg and rebuild from ${input.repMin}.`,
    };
  }
  if (tooHard) {
    return {
      weightKg: roundToIncrement(Math.max(0, weight - input.incrementKg), input.incrementKg),
      reps: input.repMin,
      rir: input.targetRir,
      reason: `Fell under ${input.repMin} reps with RIR below target — drop ${input.incrementKg} kg and own the range.`,
    };
  }
  const minReps = Math.min(...atWeight.map((s) => s.reps));
  return {
    weightKg: weight,
    reps: Math.min(input.repMax, minReps + 1),
    rir: input.targetRir,
    reason: `Same ${weight} kg, aim for ${Math.min(input.repMax, minReps + 1)} on the weakest set.`,
  };
}

export function roundToIncrement(value: number, increment: number): number {
  if (increment <= 0) return round(value, 2);
  return round(Math.round(value / increment) * increment, 2);
}

// ---------- PRs ----------

export type PrType = "weight" | "e1rm" | "reps_at_weight" | "set_volume";

export type PrHit = { type: PrType; value: number; previous: number | null };

/** Compare a new set against prior history for the same exercise. */
export function detectPrs(newSet: SetLike, history: SetLike[]): PrHit[] {
  if (!HARD_SET_TYPES.has(newSet.setType as SetType)) return [];
  const prior = history.filter((s) => HARD_SET_TYPES.has(s.setType as SetType));
  const hits: PrHit[] = [];

  const prevMaxWeight = prior.length ? Math.max(...prior.map((s) => s.weightKg)) : null;
  if (newSet.weightKg > 0 && (prevMaxWeight === null || newSet.weightKg > prevMaxWeight)) {
    hits.push({ type: "weight", value: newSet.weightKg, previous: prevMaxWeight });
  }

  if (setQualifiesForE1rm(newSet)) {
    const prevE1rm = bestE1rm(prior);
    const nowE1rm = e1rm(newSet.weightKg, newSet.reps, newSet.rir);
    if (nowE1rm > prevE1rm) hits.push({ type: "e1rm", value: nowE1rm, previous: prior.length ? prevE1rm : null });
  }

  const sameWeight = prior.filter((s) => s.weightKg === newSet.weightKg);
  const prevRepsAtWeight = sameWeight.length ? Math.max(...sameWeight.map((s) => s.reps)) : null;
  if (newSet.weightKg > 0 && prevRepsAtWeight !== null && newSet.reps > prevRepsAtWeight) {
    hits.push({ type: "reps_at_weight", value: newSet.reps, previous: prevRepsAtWeight });
  }

  const prevSetVol = prior.length ? Math.max(...prior.map((s) => s.weightKg * s.reps)) : null;
  const nowVol = newSet.weightKg * newSet.reps;
  if (nowVol > 0 && prevSetVol !== null && nowVol > prevSetVol && !hits.some((h) => h.type === "weight")) {
    hits.push({ type: "set_volume", value: nowVol, previous: prevSetVol });
  }
  return hits;
}

// ---------- plates ----------

export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

/** Plates per side for a target total, given bar weight. */
export function platesPerSide(totalKg: number, barKg = 20, plates = DEFAULT_PLATES_KG): number[] {
  let perSide = (totalKg - barKg) / 2;
  if (perSide <= 0) return [];
  const out: number[] = [];
  for (const p of plates) {
    while (perSide >= p - 1e-9) {
      out.push(p);
      perSide = round(perSide - p, 3);
    }
  }
  return out;
}

export function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
