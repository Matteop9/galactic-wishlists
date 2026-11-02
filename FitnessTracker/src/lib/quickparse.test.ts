import { describe, expect, it } from "vitest";
import { quickParse, resolveQuickSet } from "./quickparse";

describe("quickParse", () => {
  it("parses WxR with RIR", () => {
    expect(quickParse("60x10")).toMatchObject({ weightKg: 60, reps: 10, rir: null, setType: "working" });
    expect(quickParse("60 x 10 @1")).toMatchObject({ weightKg: 60, reps: 10, rir: 1 });
    expect(quickParse("62.5kg 8 reps rir 2")).toMatchObject({ weightKg: 62.5, reps: 8, rir: 2 });
    expect(quickParse("100 for 5 1 left")).toMatchObject({ weightKg: 100, reps: 5, rir: 1 });
    expect(quickParse("bw x 12")).toMatchObject({ weightKg: 0, reps: 12 });
  });
  it("parses set types, partials and sides", () => {
    expect(quickParse("40x10 w")).toMatchObject({ setType: "warmup" });
    expect(quickParse("drop 45x8")).toMatchObject({ setType: "drop", weightKg: 45, reps: 8 });
    expect(quickParse("60x10 @0 +3p")).toMatchObject({ rir: 0, partialReps: 3 });
    expect(quickParse("20x12 L")).toMatchObject({ side: "L", weightKg: 20 });
  });
  it("parses carries and deltas", () => {
    expect(quickParse("same")).toMatchObject({ weightKg: null, reps: null });
    expect(quickParse("+2.5")).toMatchObject({ weightDelta: 2.5 });
    expect(quickParse("-5kg")).toMatchObject({ weightDelta: -5 });
    expect(quickParse("+1 rep")).toMatchObject({ repsDelta: 1 });
    expect(quickParse("10")).toMatchObject({ weightKg: null, reps: 10 });
    expect(quickParse("@1")).toMatchObject({ rir: 1, weightKg: null, reps: null });
  });
  it("rejects wordy input so it goes to the model", () => {
    expect(quickParse("how did I do on bench last week")).toBeNull();
    expect(quickParse("swap to dumbbells")).toBeNull();
    expect(quickParse("")).toBeNull();
    expect(quickParse("log 60kg for ten on the incline press")).toBeNull();
  });
});

describe("resolveQuickSet", () => {
  it("carries previous values and applies deltas", () => {
    const prev = { weightKg: 60, reps: 10 };
    expect(resolveQuickSet(quickParse("same")!, prev)).toEqual({ weightKg: 60, reps: 10 });
    expect(resolveQuickSet(quickParse("+2.5")!, prev)).toEqual({ weightKg: 62.5, reps: 10 });
    expect(resolveQuickSet(quickParse("9")!, prev)).toEqual({ weightKg: 60, reps: 9 });
    expect(resolveQuickSet(quickParse("same")!, null)).toBeNull();
  });
});
