import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { lookupLiveByHex } from "@/lib/aircraft";
import {
  lookupFr24ByRegistration,
  lookupFr24ByCallsign,
  lookupFr24AirlineName,
  EMPTY_FR24,
} from "@/lib/fr24";
import { normalizeBrand, airlineFromCallsign, callsignIcao } from "@/lib/airlines";
import { specialLivery } from "@/lib/specialLiveries";
import { aircraftTypeName, aircraftTypeDisplay, aircraftCategory } from "@/lib/aircraftTypes";
import {
  haversineMeters,
  bearingDeg,
  elevationDeg,
  angularDiff,
  angularSeparation,
  projectForward,
} from "@/lib/geo";
import {
  ENFORCE_PAYWALL,
  ABUSE_DAILY_CAP,
  type TicketStatus,
  type CaptureTickets,
} from "@/lib/tickets";

// ---- Abuse / verification tuning ----
const RATE_LIMIT_PER_MINUTE = 5;
const DUPE_WINDOW_MS = 5 * 60 * 1000; // matches the DB exclusion constraint
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
// How far back capturedAt may claim. Widened to 6 h for the offline capture
// queue: a catch taken with no signal keeps its real shutter time when it
// finally uploads. This does NOT enable faking VERIFIED sightings — verification
// back-projects only ≤120 s (VERIFY_MAX_PROJECT_S), so an old capturedAt is
// checked against the plane's live position and simply lands unverified (→
// community review) if it's no longer there.
const MAX_CAPTURE_AGE_MS = 6 * 60 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 2 * 60 * 1000; // how far ahead (client clock drift)
const VERIFY_MAX_DISTANCE_KM = 80; // plane must be plausibly visible
// Generous pointing cone (true angular separation, not per-axis): the plane
// moves between capture and our re-query, and phone compasses drift. This
// blocks fabrication, not honest users — and unlike the old separate
// heading/pitch tolerances it stays meaningful near the zenith, where azimuth
// is degenerate.
const VERIFY_CONE_TOL = 70;
// Inside this range the pointing checks are skipped: a nearly-overhead aircraft
// (low helicopters especially) swings its bearing/elevation faster than the
// feed updates, and fraud is moot when the plane demonstrably is right there.
const VERIFY_CLOSE_RANGE_M = 2000;
// Back-projecting the live sample to the shutter instant is only trusted over
// short horizons — beyond this the flat-earth dead reckoning (and an unchanged
// track assumption) stops being credible.
const VERIFY_MAX_PROJECT_S = 120;

// ---- Input validation helpers (meta is untrusted client JSON) ----
function num(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}
function str(v: unknown, maxLen: number, pattern?: RegExp): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s || s.length > maxLen) return null;
  if (pattern && !pattern.test(s)) return null;
  return s;
}

// Magic-byte sniff — the client-declared MIME type is not trusted (public bucket).
function sniffImageType(bytes: Uint8Array): { ext: string; mime: string } | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return { ext: "jpg", mime: "image/jpeg" };
  if (
    bytes.length > 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  )
    return { ext: "png", mime: "image/png" };
  if (
    bytes.length > 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  )
    return { ext: "webp", mime: "image/webp" };
  return null;
}

