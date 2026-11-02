// Thin bridge so server code can feed DB rows into the pure training maths.
import type { SetRow } from "@/db/schema";
import { type SetLike } from "./training";

export { isHardSet, volumeByMuscle, volumeLoad, bestE1rm, e1rm } from "./training";

export function toSetLikeRow(s: SetRow): SetLike {
  return { setType: s.setType, weightKg: Number(s.weightKg), reps: s.reps, rir: s.rir, partialReps: s.partialReps };
}
