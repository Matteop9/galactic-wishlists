// 24-hour Europe traffic snapshot — the measurement behind data-driven rarity.
//
// Every 30 minutes it queries the live ADS-B feed at 9 fixed points whose
// 250 nm circles cover core Europe, and accumulates the set of DISTINCT
// AIRFRAMES (ICAO hex) seen per aircraft type code. Counting distinct
// airframes per day — not raw samples — is the point: a helicopter loitering
// over one city for 6 hours counts once, exactly like an A320 that crossed
// the continent once. "How many individual aircraft of this type were in
// European skies today" is the scarcity a spotter actually experiences.
//
// Primary source is adsb.lol (ODbL — commercial-safe, same readsb JSON shape
// as airplanes.live, which falls back). Zero FR24 credits.
//
// Resumable: state persists to scripts/.rarity-state.json after every round;
// Ctrl+C / crash / reboot and re-run `node scripts/rarity-snapshot.mjs` to
// continue. Finishes after 48 rounds (24 h of half-hourly samples), then run
// `node scripts/rarity-apply.mjs` to see the analysis + generated SQL.

import { readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const STATE_FILE = join(dirname(fileURLToPath(import.meta.url)), ".rarity-state.json");
const ROUNDS_TARGET = 48;
const ROUND_INTERVAL_MS = 30 * 60 * 1000;

// name, lat, lon — 250 nm (~463 km) circles centred to tile core Europe.
const POINTS = [
  ["UK+Ireland", 53.5, -3.0],
  ["France", 47.5, 2.5],
  ["Iberia", 40.0, -3.5],
  ["Germany+Benelux", 51.0, 7.5],
  ["Alps+Italy", 44.5, 10.5],
  ["Scandinavia", 58.5, 13.0],
  ["Poland+Baltics", 53.0, 20.0],
  ["Balkans+Greece", 41.5, 22.5],
  ["Turkey W", 39.5, 30.0],
];
const RADIUS_NM = 250;

const SOURCES = [
  (lat, lon) => `https://api.adsb.lol/v2/point/${lat}/${lon}/${RADIUS_NM}`,
  (lat, lon) => `https://api.airplanes.live/v2/point/${lat}/${lon}/${RADIUS_NM}`,
];

function loadState() {
  if (existsSync(STATE_FILE)) {
    const s = JSON.parse(readFileSync(STATE_FILE, "utf8"));
    // hex arrays -> Sets for the working copy
    for (const t of Object.values(s.types)) t.hexes = new Set(t.hexes);
    return s;
  }
  return { startedAt: new Date().toISOString(), rounds: [], types: {} };
}

function saveState(state) {
  const out = {
    ...state,
    types: Object.fromEntries(
      Object.entries(state.types).map(([code, t]) => [
        code,
        { ...t, hexes: [...t.hexes] },
      ]),
    ),
  };
  // write-then-rename so a mid-write crash can't corrupt the state
  writeFileSync(STATE_FILE + ".tmp", JSON.stringify(out));
  renameSync(STATE_FILE + ".tmp", STATE_FILE);
}

async function fetchPoint(lat, lon) {
  for (const mk of SOURCES) {
    try {
      const res = await fetch(mk(lat, lon), { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) continue;
      const json = await res.json();
      if (Array.isArray(json.ac)) return json.ac;
    } catch {
      /* try next source */
    }
  }
  return null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function doRound(state) {
  const roundHexes = new Set(); // dedupe across overlapping circles within a round
  let ok = 0;
  for (const [name, lat, lon] of POINTS) {
    const ac = await fetchPoint(lat, lon);
    if (ac === null) {
      console.log(`    ${name}: FAILED (both sources)`);
      continue;
    }
    ok++;
    for (const a of ac) {
      const hex = String(a.hex ?? "").trim();
      const type = String(a.t ?? "").trim().toUpperCase();
      if (!hex || !type || a.alt_baro === "ground") continue;
      if (roundHexes.has(hex)) continue;
      roundHexes.add(hex);
      const entry = (state.types[type] ??= {
        hexes: new Set(),
        military: 0,
        adsbCats: {},
      });
      if (!entry.hexes.has(hex)) {
        entry.hexes.add(hex);
        if (((a.dbFlags ?? 0) & 1) === 1) entry.military++;
        const cat = String(a.category ?? "").toUpperCase();
        if (cat) entry.adsbCats[cat] = (entry.adsbCats[cat] ?? 0) + 1;
      }
    }
    await sleep(1500); // be polite to the free feeds
  }
  state.rounds.push({ at: new Date().toISOString(), points_ok: ok, airborne: roundHexes.size });
  saveState(state);
  const totalAirframes = Object.values(state.types).reduce((n, t) => n + t.hexes.size, 0);
  console.log(
    `[${new Date().toISOString()}] round ${state.rounds.length}/${ROUNDS_TARGET}: ` +
      `${roundHexes.size} airborne now · ${Object.keys(state.types).length} types / ` +
      `${totalAirframes} distinct airframes so far`,
  );
}

const state = loadState();
console.log(
  state.rounds.length
    ? `Resuming snapshot started ${state.startedAt} — ${state.rounds.length}/${ROUNDS_TARGET} rounds done.`
    : `Starting fresh 24h snapshot (${ROUNDS_TARGET} rounds, one every 30 min). Leave this running.`,
);

while (state.rounds.length < ROUNDS_TARGET) {
  const t0 = Date.now();
  await doRound(state);
  if (state.rounds.length >= ROUNDS_TARGET) break;
  const wait = Math.max(0, ROUND_INTERVAL_MS - (Date.now() - t0));
  await sleep(wait);
}

console.log(`Snapshot complete (${ROUNDS_TARGET} rounds). Now run: node scripts/rarity-apply.mjs`);
