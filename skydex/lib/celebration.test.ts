import { test } from "node:test";
import assert from "node:assert/strict";
import { celebrationTier, celebrationHeadline } from "./celebration.ts";

const none = { type: false, airline: false, origin: false, destination: false };
const base = { discoveries: none, rarity: "common", specialLivery: null };

test("repeat common catch is tier 0", () => {
  assert.equal(celebrationTier(base), 0);
  assert.equal(celebrationHeadline(base, 0), "Caught!");
});

test("any new dimension is tier 1", () => {
  for (const k of ["type", "airline", "origin", "destination"] as const) {
    const r = { ...base, discoveries: { ...none, [k]: true } };
    assert.equal(celebrationTier(r), 1, k);
    assert.equal(celebrationHeadline(r, 1), "New discovery");
  }
});

test("rare exactly is tier 2; uncommon is not", () => {
  assert.equal(celebrationTier({ ...base, rarity: "uncommon" }), 0);
  assert.equal(celebrationTier({ ...base, rarity: "rare" }), 2);
  assert.equal(celebrationTier({ ...base, rarity: "epic" }), 2);
});

test("special livery alone is tier 2", () => {
  assert.equal(celebrationTier({ ...base, specialLivery: "Retro" }), 2);
});

test("new rarity tier alone is tier 2", () => {
  assert.equal(celebrationTier({ ...base, newRarityTier: true }), 2);
});

test("legendary is tier 3 with Legendary headline", () => {
  const r = { ...base, rarity: "legendary" };
  assert.equal(celebrationTier(r), 3);
  assert.equal(celebrationHeadline(r, 3), "Legendary");
});

test("first catch overrides a common repeat and wins the headline", () => {
  const r = { ...base, firstCatch: true };
  assert.equal(celebrationTier(r), 3);
  assert.equal(celebrationHeadline(r, 3), "First catch");
});

test("unknown rarity string degrades safely", () => {
  assert.equal(celebrationTier({ ...base, rarity: "mythic" }), 0);
});
