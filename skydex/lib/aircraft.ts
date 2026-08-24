// Live aircraft data via a provider FAILOVER CHAIN: adsb.lol → adsb.fi → airplanes.live.
//
// All three serve the same readsb-style JSON, so a provider is just a name plus
// two URL builders. The order is deliberate (V4 commercial-licensing gate):
//  1. adsb.lol — PRIMARY. ODbL-licensed (commercial use OK with attribution) —
//     the commercial-safe spine the store launch needs. Its records carry no
//     `desc` (human-readable type name), so typeDesc falls back to our own
//     license-clean lib/aircraftTypes map — the same map the persisted card has
//     used since v0.2.7, which is what un-blocked adsb.lol as primary.
//  2. adsb.fi — fallback (primary v0.3.17→v0.4.0). Community open data with a
//     non-commercial lean and a ≤1 req/s ask; fallback-only traffic fits both.
//  3. airplanes.live — last resort (primary v0.2.2→v0.3.16). Its API has 403'd
//     unregistered consumers since 2026-08-14 (the outage behind v0.3.17); kept
//     in the chain in case access is restored or granted per-project.
// A provider that errors goes into a cooldown so polls during an outage fail
// over immediately instead of re-paying its timeout every sweep. Two tiers,
// because they mean different things:
//  - hard failure (403/5xx/timeout/DNS) → 60 s: the provider is likely down.
//  - 429 → 5 s: back-pressure, not an outage. Measured 2026-08-24: adsb.lol
//    rate-limits ~1 req/s per IP with a small burst, which one active spotter's
//    sweep + fast-poll can graze — a 60 s exile per 429 would push most traffic
//    onto the non-commercial fallbacks and defeat the licensing point.
// Cooldowns are per-instance state (same trade-off as the FR24 airline cache).
// If concurrent spotters ever make 429s the norm, the roadmap fix is one shared
// server-side region poll fanned out to nearby users — not a longer cooldown.
//
// OpenSky was removed earlier (v0.1.18): its terms require a written licence for
// live-product use, and it firewalls datacenter IPs (never served production).

import { fetch as undiciFetch, Agent } from "undici";
import { haversineMeters } from "@/lib/geo";
import { aircraftTypeName } from "@/lib/aircraftTypes";

// Force IPv4 — some upstreams advertise IPv6 that Vercel's egress can't reach.
// headers/body timeouts too: connect.timeout only covers the handshake, and a
// stalled response would otherwise hang the polled /api/flights route.
const dispatcher = new Agent({
  connect: { family: 4, timeout: 12_000 },
  headersTimeout: 12_000,
  bodyTimeout: 12_000,
});

const FT_TO_M = 0.3048;
const KT_TO_MS = 0.514444;

type Provider = {
  name: string;
  point: (lat: number, lon: number, nm: number) => string;
  hex: (hex: string) => string;
};

const PROVIDERS: Provider[] = [
  {
    name: "adsb.lol",
    point: (lat, lon, nm) => `https://api.adsb.lol/v2/lat/${lat}/lon/${lon}/dist/${nm}`,
    hex: (h) => `https://api.adsb.lol/v2/hex/${encodeURIComponent(h)}`,
  },
  {
    name: "adsb.fi",
    point: (lat, lon, nm) =>
      `https://opendata.adsb.fi/api/v2/lat/${lat}/lon/${lon}/dist/${nm}`,
    hex: (h) => `https://opendata.adsb.fi/api/v2/hex/${encodeURIComponent(h)}`,
  },
  {
    name: "airplanes.live",
    point: (lat, lon, nm) => `https://api.airplanes.live/v2/point/${lat}/${lon}/${nm}`,
    hex: (h) => `https://api.airplanes.live/v2/hex/${encodeURIComponent(h)}`,
  },
];

// See the header note: hard failures sit out 60 s, 429s only 5 s. If every
// provider is cooling down we try them all anyway — availability beats latency.
const ERROR_COOLDOWN_MS = 60_000;
const RATE_COOLDOWN_MS = 5_000;
const providerDownUntil = new Map<string, number>();

function providersToTry(): Provider[] {
  const now = Date.now();
  const up = PROVIDERS.filter((p) => (providerDownUntil.get(p.name) ?? 0) <= now);
  return up.length ? up : PROVIDERS;
}

