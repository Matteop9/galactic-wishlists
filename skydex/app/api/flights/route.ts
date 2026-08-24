import { NextResponse } from "next/server";
import { fetchAircraftNear, lookupLiveByHex } from "@/lib/aircraft";
import { bearingDeg, elevationDeg, haversineMeters } from "@/lib/geo";

export const runtime = "nodejs";

// --- Detection cone tuning (fine-tune these) ---
const MIN_ELEVATION = 0; // at/above the horizon counts (was 2 — dropped low
// approach/fence traffic); the elevation×range scaling still keeps distant
// low-angle cruisers out, so only genuinely close low planes are added.
const MIN_RANGE_KM = 3; // always allow very close aircraft
const ELEV_RANGE_FACTOR = 3.5; // higher elevation → reaches further (km per degree)
// Max ground distance an aircraft can be picked up at, scaled by its elevation.
function maxRangeKm(elevation: number, radiusKm: number) {
  return Math.min(radiusKm, Math.max(MIN_RANGE_KM, elevation * ELEV_RANGE_FACTOR));
}

export type Candidate = {
  icao24: string;
  callsign: string;
  registration: string | null;
  aircraftType: string | null;
  typeDesc: string | null;
  lat: number;
  lon: number;
  altM: number | null;
  distanceKm: number;
  bearing: number; // degrees from observer, 0 = north
  elevation: number | null; // degrees above horizon; null = no altitude broadcast
  track: number | null;
  velocityMs: number | null;
  seenPosS: number | null; // age of the position fix (seconds) — lets the client dead-reckon
  adsbCategory: string | null; // ADS-B emitter category (map icon fallback for uncurated codes)
  military: boolean;
};

/**
 * GET /api/flights?lat=..&lon=..&radiusKm=..[&alt=..][&all=1][&hex=..]
 * Returns nearby aircraft with the bearing + elevation at which the observer
 * would see each — the geometry the capture step matches the camera against.
 * `alt` = observer altitude (metres MSL, from GPS); without it a spotter at
 * elevation (Denver etc.) gets wildly inflated elevation angles.
 *
 * By default results are filtered to the detection cone (what the camera could
 * plausibly capture). Pass `all=1` for the situational map view: every aircraft
 * in radius, unfiltered, still annotated with bearing/distance/elevation.
 *
 * Pass `hex=<icao24>` to fast-poll a single tracked aircraft instead: resolves
 * that hex directly (cheaper upstream than the area sweep), annotates it with
 * the same geometry, skips the cone filter, and returns it as a one-item
 * `candidates` array so the client merge is uniform.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Number(null) is 0, so a missing param would silently pass the finite check
  // and query the live feed at (0,0) — require the params to actually exist.
  const rawLat = searchParams.get("lat");
  const rawLon = searchParams.get("lon");
  const lat = rawLat === null ? NaN : Number(rawLat);
  const lon = rawLon === null ? NaN : Number(rawLon);
  const radiusKm = Math.min(Number(searchParams.get("radiusKm")) || 80, 150);
  const rawAlt = Number(searchParams.get("alt"));
  const obsAltM = Number.isFinite(rawAlt) ? Math.min(Math.max(rawAlt, -500), 9000) : 0;
  const all = searchParams.get("all") === "1";
  const hex = searchParams.get("hex");

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  if (hex) {
    const live = await lookupLiveByHex(hex);
    const candidates: Candidate[] = [];
    if (live.found && live.lat != null && live.lon != null) {
      const ground = haversineMeters(lat, lon, live.lat, live.lon);
      candidates.push({
        icao24: hex.trim().toLowerCase(),
        callsign: live.callsign ?? "",
        registration: live.registration,
        aircraftType: live.aircraftType,
        typeDesc: live.typeDesc,
        lat: live.lat,
        lon: live.lon,
        altM: live.altM,
        distanceKm: Number((ground / 1000).toFixed(1)),
        bearing: Math.round(bearingDeg(lat, lon, live.lat, live.lon)),
        elevation:
          live.altM != null ? Math.round(elevationDeg(ground, live.altM - obsAltM)) : null,
        track: live.track,
        velocityMs: live.velocityMs,
        seenPosS: live.seenPosS,
        adsbCategory: live.adsbCategory,
        military: live.military,
      });
    }
    return NextResponse.json({
      count: candidates.length,
      source: "adsb.fi",
      fetchedAt: Date.now(),
      candidates,
    });
  }

  let result;
  try {
    result = await fetchAircraftNear(lat, lon, radiusKm);
  } catch (err) {
    const cause = err instanceof Error && err.cause ? ` (${String(err.cause)})` : "";
    return NextResponse.json(
      { error: (err instanceof Error ? err.message : "Flight data unavailable") + cause },
      { status: 502 },
    );
  }

  const candidates: Candidate[] = result.aircraft
    .map((a): Candidate => {
      const ground = haversineMeters(lat, lon, a.lat, a.lon);
      return {
        icao24: a.icao24,
        callsign: a.callsign,
        registration: a.registration,
        aircraftType: a.aircraftType,
        typeDesc: a.typeDesc,
        lat: a.lat,
        lon: a.lon,
        altM: a.altM,
        distanceKm: Number((ground / 1000).toFixed(1)),
        bearing: Math.round(bearingDeg(lat, lon, a.lat, a.lon)),
        elevation:
          a.altM != null ? Math.round(elevationDeg(ground, a.altM - obsAltM)) : null,
        track: a.track,
        velocityMs: a.velocityMs,
        seenPosS: a.seenPosS,
        adsbCategory: a.adsbCategory,
        military: a.military,
      };
    })
    .filter(
      (c) =>
        all ||
        (c.elevation != null &&
          c.elevation >= MIN_ELEVATION &&
          c.distanceKm <= maxRangeKm(c.elevation, radiusKm)),
    )
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return NextResponse.json({
    count: candidates.length,
    source: result.source,
    fetchedAt: Date.now(),
    candidates,
  });
}
