import { describe, expect, it } from "vitest";
import { normaliseName, parseHae } from "./hae";

const payload = {
  data: {
    metrics: [
      { name: "weight_body_mass", units: "kg", data: [{ date: "2026-11-01 07:12:00 +0000", qty: 84.35, source: "Renpho Health" }] },
      { name: "body_fat_percentage", units: "%", data: [{ date: "2026-11-01 07:12:00 +0000", qty: 21.4, source: "Renpho Health" }] },
      { name: "lean_body_mass", units: "lb", data: [{ date: "2026-11-01 07:12:00 +0000", qty: 146.2 }] },
      { name: "step_count", units: "count", data: [{ date: "2026-11-01 00:00:00 +0000", qty: 8412.6, source: "iPhone" }] },
      { name: "active_energy", units: "kJ", data: [{ date: "2026-11-01 00:00:00 +0000", qty: 2092 }] },
      { name: "walking_running_distance", units: "mi", data: [{ date: "2026-11-01 00:00:00 +0000", qty: 3.1 }] },
      { name: "sleep_analysis", units: "hr", data: [{ date: "2026-11-01 00:00:00 +0000", totalSleep: 7.25, deep: 1.1 }] },
      { name: "heart_rate", units: "bpm", data: [{ date: "2026-11-01 00:00:00 +0000", Avg: 70 }] },
    ],
  },
};

describe("parseHae", () => {
  it("maps body + daily metrics with unit conversion and London dates", () => {
    const r = parseHae(payload);
    expect(r.body).toEqual([{ date: "2026-11-01", source: "hae", weightKg: 84.35, bodyFatPct: 21.4, leanMassKg: 66.32 }]);
    expect(r.daily).toEqual([{ date: "2026-11-01", steps: 8413, activeKcal: 500, walkingKm: 4.99, sleepHours: 7.3 }]);
    expect(r.ignored).toEqual(["heart_rate"]);
  });
  it("accepts the doc's spelling of weight", () => {
    expect(normaliseName("Weight &amp; Body Mass")).toBe("weight_body_mass");
    const r = parseHae({ data: { metrics: [{ name: "Weight & Body Mass", units: "kg", data: [{ date: "2026-11-02 06:00:00 +0000", qty: 84 }] }] } });
    expect(r.body[0].weightKg).toBe(84);
  });
  it("sums steps across multiple entries on the same day", () => {
    const r = parseHae({
      data: { metrics: [{ name: "step_count", data: [{ date: "2026-11-02 08:00:00 +0000", qty: 1000 }, { date: "2026-11-02 18:00:00 +0000", qty: 2500 }] }] },
    });
    expect(r.daily[0].steps).toBe(3500);
  });
});
