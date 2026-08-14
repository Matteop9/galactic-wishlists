// Flightradar24 API client — the authoritative, commercially-licensed enrichment
// source for a *captured* sighting (the data we persist on the permanent card).
//
// HYBRID ARCHITECTURE (see research/data-licences.md + project notes):
//  - adsb.fi (lib/aircraft.ts) drives the live map / nearby feed — transient,
//    nothing persisted.
//  - At capture, ONE filtered FR24 `full` lookup (by registration) returns the
//    authoritative aircraft type, registration, operator, and the *direction-correct*
//    origin/destination, plus live flight state (altitude/speed/vspeed) and ETA. That
//    record is what gets written to the card. This replaces adsbdb (route + airframe)
//    and removes the position-based route-direction heuristic (FR24 already knows the
//    current leg).
//
// COST: a single-registration `full` query = ~8 credits; airline-info = 1 credit
// (measured 2026-06-25 on the Explorer/$9 tier, 60k credits/mo). FR24 live positions
// only return *airborne* aircraft — fine here, since you're photographing one overhead.
//
// Best-effort by design: every function swallows errors and returns nulls so a FR24
// outage, rate-limit, or missing token never blocks a capture.
import { fetch as undiciFetch, Agent } from "undici";

// Force IPv4 — mirrors lib/aircraft.ts (Vercel egress can't always reach advertised IPv6).
// headers/body timeouts too: connect.timeout only covers the handshake, and a stalled
// response would otherwise hang the capture route toward the function timeout.
const dispatcher = new Agent({
  connect: { family: 4, timeout: 10_000 },
  headersTimeout: 10_000,
  bodyTimeout: 10_000,
});

const BASE = "https://fr24api.flightradar24.com/api";

function authHeaders(): Record<string, string> | null {
  const token = process.env.FR24_API_TOKEN;
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Accept-Version": "v1",
  };
}

export type Fr24Flight = {
  aircraftType: string | null; // ICAO type code, e.g. A343
  registration: string | null; // e.g. D-AIGN
  callsign: string | null; // ATC callsign, e.g. DLH433
  flightNo: string | null; // IATA flight number, e.g. LH433
  paintedAs: string | null; // ICAO code of the livery brand
  operatingAs: string | null; // ICAO code of the actual operator
  originIata: string | null;
  destinationIata: string | null;
  eta: string | null; // ISO timestamp, scheduled/estimated arrival
  altFt: number | null;
  gspeedKt: number | null;
  vspeedFpm: number | null;
};

export const EMPTY_FR24: Fr24Flight = {
  aircraftType: null,
  registration: null,
  callsign: null,
  flightNo: null,
  paintedAs: null,
  operatingAs: null,
  originIata: null,
  destinationIata: null,
  eta: null,
  altFt: null,
  gspeedKt: null,
  vspeedFpm: null,
};

type Fr24PositionRecord = {
  type?: string;
  reg?: string;
  callsign?: string;
  flight?: string;
  painted_as?: string;
  operating_as?: string;
  orig_iata?: string;
  dest_iata?: string;
  eta?: string;
  alt?: number;
  gspeed?: number;
  vspeed?: number;
};

function mapRecord(r: Fr24PositionRecord): Fr24Flight {
  return {
    aircraftType: r.type ?? null,
    registration: r.reg ?? null,
    callsign: r.callsign ?? null,
    flightNo: r.flight ?? null,
    paintedAs: r.painted_as ?? null,
    operatingAs: r.operating_as ?? null,
    originIata: r.orig_iata ?? null,
    destinationIata: r.dest_iata ?? null,
    eta: r.eta ?? null,
    altFt: typeof r.alt === "number" ? r.alt : null,
    gspeedKt: typeof r.gspeed === "number" ? r.gspeed : null,
    vspeedFpm: typeof r.vspeed === "number" ? r.vspeed : null,
  };
}

async function lookupFr24Live(filter: string): Promise<Fr24Flight> {
  const headers = authHeaders();
  if (!headers) return EMPTY_FR24;

  try {
    const res = await undiciFetch(`${BASE}/live/flight-positions/full?${filter}`, {
      dispatcher,
      headers,
    });
    if (!res.ok) return EMPTY_FR24;
    const json = (await res.json()) as { data?: Fr24PositionRecord[] };
    const rec = json.data?.[0];
    return rec ? mapRecord(rec) : EMPTY_FR24;
  } catch {
    return EMPTY_FR24;
  }
}

/**
 * Look up the authoritative FR24 record for an airborne aircraft by registration.
 * Returns EMPTY_FR24 (all nulls) on missing token, no match, or any error.
 */
export async function lookupFr24ByRegistration(
  registration: string | null,
): Promise<Fr24Flight> {
  const reg = (registration ?? "").trim();
  if (!reg) return EMPTY_FR24;
  return lookupFr24Live(`registrations=${encodeURIComponent(reg)}`);
}

/**
 * Same lookup keyed by ATC callsign — the fallback when the live feed had no
 * registration for the airframe (without this, reg-less captures get no FR24
 * enrichment at all: no route, no operator, no reg backfill).
 */
export async function lookupFr24ByCallsign(
  callsign: string | null,
): Promise<Fr24Flight> {
  const cs = (callsign ?? "").trim();
  if (!cs) return EMPTY_FR24;
  return lookupFr24Live(`callsigns=${encodeURIComponent(cs)}`);
}

// Airline names never change mid-month; cache per instance so repeat captures of
// the same carrier stop costing a credit each (Fluid Compute reuses instances).
const airlineNameCache = new Map<string, { name: string | null; at: number }>();
const AIRLINE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Resolve an airline's display name from its ICAO code (e.g. "DLH" → "Lufthansa").
 * 1 credit on cache miss. Returns null on missing token / no match / error.
 */
export async function lookupFr24AirlineName(
  icaoCode: string | null,
): Promise<string | null> {
  const code = (icaoCode ?? "").trim();
  const headers = authHeaders();
  if (!code || !headers) return null;

  const cached = airlineNameCache.get(code);
  if (cached && Date.now() - cached.at < AIRLINE_CACHE_TTL_MS) return cached.name;

  try {
    const res = await undiciFetch(
      `${BASE}/static/airlines/${encodeURIComponent(code)}/light`,
      { dispatcher, headers },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { name?: string };
    const name = json.name ?? null;
    airlineNameCache.set(code, { name, at: Date.now() });
    return name;
  } catch {
    return null;
  }
}
