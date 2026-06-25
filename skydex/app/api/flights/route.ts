import { NextResponse } from "next/server";
import { fetchAircraftNear } from "@/lib/aircraft";
import { bearingDeg, elevationDeg, haversineMeters } from "@/lib/geo";

export const runtime = "nodejs";

// --- Detection cone tuning (fine-tune these) ---
const MIN_ELEVATION = 2; // degrees above horizon to count at all
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
  altM: number;
  distanceKm: number;
  bearing: number; // degrees from observer, 0 = north
  elevation: number; // degrees above horizon
  track: number | null;
  velocityMs: number | null;
};

/**
 * GET /api/flights?lat=..&lon=..&radiusKm=..[&all=1]
 * Returns nearby aircraft with the bearing + elevation at which the observer
 * would see each — the geometry the capture step matches the camera against.
 *
 * By default results are filtered to the detection cone (what the camera could
 * plausibly capture). Pass `all=1` for the situational map view: every aircraft
 * in radius, unfiltered, still annotated with bearing/distance/elevation.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const radiusKm = Math.min(Number(searchParams.get("radiusKm")) || 80, 150);
  const all = searchParams.get("all") === "1";

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
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
        elevation: Math.round(elevationDeg(ground, a.altM)),
        track: a.track,
        velocityMs: a.velocityMs,
      };
    })
    .filter(
      (c) =>
        all ||
        (c.elevation >= MIN_ELEVATION && c.distanceKm <= maxRangeKm(c.elevation, radiusKm)),
    )
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return NextResponse.json({
    count: candidates.length,
    source: result.source,
    candidates,
  });
}
