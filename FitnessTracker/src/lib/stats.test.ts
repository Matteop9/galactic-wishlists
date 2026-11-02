import { describe, expect, it } from "vitest";
import { correlate, describeCorrelation, pearson, spearman, weekStartOf } from "./stats";

describe("weekStartOf", () => {
  it("returns the Monday", () => {
    expect(weekStartOf("2026-11-02")).toBe("2026-11-02"); // Monday
    expect(weekStartOf("2026-11-08")).toBe("2026-11-02"); // Sunday
    expect(weekStartOf("2026-11-04")).toBe("2026-11-02");
  });
});

describe("correlations", () => {
  it("pearson of a perfect line is 1", () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBe(1);
    expect(pearson([1, 2, 3, 4], [8, 6, 4, 2])).toBe(-1);
  });
  it("spearman handles ties and monotone curves", () => {
    expect(spearman([1, 2, 3, 4, 5], [1, 4, 9, 16, 25])).toBe(1);
    expect(spearman([1, 1, 2, 3], [1, 1, 2, 3])).toBe(1);
  });
  it("needs 8 pairs to be 'enough' and drops nulls", () => {
    const c = correlate([
      [1, 2],
      [2, null],
      [3, 6],
      [4, 8],
    ]);
    expect(c.n).toBe(3);
    expect(c.enough).toBe(false);
    expect(describeCorrelation("x", c)).toMatch(/not enough weeks/);
  });
  it("classifies strength", () => {
    const pairs: Array<[number, number]> = Array.from({ length: 10 }, (_, i) => [i, -i + (i % 2) * 0.5]);
    const c = correlate(pairs);
    expect(c.enough).toBe(true);
    expect(c.direction).toBe("negative");
    expect(c.strength).toBe("strong");
    expect(describeCorrelation("cardio vs weight", c)).toMatch(/strong negative/);
  });
});
