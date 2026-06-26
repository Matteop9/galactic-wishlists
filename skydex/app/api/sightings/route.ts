import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { lookupLiveByHex } from "@/lib/aircraft";
import { lookupFr24ByRegistration, lookupFr24AirlineName } from "@/lib/fr24";
import { normalizeBrand, airlineFromCallsign } from "@/lib/airlines";
import { specialLivery } from "@/lib/specialLiveries";
import { aircraftTypeName, aircraftTypeDisplay } from "@/lib/aircraftTypes";

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

  // Aircraft type + registration come from the live feed (airplanes.live, sent in
  // meta). Type/reg are occasionally absent at capture (a position with no aircraft-DB
  // match — brand-new deliveries etc.); re-query the live feed by hex to recover them
  // (the airframe is overhead, so it's trackable).
  let aircraftType: string | null = meta.aircraftType ?? null;
  let registration: string | null = meta.registration ?? null;
  if ((!aircraftType || !registration) && meta.icao24) {
    const live = await lookupLiveByHex(meta.icao24);
    aircraftType = aircraftType ?? live.aircraftType;
    registration = registration ?? live.registration;
  }

  // Authoritative enrichment from Flightradar24 (the commercially-licensed source we
  // persist — see lib/fr24.ts). One filtered `full` lookup by registration returns the
  // direction-correct origin/destination, operator, ETA, and live flight state — and
  // backfills type/reg if the live feed lacked them. This replaces adsbdb (route +
  // airframe) and the old position-based leg-direction heuristic: FR24 already knows
  // the leg being flown. Best-effort — nulls if FR24 is unavailable or reg is missing.
  const fr = await lookupFr24ByRegistration(registration);
  registration = registration ?? fr.registration;
  aircraftType = aircraftType ?? fr.aircraftType;
  const origin = fr.originIata;
  const destination = fr.destinationIata;

  // Carrier = consolidated brand. FR24's operator code → authoritative name; fall back
  // to the callsign-derived operator when FR24 has nothing.
  const fr24Airline = fr.operatingAs ? await lookupFr24AirlineName(fr.operatingAs) : null;
  const brand = normalizeBrand(fr24Airline) ?? airlineFromCallsign(meta.callsign ?? null);

  // Wet-lease: airframe wears one airline's livery but is operated by another.
  const wetLease = Boolean(
    fr.paintedAs && fr.operatingAs && fr.paintedAs !== fr.operatingAs,
  );

  // Friendly type name comes from our own license-clean ICAO→name map (lib/aircraftTypes),
  // NOT the live feed's `desc` (airplanes.live's free tier is non-commercial). Unknown
  // codes fall back to the raw ICAO code until curated.
  const typeName = aircraftType ? aircraftTypeDisplay(aircraftType) ?? aircraftType : null;

  // Grow the reference universe so it always matches the live data.
  if (aircraftType) {
    await supabase.from("aircraft_types").upsert(
      {
        code: aircraftType,
        name: aircraftTypeName(aircraftType) ?? aircraftType,
        display_name: typeName,
        rarity: "common",
      },
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
    origin: isNew("origin", origin),
    destination: isNew("destination", destination),
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
      origin: origin,
      destination: destination,
      altitude_m: meta.altM ?? null,
      bearing: meta.bearing ?? null,
      elevation: meta.elevation ?? null,
      flight_no: fr.flightNo,
      painted_as: fr.paintedAs,
      operating_as: fr.operatingAs,
      eta: fr.eta,
      gspeed_kt: fr.gspeedKt,
      vspeed_fpm: fr.vspeedFpm,
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
    wetLease,
  });
}
