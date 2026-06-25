import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { lookupRoute, lookupAircraftType, resolveRouteDirection } from "@/lib/route";
import { lookupLiveByHex } from "@/lib/aircraft";
import { normalizeBrand, airlineFromCallsign } from "@/lib/airlines";
import { specialLivery } from "@/lib/specialLiveries";

const MANUFACTURER_RE =
  /^(Airbus|Boeing|McDonnell Douglas|Embraer|Bombardier|De Havilland|Lockheed|Ilyushin|Antonov|Tupolev|Cessna|Piper|Saab|Learjet|Gulfstream|Aerospatiale\/BAC|North American|Supermarine|Avro|General Dynamics)\s+/i;

/**
 * POST /api/sightings  (multipart form: `photo` file optional, `meta` JSON)
 * Stores a sighting for the signed-in user. A verified capture carries a photo;
 * a casual "log from map" has no photo and verified=false.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const form = await request.formData();
  const photo = form.get("photo");
  const meta = JSON.parse(String(form.get("meta") ?? "{}"));

  let photoPath: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    const path = `${user.id}/${crypto.randomUUID()}.jpg`;
    const { error: upErr } = await supabase.storage
      .from("sightings")
      .upload(path, photo, {
        contentType: photo.type || "image/jpeg",
        upsert: false,
      });
    if (upErr) {
      return NextResponse.json(
        { error: `Photo upload failed: ${upErr.message}` },
        { status: 500 },
      );
    }
    photoPath = path;
  }

  // Route lookup from the callsign (best-effort). adsbdb's callsign→route is not
  // position-aware (airlines reuse a callsign across both legs), so we correct the
  // leg direction against the plane's actual track + position and only persist a
  // route when the geometry confirms it — see resolveRouteDirection in lib/route.ts.
  // LICENSING NOTE (FR24-acquisition goal): adsbdb's terms discourage incorporating
  // route data into another DB; persisting origin/destination here re-opens that
  // flag (see research/data-licences.md) — revisit before any commercial launch.
  const route = await lookupRoute(meta.callsign ?? null);
  const directed = resolveRouteDirection(
    route,
    meta.planeLat ?? null,
    meta.planeLon ?? null,
    meta.track ?? null,
  );

  // Carrier = consolidated brand, sourced from the route data (fallback: callsign).
  const brand = normalizeBrand(route.airline) ?? airlineFromCallsign(meta.callsign ?? null);

  // Type comes from the live feed, but it's sometimes absent at capture (a feed
  // can return a position with no aircraft-database match, e.g. brand-new
  // deliveries, or the fallback provider served the candidate). Recover it without
  // losing the catch:
  //  1. Re-query the live feeds by hex — the airframe is overhead, so it's
  //     trackable, and the providers' databases differ on newer airframes.
  //  2. Fall back to adsbdb's static DB (covers airframes no longer airborne).
  let aircraftType: string | null = meta.aircraftType ?? null;
  let typeDesc: string | null = meta.typeDesc ?? null;
  let registration: string | null = meta.registration ?? null;
  if (!aircraftType && meta.icao24) {
    const live = await lookupLiveByHex(meta.icao24);
    if (live.aircraftType) {
      aircraftType = live.aircraftType;
      typeDesc = typeDesc ?? live.typeDesc;
      registration = registration ?? live.registration;
    }
  }
  if (!aircraftType) {
    const t = await lookupAircraftType(registration ?? meta.icao24 ?? null);
    if (t.icaoType) {
      aircraftType = t.icaoType;
      typeDesc = typeDesc ?? t.typeDesc;
      registration = registration ?? t.registration;
    }
  }

  const typeName = aircraftType
    ? typeDesc
      ? typeDesc.replace(MANUFACTURER_RE, "").trim()
      : aircraftType
    : null;

  // Grow the reference universe so it always matches the live data.
  if (aircraftType) {
    await supabase.from("aircraft_types").upsert(
      { code: aircraftType, name: typeDesc ?? aircraftType, display_name: typeName, rarity: "common" },
      { onConflict: "code", ignoreDuplicates: true },
    );
  }
  if (brand) {
    await supabase.from("airlines").upsert({ name: brand }, { onConflict: "name", ignoreDuplicates: true });
  }

  // What's new for this user — computed before the insert so it excludes the
  // capture we're about to make. Powers the discovery moment.
  const { data: prior } = await supabase
    .from("sightings")
    .select("aircraft_type, airline, origin, destination")
    .eq("user_id", user.id);
  const priorRows = (prior ?? []) as {
    aircraft_type: string | null;
    airline: string | null;
    origin: string | null;
    destination: string | null;
  }[];
  const isNew = (key: keyof (typeof priorRows)[number], val: string | null) =>
    Boolean(val) && !priorRows.some((p) => p[key] === val);
  const discoveries = {
    type: isNew("aircraft_type", aircraftType),
    airline: isNew("airline", brand),
    origin: isNew("origin", directed.origin),
    destination: isNew("destination", directed.destination),
  };

  // Rarity is driven by the aircraft type's tier in the universe.
  let rarity = "common";
  if (aircraftType) {
    const { data: typeRow } = await supabase
      .from("aircraft_types")
      .select("rarity")
      .eq("code", aircraftType)
      .maybeSingle();
    if (typeRow?.rarity) rarity = typeRow.rarity;
  }

  const { data, error } = await supabase
    .from("sightings")
    .insert({
      user_id: user.id,
      photo_path: photoPath,
      captured_at: meta.capturedAt
        ? new Date(meta.capturedAt).toISOString()
        : new Date().toISOString(),
      lat: meta.lat ?? null,
      lon: meta.lon ?? null,
      heading: meta.heading ?? null,
      pitch: meta.pitch ?? null,
      icao24: meta.icao24 ?? null,
      callsign: meta.callsign ?? null,
      registration: registration,
      aircraft_type: aircraftType,
      airline: brand,
      origin: directed.origin,
      destination: directed.destination,
      altitude_m: meta.altM ?? null,
      bearing: meta.bearing ?? null,
      elevation: meta.elevation ?? null,
      rarity,
      verified: Boolean(meta.verified),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const photoUrl = photoPath
    ? supabase.storage.from("sightings").getPublicUrl(photoPath).data.publicUrl
    : null;

  // Special livery? Matched by registration against the static collection.
  const liv = specialLivery(registration);

  return NextResponse.json({
    sighting: data,
    photoUrl,
    discoveries,
    typeName,
    specialLivery: liv?.livery ?? null,
  });
}