/**
 * POST /api/sightings  (multipart form: `photo` file optional, `meta` JSON)
 * Stores a sighting for the signed-in user. A verified capture carries a photo
 * AND passes the server-side geometry check against the live feed; a casual
 * "log from map" has no photo and verified=false. The client's `verified` flag
 * is ignored — verification is decided here.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // ---- Parse + validate the untrusted meta blob ----
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }
  const photo = form.get("photo");
  let meta: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(String(form.get("meta") ?? "{}"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    meta = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid meta JSON" }, { status: 400 });
  }

  const lat = num(meta.lat, -90, 90);
  const lon = num(meta.lon, -180, 180);
  const heading = num(meta.heading, 0, 360);
  const pitch = num(meta.pitch, -90, 90);
  const altM = num(meta.altM, -500, 30_000);
  const obsAltM = num(meta.obsAltM, -500, 9_000) ?? 0; // observer GPS altitude (MSL)
  const bearing = num(meta.bearing, 0, 360);
  const elevation = num(meta.elevation, -90, 90);
  // Must be a real 24-bit ICAO address (exactly 6 hex). The old pattern also
  // admitted `~`-prefixed / short values, which are non-ICAO anonymous targets:
  // a fabricated hex that upstream 4xx'd would hit the "unavailable → verified"
  // branch and mint a VERIFIED sighting of a plane that doesn't exist. A
  // malformed hex now becomes null → the verification block is skipped entirely.
  const icao24 = str(meta.icao24, 6, /^[0-9a-fA-F]{6}$/)?.toLowerCase() ?? null;
  const callsign = str(meta.callsign, 12);
  let registration = str(meta.registration, 12);
  let aircraftType = str(meta.aircraftType, 4, /^[A-Za-z0-9]{2,4}$/)?.toUpperCase() ?? null;

  // capturedAt: clamp to [now - 10 min, now + 2 min]; anything else (missing,
  // malformed, backdated to farm daily boards) becomes server time.
  const now = Date.now();
  let capturedAtMs = now;
  const rawCapturedAt = meta.capturedAt;
  const claimed =
    typeof rawCapturedAt === "number"
      ? rawCapturedAt
      : typeof rawCapturedAt === "string"
        ? Date.parse(rawCapturedAt)
        : NaN;
  if (
    Number.isFinite(claimed) &&
    claimed >= now - MAX_CAPTURE_AGE_MS &&
    claimed <= now + MAX_CLOCK_SKEW_MS
  ) {
    capturedAtMs = claimed;
  }
  const capturedAtIso = new Date(capturedAtMs).toISOString();

  // ---- Rate limit: cheap DB count, no extra infra ----
  const { count: recentCount } = await supabase
    .from("sightings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", new Date(now - 60_000).toISOString());
  if ((recentCount ?? 0) >= RATE_LIMIT_PER_MINUTE) {
    return NextResponse.json(
      { error: "Too many captures — give it a minute." },
      { status: 429 },
    );
  }

  // ---- Duplicate pre-check (before FR24, so replays don't burn credits).
  // The DB exclusion constraint is the real guard; this gives a friendly answer.
  if (icao24) {
    const { data: dupe } = await supabase
      .from("sightings")
      .select("id")
      .eq("user_id", user.id)
      .eq("icao24", icao24)
      .gte("captured_at", new Date(capturedAtMs - DUPE_WINDOW_MS).toISOString())
      .lte("captured_at", new Date(capturedAtMs + DUPE_WINDOW_MS).toISOString())
      .limit(1);
    if (dupe && dupe.length > 0) {
      return NextResponse.json(
        { error: "You've already logged this aircraft just now." },
        { status: 409 },
      );
    }
  }

  // ---- Validate the photo BEFORE any upstream spend ----
  // Magic-byte + size check up front. The rate limit above counts inserted ROWS,
  // so a request that dies later (junk or oversized "photo") creates no row and
  // is NOT throttled — without this, a 5-byte "photo" plus a registration could
  // spam paid FR24 lookups for free. The actual upload still happens last, next
  // to the insert, so a failed insert can clean up after itself.
  const hasPhoto = photo instanceof File && photo.size > 0;
  let photoKind: { ext: string; mime: string } | null = null;
  if (hasPhoto) {
    const file = photo as File;
    if (file.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: "Photo too large (8 MB max)." }, { status: 413 });
    }
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    photoKind = sniffImageType(head);
    if (!photoKind) {
      return NextResponse.json(
        { error: "Photo must be a JPEG, PNG, or WebP image." },
        { status: 415 },
      );
    }
  }

  // ---- Tickets gate (V4 Phase 3) ----
  // One cheap RPC round trip, placed before the live-feed + paid FR24 lookups.
  // The abuse ceiling applies ALWAYS (unverified spam burns FR24 credits too);
  // the paywall only when ENFORCE_PAYWALL is on. A failed status read skips the
  // gate (fail-open — capture is the core loop, same philosophy as verification).
  let tickets: TicketStatus | null = null;
  {
    const { data: ts } = await supabase.rpc("ticket_status");
    if (ts && (ts as TicketStatus).ok) tickets = ts as TicketStatus;
  }
  if (tickets && tickets.captures_today >= ABUSE_DAILY_CAP) {
    return NextResponse.json(
      { error: "Daily capture limit reached — back tomorrow." },
      { status: 429 },
    );
  }
  const overFreeSpots =
    tickets != null && tickets.spots_used_today >= tickets.free_spots_per_day;
  if (ENFORCE_PAYWALL && tickets && overFreeSpots && tickets.balance < 1) {
    // 402: out of free spots AND out of Tickets. The client keeps offline-queued
    // captures on a 402 — tomorrow's daily grant can settle them.
    return NextResponse.json(
      { error: "You're out of free spots for today.", code: "out_of_tickets", tickets },
      { status: 402 },
    );
  }

  // ---- Server-side verification against the live feed ----
  // Re-query the claimed hex: it must be airborne, near the observer, and (when
  // the client supplied pointing data) roughly where the camera was pointing.
  // The live record is also the authoritative source for type/reg — preferred
  // over the client's copy of the same feed.
  const live = icao24 ? await lookupLiveByHex(icao24) : null;
  if (live?.found) {
    aircraftType = live.aircraftType ?? aircraftType;
    registration = live.registration ?? registration;
  }

  let verified = false;
  let verifyFailReason: string | null = null;
  if (hasPhoto && icao24 && lat != null && lon != null && live) {
    if (live.found && live.lat != null && live.lon != null) {
      // The live sample describes where the plane was ~seenPosS ago, but the
      // photo was taken at capturedAt — back-project the plane along its track
      // to the shutter instant so the geometry compares like with like. This
      // removes the last systematic false-negative: at close range the plane
      // moves tens of degrees of bearing between shutter and re-query.
      let planeLat = live.lat;
      let planeLon = live.lon;
      const posEpochMs = now - (live.seenPosS ?? 0) * 1000;
      const dtSec = (capturedAtMs - posEpochMs) / 1000;
      if (
        live.track != null &&
        live.velocityMs != null &&
        Math.abs(dtSec) <= VERIFY_MAX_PROJECT_S
      ) {
        const p = projectForward(live.lat, live.lon, live.track, live.velocityMs, dtSec);
        planeLat = p.lat;
        planeLon = p.lon;
      }
      const groundM = haversineMeters(lat, lon, planeLat, planeLon);
      const liveBearing = bearingDeg(lat, lon, planeLat, planeLon);
      const liveElevation =
        live.altM != null ? elevationDeg(groundM, live.altM - obsAltM) : null;
      const nearEnough = groundM / 1000 <= VERIFY_MAX_DISTANCE_KM;
      const close = groundM <= VERIFY_CLOSE_RANGE_M;
      // Pointing check as ONE true angular separation. Missing heading fails
      // closed (as before); missing pitch or elevation falls back to an
      // azimuth-only comparison (preserving the old pitch pass-open policy).
      const coneSep =
        heading == null
          ? null
          : pitch == null || liveElevation == null
            ? angularDiff(heading, liveBearing)
            : angularSeparation(heading, pitch, liveBearing, liveElevation);
      const pointingOk = coneSep != null && coneSep <= VERIFY_CONE_TOL;
      verified = nearEnough && (close || pointingOk);
      if (!verified) {
        verifyFailReason = !nearEnough
          ? `distance ${Math.round(groundM / 1000)}km`
          : coneSep == null
            ? "cone none (no heading)"
            : `cone ${Math.round(coneSep)} vs ${VERIFY_CONE_TOL}`;
      }
    } else if (live.unavailable) {
      // Upstream outage — no verdict either way. Don't punish an honest capture;
      // the photo + a moment-ago /api/flights match got them here.
      verified = true;
    } else {
      // live.found === false (or no position) with upstream healthy → the plane
      // isn't airborne. That's a fabricated or stale capture: stays unverified.
      verifyFailReason = live.found ? "no_position" : "not_airborne";
    }
  }

  // ---- FR24 enrichment (authoritative persisted card data) ----
  let fr = await lookupFr24ByRegistration(registration);
  if (!fr.registration && callsign) {
    // Reg-less airframe: fall back to a callsign-keyed lookup.
    fr = await lookupFr24ByCallsign(callsign);
  }
  // Cross-check: the FR24 record is keyed on registration; if its callsign
  // contradicts the one we captured, the reg was stale — a mismatched flight's
  // route/operator must not be persisted onto this card.
  if (
    fr.callsign &&
    callsign &&
    fr.callsign.trim().toUpperCase() !== callsign.trim().toUpperCase()
  ) {
    fr = EMPTY_FR24;
  }
  registration = registration ?? fr.registration;
  aircraftType = aircraftType ?? fr.aircraftType;
  const origin = fr.originIata;
  const destination = fr.destinationIata;

  // Carrier = consolidated brand. FR24's operator code → authoritative name; fall back
  // to the callsign-derived operator when FR24 has nothing.
  const fr24Airline = fr.operatingAs ? await lookupFr24AirlineName(fr.operatingAs) : null;
  const brand = normalizeBrand(fr24Airline) ?? airlineFromCallsign(callsign);
  // Newness keys on the stable ICAO callsign code, NOT the display brand — see
  // callsignIcao. `brand` is still what we persist + show; `airlineIcao` is what
  // decides "new airline" so the map hint and this discovery always agree.
  const airlineIcao = callsignIcao(callsign);

  // Wet-lease: airframe wears one airline's livery but is operated by another.
  const wetLease = Boolean(
    fr.paintedAs && fr.operatingAs && fr.paintedAs !== fr.operatingAs,
  );

  // Friendly type name comes from our own license-clean ICAO→name map (lib/aircraftTypes),
  // NOT the live feed's `desc` (adsb.fi's open data leans non-commercial). Unknown
  // codes fall back to the raw ICAO code until curated.
  const typeName = aircraftType ? aircraftTypeDisplay(aircraftType) ?? aircraftType : null;

  // Grow the reference universe so it always matches the live data. Server-side
  // RPC (SECURITY DEFINER): computes the rarity default from the category —
  // curated map first, live ADS-B hints (military flag / rotorcraft emitter
  // class) for codes we haven't curated yet. Client REST inserts are gone.
  if (aircraftType) {
    const category =
      aircraftCategory(aircraftType) ??
      (live?.military ? "military" : live?.adsbCategory === "A7" ? "helicopter" : null);
    await supabase.rpc("register_aircraft_type", {
      p_code: aircraftType,
      p_name: aircraftTypeName(aircraftType) ?? aircraftType,
      p_display_name: typeName,
      p_category: category,
    });
  }
  // Only real brand names grow the airlines universe — a bare 3-letter ICAO code
  // (unknown callsign prefix) would permanently inflate everyone's completion
  // denominator. The card still shows the raw code; it just isn't a checklist entry.
  if (brand && !/^[A-Z0-9]{3}$/.test(brand)) {
    await supabase.from("airlines").upsert({ name: brand }, { onConflict: "name", ignoreDuplicates: true });
  }

  // What's new for this user — four targeted probes (not a scan of their whole
  // history), computed before the insert so it excludes the capture itself.
  const seenBefore = async (col: string, val: string | null): Promise<boolean> => {
    if (!val) return false;
    const { data } = await supabase
      .from("sightings")
      .select("id")
      .eq("user_id", user.id)
      .eq(col, val)
      .limit(1);
    return (data?.length ?? 0) > 0;
  };
  const [seenType, seenAirline, seenOrigin, seenDestination] = await Promise.all([
    seenBefore("aircraft_type", aircraftType),
    seenBefore("airline_icao", airlineIcao),
    seenBefore("origin", origin),
    seenBefore("destination", destination),
  ]);
  const discoveries = {
    type: Boolean(aircraftType) && !seenType,
    airline: Boolean(airlineIcao) && !seenAirline,
    origin: Boolean(origin) && !seenOrigin,
    destination: Boolean(destination) && !seenDestination,
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

  // ---- Photo upload — already validated up front (size + magic bytes); the
  // upload itself is last, next to the insert, so a failed insert can clean up
  // instead of leaking storage. ----
  let photoPath: string | null = null;
  if (hasPhoto && photoKind) {
    const file = photo as File;
    const path = `${user.id}/${crypto.randomUUID()}.${photoKind.ext}`;
    const { error: upErr } = await supabase.storage
      .from("sightings")
      .upload(path, file, { contentType: photoKind.mime, upsert: false });
    if (upErr) {
      // Don't echo the raw storage error to the client.
      return NextResponse.json(
        { error: "Photo upload failed — please try again." },
        { status: 500 },
      );
    }
    photoPath = path;
  }

  const { data, error } = await supabase
    .from("sightings")
    .insert({
      user_id: user.id,
      photo_path: photoPath,
      captured_at: capturedAtIso,
      lat,
      lon,
      heading,
      pitch,
      icao24,
      callsign,
      registration: registration,
      aircraft_type: aircraftType,
      airline: brand,
      airline_icao: airlineIcao,
      origin: origin,
      destination: destination,
      altitude_m: altM,
      bearing,
      elevation,
      flight_no: fr.flightNo,
      painted_as: fr.paintedAs,
      operating_as: fr.operatingAs,
      eta: fr.eta,
      gspeed_kt: fr.gspeedKt,
      vspeed_fpm: fr.vspeedFpm,
      rarity,
      verified,
      verify_fail_reason: verifyFailReason,
    })
    .select()
    .single();

  if (error) {
    // Don't leak the photo when the row never landed.
    if (photoPath) {
      await supabase.storage.from("sightings").remove([photoPath]);
    }
    // 23P01 = the exclusion constraint caught a concurrent duplicate.
    if (error.code === "23P01") {
      return NextResponse.json(
        { error: "You've already logged this aircraft just now." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ---- Ticket spend (only when enforced) ----
  // Beyond the free daily spots, a VERIFIED capture costs one Ticket. Never charged
  // while the flag is off, never on an unverified capture, and idempotent per
  // sighting (offline retries can't double-charge). If the spend loses a race
  // (balance drained between pre-check and here), the sighting stands — never
  // unwind a real catch over accounting.
  let spentTicket = false;
  if (ENFORCE_PAYWALL && verified && tickets && overFreeSpots) {
    const { data: spendRes } = await supabase.rpc("spend_ticket", { p_sighting: data.id });
    const spend = spendRes as { ok?: boolean; balance?: number; already?: boolean } | null;
    if (spend?.ok && !spend.already) {
      spentTicket = true;
    }
    if (spend?.ok && typeof spend.balance === "number") {
      tickets = { ...tickets, balance: spend.balance };
    } else if (!spend?.ok) {
      console.error("spend_ticket failed for sighting", data.id, spendRes);
    }
  }
  const captureTickets: CaptureTickets | null = tickets
    ? {
        balance: tickets.balance,
        spentTicket,
        // the status snapshot predates this insert — count the capture itself
        spotsUsedToday: tickets.spots_used_today + (verified ? 1 : 0),
        freeSpotsPerDay: tickets.free_spots_per_day,
        frequentFlyer: tickets.frequent_flyer,
      }
    : null;

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
    tickets: captureTickets,
  });
}
