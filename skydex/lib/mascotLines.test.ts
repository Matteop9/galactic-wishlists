import { test } from "node:test";
import assert from "node:assert/strict";
import {
  captureLine,
  hintPool,
  isQuietRoute,
  pickBySeed,
  seedHash,
  CAPTURE_CHATTER_ONE_IN,
  CAPTURE_LINES,
  HINTS,
} from "./mascotLines.ts";

const none = { type: false, airline: false, origin: false, destination: false };
const base = { id: "x", discoveries: none, rarity: "common", specialLivery: null };

test("seedHash is stable and pickBySeed stays in range", () => {
  assert.equal(seedHash("abc"), seedHash("abc"));
  assert.notEqual(seedHash("abc"), seedHash("abd"));
  for (let i = 0; i < 50; i++) assert.ok(CAPTURE_LINES.repeat.includes(pickBySeed(CAPTURE_LINES.repeat, `id-${i}`)));
});

test("tier ≥ 2 always speaks; livery, first and legendary get their own line", () => {
  assert.equal(captureLine({ ...base, rarity: "rare" })?.pose, "celebrate");
  assert.equal(captureLine({ ...base, rarity: "legendary" })?.text, CAPTURE_LINES.legendary[0]);
  assert.equal(captureLine({ ...base, firstCatch: true })?.text, CAPTURE_LINES.first[0]);
  assert.equal(
    captureLine({ ...base, specialLivery: "Retro", discoveries: { ...none, livery: true } })?.text,
    CAPTURE_LINES.livery[0],
  );
});

test("ordinary catches speak about one in N, deterministically by id", () => {
  let spoke = 0;
  for (let i = 0; i < 300; i++) {
    const a = captureLine({ ...base, id: `s-${i}` });
    const b = captureLine({ ...base, id: `s-${i}` });
    assert.deepEqual(a, b);
    if (a) {
      spoke++;
      assert.equal(a.pose, "wave");
      assert.ok(CAPTURE_LINES.repeat.includes(a.text as (typeof CAPTURE_LINES.repeat)[number]));
    }
  }
  const expected = 300 / CAPTURE_CHATTER_ONE_IN;
  assert.ok(Math.abs(spoke - expected) < expected * 0.35, `spoke ${spoke}, expected ~${expected}`);
});

test("a new dimension on a quiet-tier catch draws from the new pool", () => {
  let sawNew = false;
  for (let i = 0; i < 100 && !sawNew; i++) {
    const l = captureLine({ ...base, id: `n-${i}`, discoveries: { ...none, type: true } });
    if (l) {
      assert.ok(CAPTURE_LINES.new.includes(l.text as (typeof CAPTURE_LINES.new)[number]));
      sawNew = true;
    }
  }
  assert.ok(sawNew);
});

test("hint pools merge route + general and quiet routes are respected", () => {
  assert.deepEqual(hintPool("/feed"), [...HINTS["/feed"], ...HINTS["*"]]);
  assert.deepEqual(hintPool("/u/matteo"), [...HINTS["/u/"], ...HINTS["*"]]);
  assert.deepEqual(hintPool("/nowhere"), HINTS["*"]);
  assert.deepEqual(hintPool("/"), [...HINTS["/"], ...HINTS["*"]]);
  assert.equal(isQuietRoute("/spot"), true);
  assert.equal(isQuietRoute("/s/abc"), true);
  assert.equal(isQuietRoute("/login"), true);
  assert.equal(isQuietRoute("/scrapbook"), false);
  assert.equal(isQuietRoute("/"), false);
});
