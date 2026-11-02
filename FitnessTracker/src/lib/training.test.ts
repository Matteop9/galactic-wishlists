import { describe, expect, it } from "vitest";
import { bestE1rm, detectPrs, e1rm, isHardSet, platesPerSide, suggestNext, volumeByMuscle, volumeLoad } from "./training";

describe("e1rm", () => {
  it("uses RIR-adjusted Epley", () => {
    expect(e1rm(100, 5, 0)).toBe(116.7);
    expect(e1rm(100, 5, 2)).toBe(123.3);
    expect(e1rm(60, 10, 1)).toBe(82);
  });
  it("ignores non-qualifying sets", () => {
    expect(bestE1rm([{ setType: "warmup", weightKg: 100, reps: 5 }])).toBe(0);
    expect(bestE1rm([{ setType: "working", weightKg: 40, reps: 20 }])).toBe(0);
    expect(bestE1rm([{ setType: "working", weightKg: 100, reps: 5, rir: 0 }])).toBe(116.7);
  });
});

describe("hard sets + volume", () => {
  it("counts fractional sets", () => {
    const bench = { primaryMuscle: "chest", secondaryMuscles: ["triceps", "front_delts"] };
    const v = volumeByMuscle([
      { set: { setType: "working", weightKg: 60, reps: 10, rir: 1 }, exercise: bench },
      { set: { setType: "working", weightKg: 60, reps: 10, rir: 1 }, exercise: bench },
      { set: { setType: "warmup", weightKg: 40, reps: 10 }, exercise: bench },
      { set: { setType: "working", weightKg: 60, reps: 10, rir: 5 }, exercise: bench },
    ]);
    expect(v).toEqual({ chest: 2, triceps: 1, front_delts: 1 });
  });
  it("volume load sums hard sets only", () => {
    expect(
      volumeLoad([
        { setType: "working", weightKg: 60, reps: 10 },
        { setType: "warmup", weightKg: 40, reps: 10 },
        { setType: "drop", weightKg: 40, reps: 8 },
      ]),
    ).toBe(600);
    expect(isHardSet({ setType: "myo_mini", weightKg: 20, reps: 4 })).toBe(false);
  });
});

describe("suggestNext (double progression)", () => {
  const base = { repMin: 8, repMax: 12, targetRir: 1, incrementKg: 2.5 };
  it("adds load when every set hits the top of the range", () => {
    const s = suggestNext({
      ...base,
      lastSets: [
        { setType: "working", weightKg: 60, reps: 12, rir: 1 },
        { setType: "working", weightKg: 60, reps: 12, rir: 0 },
      ],
    });
    expect(s.weightKg).toBe(62.5);
    expect(s.reps).toBe(8);
  });
  it("repeats weight and asks for +1 rep otherwise", () => {
    const s = suggestNext({
      ...base,
      lastSets: [
        { setType: "working", weightKg: 60, reps: 12, rir: 1 },
        { setType: "working", weightKg: 60, reps: 9, rir: 0 },
      ],
    });
    expect(s.weightKg).toBe(60);
    expect(s.reps).toBe(10);
  });
  it("drops load when under the range at RIR 0", () => {
    const s = suggestNext({
      ...base,
      lastSets: [{ setType: "working", weightKg: 60, reps: 6, rir: 0 }],
    });
    expect(s.weightKg).toBe(57.5);
  });
  it("handles no history", () => {
    expect(suggestNext({ ...base, lastSets: [] }).weightKg).toBe(0);
  });
});

describe("detectPrs", () => {
  const history = [
    { setType: "working", weightKg: 60, reps: 10, rir: 1 },
    { setType: "working", weightKg: 62.5, reps: 8, rir: 0 },
  ];
  it("flags weight, e1rm and reps-at-weight PRs", () => {
    const hits = detectPrs({ setType: "working", weightKg: 65, reps: 8, rir: 0 }, history);
    expect(hits.map((h) => h.type)).toEqual(["weight", "e1rm"]);
    const reps = detectPrs({ setType: "working", weightKg: 60, reps: 12, rir: 1 }, history);
    expect(reps.map((h) => h.type)).toContain("reps_at_weight");
  });
  it("ignores warm-ups and non-PRs", () => {
    expect(detectPrs({ setType: "warmup", weightKg: 100, reps: 5 }, history)).toEqual([]);
    expect(detectPrs({ setType: "working", weightKg: 60, reps: 8, rir: 2 }, history)).toEqual([]);
  });
});

describe("platesPerSide", () => {
  it("builds 100kg on a 20kg bar", () => {
    expect(platesPerSide(100)).toEqual([25, 15]);
    expect(platesPerSide(62.5)).toEqual([20, 1.25]);
    expect(platesPerSide(20)).toEqual([]);
  });
});
