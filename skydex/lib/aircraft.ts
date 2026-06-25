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
const dispatcher = new Agent({ connect: { family: 4, timeout: 12_000 } });

const FT_TO_M = 0.3048;
const KT_TO_MS = 0.514444;

export type Aircraft = {
  icao24: string;
  callsign: string;
  lat: number;
  lon: number;
  altM: number;
  registration: string | null;
  aircraftType: string | null; // ICAO type code, e.g. B738
  typeDesc: string | null; // e.g. BOEING 737-800
  track: number | null;
  velocityMs: number | null;
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
            : 0;
      return {
        icao24: String(a.hex ?? "").trim(),
        callsign: String(a.flight ?? "").trim(),
        lat: a.lat as number,
        lon: a.lon as number,
        altM: altFt * FT_TO_M,
        registration: a.r ?? null,
        aircraftType: a.t ?? null,
        typeDesc: a.desc ?? null,
        track: a.track ?? null,
        velocityMs: typeof a.gs === "number" ? a.gs * KT_TO_MS : null,
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
  aircraftType: string | null;
  typeDesc: string | null;
  registration: string | null;
};

// Resolve type/registration for a single hex from airplanes.live. Used at capture
// time when the polled candidate arrived without type metadata: the airframe is
// directly overhead, so a live hex query reliably finds it.
export async function lookupLiveByHex(hex: string | null): Promise<HexLookup> {
  const h = (hex ?? "").trim();
  const empty: HexLookup = { aircraftType: null, typeDesc: null, registration: null };
  if (!h) return empty;

  try {
    const res = await undiciFetch(
      `https://api.airplanes.live/v2/hex/${encodeURIComponent(h)}`,
      { dispatcher },
    );
    if (!res.ok) return empty;
    const json = (await res.json()) as { ac?: AcRecord[] };
    const rec = (json.ac ?? []).find((a) => a.t);
    if (rec) {
      return {
        aircraftType: rec.t ?? null,
        typeDesc: rec.desc ?? null,
        registration: rec.r ?? null,
      };
    }
  } catch {
    /* fall through to empty */
  }
  return empty;
}

// Re-exported so callers can dedupe by distance if needed.
export { haversineMeters };