class ProviderError extends Error {
  constructor(
    url: string,
    readonly status: number | null, // null = network error, no HTTP status
    cause?: unknown,
  ) {
    super(status != null ? `${url} responded ${status}` : `${url} failed`, { cause });
  }
}

function cooldownFor(status: number | null): number {
  return status === 429 ? RATE_COOLDOWN_MS : ERROR_COOLDOWN_MS;
}

export type Aircraft = {
  icao24: string;
  callsign: string;
  lat: number;
  lon: number;
  altM: number | null; // null = no altitude broadcast (don't fake ground level)
  registration: string | null;
  aircraftType: string | null; // ICAO type code, e.g. B738
  typeDesc: string | null; // e.g. BOEING 737-800
  track: number | null;
  velocityMs: number | null;
  seenPosS: number | null; // seconds since the position fix (readsb seen_pos)
  adsbCategory: string | null; // ADS-B emitter category (A1 light … A5 heavy, A7 rotorcraft)
  military: boolean; // readsb dbFlags bit 0
};

export type AircraftResult = { aircraft: Aircraft[]; source: string };

// Shared shape of the readsb-style JSON all three providers serve. The array is
// keyed `ac` almost everywhere but `aircraft` on adsb.fi's point endpoint —
// mapReadsb accepts both.
type AcRecord = {
  hex?: string;
  flight?: string;
  r?: string;
  t?: string;
  desc?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | "ground";
  alt_geom?: number;
  gs?: number;
  track?: number;
  seen_pos?: number; // seconds since the position was last updated
  category?: string; // ADS-B emitter category, e.g. "A3"
  dbFlags?: number; // bit 0 = military, per readsb's aircraft DB
};

// adsb.lol serves no `desc` at all; the others can miss it per-aircraft.
function typeDescOf(a: AcRecord): string | null {
  return a.desc ?? aircraftTypeName(a.t ?? null);
}

function mapReadsb(json: { ac?: AcRecord[]; aircraft?: AcRecord[] }): Aircraft[] {
  return (json.ac ?? json.aircraft ?? [])
    .filter(
      (a) =>
        typeof a.lat === "number" &&
        typeof a.lon === "number" &&
        a.alt_baro !== "ground",
    )
    .map((a) => {
      const altFt =
        typeof a.alt_geom === "number"
          ? a.alt_geom
          : typeof a.alt_baro === "number"
            ? a.alt_baro
            : null;
      return {
        icao24: String(a.hex ?? "").trim(),
        callsign: String(a.flight ?? "").trim(),
        lat: a.lat as number,
        lon: a.lon as number,
        altM: altFt != null ? altFt * FT_TO_M : null,
        registration: a.r ?? null,
        aircraftType: a.t ?? null,
        typeDesc: typeDescOf(a),
        track: a.track ?? null,
        velocityMs: typeof a.gs === "number" ? a.gs * KT_TO_MS : null,
        seenPosS: typeof a.seen_pos === "number" ? a.seen_pos : null,
        adsbCategory: a.category ?? null,
        military: ((a.dbFlags ?? 0) & 1) === 1,
      };
    });
}

async function fromReadsbApi(url: string): Promise<Aircraft[]> {
  let res;
  try {
    res = await undiciFetch(url, { dispatcher });
  } catch (err) {
    throw new ProviderError(url, null, err);
  }
  if (!res.ok) throw new ProviderError(url, res.status);
  return mapReadsb((await res.json()) as { ac?: AcRecord[]; aircraft?: AcRecord[] });
}

/**
 * Fetch live aircraft within radiusKm of a point, trying each provider in
 * chain order. A valid-but-empty answer is a real answer (quiet sky), NOT a
 * failover trigger — only an error/timeout moves down the chain.
 */
