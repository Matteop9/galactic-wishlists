// Flight-route lookup via adsbdb (free, keyless): callsign → origin/destination
// airports + airline. The live position feed doesn't carry routes, so this fills
// the gap at capture time. Returns nulls on any failure.
import { fetch as undiciFetch, Agent } from "undici";
import { bearingDeg, angularDiff } from "@/lib/geo";

const dispatcher = new Agent({ connect: { family: 4, timeout: 10_000 } });

// adsbdb returns airport coordinates alongside the codes, which we use to verify
// the leg direction against the aircraft's actual track. See resolveRouteDirection.
type Airport = { code: string | null; lat: number | null; lon: number | null };

export type RouteInfo = {
  origin: Airport;
  destination: Airport;
  airline: string | null;
};

const NO_AIRPORT: Airport = { code: null, lat: null, lon: null };

export async function lookupRoute(callsign: string | null): Promise<RouteInfo> {
  const cs = (callsign ?? "").trim();
  const empty: RouteInfo = { origin: NO_AIRPORT, destination: NO_AIRPORT, airline: null };
  if (!cs) return empty;

  try {
    const res = await undiciFetch(
      `https://api.adsbdb.com/v0/callsign/${encodeURIComponent(cs)}`,
      { dispatcher },
    );
    if (!res.ok) return empty;
    const json = (await res.json()) as {
      response?: {
        flightroute?: {
          origin?: { iata_code?: string; latitude?: number; longitude?: number };
          destination?: { iata_code?: string; latitude?: number; longitude?: number };
          airline?: { name?: string };
        };
      };
    };
    const fr = json?.response?.flightroute;
    if (!fr) return empty;
    return {
      origin: {
        code: fr.origin?.iata_code ?? null,
        lat: fr.origin?.latitude ?? null,
        lon: fr.origin?.longitude ?? null,
      },
      destination: {
        code: fr.destination?.iata_code ?? null,
        lat: fr.destination?.latitude ?? null,
        lon: fr.destination?.longitude ?? null,
      },
      airline: fr.airline?.name ?? null,
    };
  } catch {
    return empty;
  }
}

export type DirectedRoute = { origin: string | null; destination: string | null };

// Tolerances (degrees), tunable. ALIGN_TOL: how close the plane's track must be
// to one airport's bearing for us to believe it's flying there. SEPARATION: how
// distinguishable the two endpoints must be — if both lie in a similar direction
// (airports close together, or plane far from both), we can't tell the leg apart.
const ALIGN_TOL = 75;
const SEPARATION = 45;

/**
 * Correct an adsbdb route for the leg the aircraft is actually flying.
 *
 * adsbdb's callsign→route is NOT position-aware: airlines reuse a callsign across
 * both legs, so a plane caught on its return leg comes back with the canonical
 * (outbound) origin/destination — i.e. backwards. (This is why airports were pulled
 * from the product in v0.2.3.) We do have the plane's position + ground track, so
 * we compare the bearing to each airport against the direction of travel:
 *   - the plane should be flying TOWARD its destination and AWAY from its origin.
 * If it's clearly heading toward the listed origin, it's the return leg → swap.
 * If the geometry doesn't decisively favour one end (no track, mid-turn/hold, or
 * ambiguous), we return nulls — better to show nothing than a guess.
 */
export function resolveRouteDirection(
  route: RouteInfo,
  planeLat: number | null,
  planeLon: number | null,
  track: number | null,
): DirectedRoute {
  const o = route.origin;
  const d = route.destination;
  const hidden: DirectedRoute = { origin: null, destination: null };

  if (
    !o.code || !d.code ||
    o.lat == null || o.lon == null || d.lat == null || d.lon == null ||
    planeLat == null || planeLon == null || track == null
  ) {
    return hidden;
  }

  const diffOrigin = angularDiff(track, bearingDeg(planeLat, planeLon, o.lat, o.lon));
  const diffDest = angularDiff(track, bearingDeg(planeLat, planeLon, d.lat, d.lon));

  // Heading must point decisively toward exactly one endpoint.
  if (Math.min(diffOrigin, diffDest) > ALIGN_TOL) return hidden;
  if (Math.abs(diffOrigin - diffDest) < SEPARATION) return hidden;

  // Toward the listed destination → route as-is. Toward the listed origin → it's
  // the return leg, so the true departure is the listed destination.
  return diffDest <= diffOrigin
    ? { origin: o.code, destination: d.code }
    : { origin: d.code, destination: o.code };
}

export type AircraftTypeInfo = {
  icaoType: string | null; // e.g. B788
  typeDesc: string | null; // e.g. Boeing 787-8
  registration: string | null;
};

// Resolve an airframe's type from adsbdb's static aircraft DB when the live feed
// didn't carry it. Pass a registration (preferred) or an icao24 hex. Best-effort:
// adsbdb doesn't have every airframe, so callers must tolerate null results.
export async function lookupAircraftType(
  identifier: string | null,
): Promise<AircraftTypeInfo> {
  const id = (identifier ?? "").trim();
  const empty: AircraftTypeInfo = { icaoType: null, typeDesc: null, registration: null };
  if (!id) return empty;

  try {
    const res = await undiciFetch(
      `https://api.adsbdb.com/v0/aircraft/${encodeURIComponent(id)}`,
      { dispatcher },
    );
    if (!res.ok) return empty;
    const json = (await res.json()) as {
      response?: {
        aircraft?: {
          icao_type?: string;
          type?: string;
          registration?: string;
        };
      };
    };
    const ac = json?.response?.aircraft;
    if (!ac) return empty;
    // adsbdb's `type` carries no manufacturer prefix (e.g. "787-8"), which is
    // exactly what the universe's display_name derivation wants. We don't prepend
    // the `manufacturer` field — it's inconsistent ("Boeing Company", "Airbus SAS")
    // and wouldn't strip cleanly.
    return {
      icaoType: ac.icao_type ?? null,
      typeDesc: ac.type ?? null,
      registration: ac.registration ?? null,
    };
  } catch {
    return empty;
  }
}
