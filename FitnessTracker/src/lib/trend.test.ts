import { describe, expect, it } from "vitest";
import { averageOver, trendSeries, weeklyRate } from "./trend";

describe("trendSeries", () => {
  it("starts at the first reading and smooths by alpha", () => {
    const t = trendSeries([
      { date: "2026-10-01", weightKg: 80 },
      { date: "2026-10-02", weightKg: 82 }, // +2 → trend +0.2
      { date: "2026-10-03", weightKg: 80 },
    ]);
    expect(t.map((p) => p.trendKg)).toEqual([80, 80.2, 80.2]);
  });
  it("is gap-aware: a 7-day gap applies 1-(0.9^7)", () => {
    const t = trendSeries([
      { date: "2026-10-01", weightKg: 80 },
      { date: "2026-10-08", weightKg: 78 },
    ]);
    // 1 - 0.9^7 = 0.5217 → 80 - 2*0.5217 = 78.96
    expect(t[1].trendKg).toBe(79);
  });
  it("sorts unordered input and drops zero readings", () => {
    const t = trendSeries([
      { date: "2026-10-03", weightKg: 81 },
      { date: "2026-10-01", weightKg: 0 },
      { date: "2026-10-02", weightKg: 80 },
    ]);
    expect(t.map((p) => p.date)).toEqual(["2026-10-02", "2026-10-03"]);
  });
});

describe("weeklyRate + averages", () => {
  const daily = Array.from({ length: 28 }, (_, i) => ({
    date: `2026-10-${String(i + 1).padStart(2, "0")}`,
    weightKg: 85 - i * 0.07, // ~0.5kg/week loss
  }));
  it("reports a negative weekly rate for a steady loss", () => {
    const rate = weeklyRate(trendSeries(daily));
    expect(rate).not.toBeNull();
    expect(rate!).toBeLessThan(-0.3);
    expect(rate!).toBeGreaterThan(-0.6);
  });
  it("needs two points", () => {
    expect(weeklyRate(trendSeries(daily.slice(0, 1)))).toBeNull();
  });
  it("averages over a window", () => {
    expect(averageOver(trendSeries(daily), 7)).toBeCloseTo(83.3, 0);
  });
});