export async function fetchAircraftNear(
  lat: number,
  lon: number,
  radiusKm: number,
): Promise<AircraftResult> {
  const nm = Math.min(Math.max(Math.round(radiusKm / 1.852), 1), 250);
  let lastErr: unknown = null;
  for (const p of providersToTry()) {
    try {
      const aircraft = await fromReadsbApi(p.point(lat, lon, nm));
      return { aircraft, source: p.name };
    } catch (err) {
      const status = err instanceof ProviderError ? err.status : null;
      providerDownUntil.set(p.name, Date.now() + cooldownFor(status));
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("All live-data providers failed");
}

export type HexLookup = {
  found: boolean; // upstream answered and the hex was airborne
  unavailable: boolean; // upstream error/outage — no verdict either way
  source: string | null; // provider that supplied the verdict (null when unavailable)
  aircraftType: string | null;
  typeDesc: string | null;
  registration: string | null;
  callsign: string | null;
  lat: number | null;
  lon: number | null;
  altM: number | null;
  track: number | null;
  velocityMs: number | null;
  seenPosS: number | null; // seconds since the position fix
  adsbCategory: string | null;
  military: boolean;
};

const HEX_EMPTY: HexLookup = {
  found: false,
  unavailable: false,
  source: null,
  aircraftType: null,
  typeDesc: null,
  registration: null,
  callsign: null,
  lat: null,
  lon: null,
  altM: null,
  track: null,
  velocityMs: null,
  seenPosS: null,
  adsbCategory: null,
  military: false,
};

// Resolve identity + live position for a single hex. Used at capture time to
// (a) backfill type/registration when the polled candidate lacked them and
// (b) verify server-side that the claimed aircraft really is airborne where the
// client says it is. Distinguishes "upstream says not airborne" (found: false)
// from "upstream unreachable" (unavailable: true) so verification can be strict
// on the former and lenient on the latter.
//
// Chain semantics differ from the sweep on purpose: an EMPTY answer here falls
// through to the next provider for a second opinion, because a false "not
// airborne" marks an honest catch unverified — coverage gaps differ between
// networks and the extra call is rare (only when the primary can't see the
// plane). The verdict reported is the first positioned record found, else the
// first provider that answered at all; unavailable only when every provider
// errored.
export async function lookupLiveByHex(hex: string | null): Promise<HexLookup> {
  const h = (hex ?? "").trim();
  if (!h) return HEX_EMPTY;

  let answered: HexLookup | null = null; // best verdict so far without a position
  for (const p of providersToTry()) {
    let json: { ac?: AcRecord[]; aircraft?: AcRecord[] };
    try {
      const res = await undiciFetch(p.hex(h), { dispatcher });
      if (!res.ok) {
        providerDownUntil.set(p.name, Date.now() + cooldownFor(res.status));
        continue;
      }
      json = (await res.json()) as { ac?: AcRecord[]; aircraft?: AcRecord[] };
    } catch {
      providerDownUntil.set(p.name, Date.now() + cooldownFor(null));
      continue;
    }
    const recs = json.ac ?? json.aircraft ?? [];
    const rec =
      recs.find((a) => typeof a.lat === "number" && a.t) ??
      recs.find((a) => typeof a.lat === "number") ??
      recs[0];
    if (!rec) {
      answered ??= { ...HEX_EMPTY, source: p.name };
      continue;
    }
    const altFt =
      typeof rec.alt_geom === "number"
        ? rec.alt_geom
        : typeof rec.alt_baro === "number"
          ? rec.alt_baro
          : null;
    const mapped: HexLookup = {
      found: true,
      unavailable: false,
      source: p.name,
      aircraftType: rec.t ?? null,
      typeDesc: typeDescOf(rec),
      registration: rec.r ?? null,
      callsign: String(rec.flight ?? "").trim() || null,
      lat: typeof rec.lat === "number" ? rec.lat : null,
      lon: typeof rec.lon === "number" ? rec.lon : null,
      altM: altFt != null ? altFt * FT_TO_M : null,
      track: typeof rec.track === "number" ? rec.track : null,
      velocityMs: typeof rec.gs === "number" ? rec.gs * KT_TO_MS : null,
      seenPosS: typeof rec.seen_pos === "number" ? rec.seen_pos : null,
      adsbCategory: rec.category ?? null,
      military: ((rec.dbFlags ?? 0) & 1) === 1,
    };
    if (mapped.lat != null && mapped.lon != null) return mapped;
    answered ??= mapped; // record with no position — keep looking for a better one
  }
  return answered ?? { ...HEX_EMPTY, unavailable: true };
}

// Re-exported so callers can dedupe by distance if needed.
export { haversineMeters };
