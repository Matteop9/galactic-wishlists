// Live aircraft data from a SINGLE source: airplanes.live.
//
// We deliberately use one provider for every live field (position, ICAO type
// code, registration, AND the human-readable type description). The previous
// adsb.lol-primary / airplanes.live-fallback chain produced inconsistent results:
// adsb.lol returns the type code but `desc = null` for every aircraft, so whenever
// it answered, friendly type names degraded to bare codes (e.g. "B788" instead of
// "787-8 Dreamliner"). airplanes.live carries the full `desc`, so standardising on
// it makes enrichment consistent regardless of which aircraft is overhead.
//
// LICENSING NOTE (FR24-acquisition goal): airplanes.live's free tier is
// non-commercial; a paid tier exists for commercial use. adsb.lol (ODbL) was the
// commercial-safe option but lacks descriptions. This is a known trade-off, chosen
// for data consistency — see research/data-licences.md. Revisit before any
// commercial launch / acquisition (take their paid tier, or re-add adsb.lol as a
// position source with descriptions derived from the reference universe).
//
// OpenSky was removed earlier (v0.1.18): its terms require a written licence for
// live-product use, and it firewalls datacenter IPs (never served production).

import { fetch as undiciFetch, Agent } from "undici";
import { haversineMeters } from "@/lib/geo";

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

// Shared shape of the readsb-style JSON used by airplanes.live and adsb.lol.
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

function mapReadsb(json: { ac?: AcRecord[] }): Aircraft[] {
  return (json.ac ?? [])
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
        typeDesc: a.desc ?? null,
        track: a.track ?? null,
        velocityMs: typeof a.gs === "number" ? a.gs * KT_TO_MS : null,
        seenPosS: typeof a.seen_pos === "number" ? a.seen_pos : null,
        adsbCategory: a.category ?? null,
        military: ((a.dbFlags ?? 0) & 1) === 1,
      };
    });
}

async function fromReadsbApi(url: string): Promise<Aircraft[]> {
  const res = await undiciFetch(url, { dispatcher });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  return mapReadsb((await res.json()) as { ac?: AcRecord[] });
}

/** Fetch live aircraft within radiusKm of a point from airplanes.live. */
export async function fetchAircraftNear(
  lat: number,
  lon: number,
  radiusKm: number,
): Promise<AircraftResult> {
  const nm = Math.min(Math.max(Math.round(radiusKm / 1.852), 1), 250);
  const aircraft = await fromReadsbApi(
    `https://api.airplanes.live/v2/point/${lat}/${lon}/${nm}`,
  );
  return { aircraft, source: "airplanes.live" };
}

export type HexLookup = {
  found: boolean; // upstream answered and the hex was airborne
  unavailable: boolean; // upstream error/outage — no verdict either way
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

// Resolve identity + live position for a single hex from airplanes.live. Used at
// capture time to (a) backfill type/registration when the polled candidate lacked
// them and (b) verify server-side that the claimed aircraft really is airborne
// where the client says it is. Distinguishes "upstream says not airborne" (found:
// false) from "upstream unreachable" (unavailable: true) so verification can be
// strict on the former and lenient on the latter.
export async function lookupLiveByHex(hex: string | null): Promise<HexLookup> {
  const h = (hex ?? "").trim();
  if (!h) return HEX_EMPTY;

  try {
    const res = await undiciFetch(
      `https://api.airplanes.live/v2/hex/${encodeURIComponent(h)}`,
      { dispatcher },
    );
    if (!res.ok) return { ...HEX_EMPTY, unavailable: true };
    const json = (await res.json()) as { ac?: AcRecord[] };
    const rec =
      (json.ac ?? []).find((a) => typeof a.lat === "number" && a.t) ??
      (json.ac ?? []).find((a) => typeof a.lat === "number") ??
      (json.ac ?? [])[0];
    if (rec) {
      const altFt =
        typeof rec.alt_geom === "number"
          ? rec.alt_geom
          : typeof rec.alt_baro === "number"
            ? rec.alt_baro
            : null;
      return {
        found: true,
        unavailable: false,
        aircraftType: rec.t ?? null,
        typeDesc: rec.desc ?? null,
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
    }
  } catch {
    return { ...HEX_EMPTY, unavailable: true };
  }
  return HEX_EMPTY;
}

// Re-exported so callers can dedupe by distance if needed.
export { haversineMeters };
