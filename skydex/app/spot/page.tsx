"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  angularSeparation,
  bearingDeg,
  cameraElevation,
  elevationDeg,
  haversineMeters,
  projectForward,
} from "@/lib/geo";
import { aircraftCategory, mapKind } from "@/lib/aircraftTypes";
import { callsignIcao } from "@/lib/airlines";
import { RARITY_RANK, type Rarity } from "@/lib/rarity";
import { specialLivery, normalizeReg } from "@/lib/specialLiveries";
import { createClient } from "@/lib/supabase/client";
import { enqueueCapture, listCaptures, removeCapture, countCaptures } from "@/lib/captureQueue";
import { announceTicketsChanged, type CaptureTickets, type TicketStatus } from "@/lib/tickets";
import DiscoveryMoment, { type DiscoveryResult } from "@/components/DiscoveryMoment";
import { PlaneSpinner, SpinnerBlock } from "@/components/Loading";
import { TicketGlyph } from "@/components/TicketChip";
import TargetOverlay from "@/components/TargetOverlay";
import { deleteSighting } from "@/app/actions/admin";
import SpotMap from "@/components/SpotMap";

type Candidate = {
  icao24: string;
  callsign: string;
  registration: string | null;
  aircraftType: string | null;
  typeDesc: string | null;
  lat: number;
  lon: number;
  altM: number | null;
  distanceKm: number;
  bearing: number;
  elevation: number | null;
  track: number | null;
  velocityMs: number | null;
  seenPosS: number | null;
  adsbCategory: string | null;
  military: boolean;
};

// A candidate stamped with when its position fix is actually FROM (client
// receive time minus the feed's own seen_pos age) — the anchor dead reckoning
// extrapolates from between polls.
type TimedCandidate = Candidate & { sampleAt: number };

// A candidate with its geometry dead-reckoned to "now"; the raw last-fix
// bearing/elevation ride along so the overlay can ghost them.
type LiveCandidate = TimedCandidate & {
  rawBearing: number;
  rawElevation: number | null;
};

// Pointing gate: ONE true angular separation between where the camera points
// and where the plane is (see lib/geo angularSeparation). Unlike the old
// separate heading/pitch boxes this stays meaningful overhead, where azimuth
// is degenerate — a plane at 85° elevation can swing 90° of bearing while
// moving ~5° across the sky. Phone compasses drift; keep it generous.
const CONE_TOL = 25;
// How often the tracked (locked) plane is re-polled, vs 6 s for the area sweep.
const TRACKED_POLL_MS = 2000;
// A plane this close is capturable regardless of the compass cone — you can
// plainly see it and the compass is the unreliable part (mirrors the server's
// VERIFY_CLOSE_RANGE_M = 2000). Also the fallback target when nothing is locked
// or in-cone, so a close plane you can see is never un-capturable.
const CLOSE_CAPTURE_KM = 2;
// Keep showing the last good candidates through a brief feed dropout instead of
// blanking to "no planes"; only clear once the sky is genuinely empty this long.
const FEED_STALE_MS = 25_000;
// Untrack a locked plane only after it's been missing from BOTH the sweep and
// the fast-poll for this long — a single empty poll must not drop the lock.
const LOCK_GRACE_MS = 30_000;
const QUEUED_MSG =
  "Saved — we'll upload and verify it automatically once you're back online.";

// POST a capture with a hard timeout so a stalled mobile connection rejects
// (→ we queue it) instead of hanging on "Saving…" forever. Shared by the live
// submit and the offline-queue flusher.
async function postCapture(blob: Blob | null, metaStr: string): Promise<Response> {
  const fd = new FormData();
  if (blob) fd.append("photo", blob, "sighting.jpg");
  fd.append("meta", metaStr);
  return fetch("/api/sightings", {
    method: "POST",
    body: fd,
    signal: AbortSignal.timeout(30_000),
  });
}

export default function SpotPage() {
  // Camera lifecycle: off until the user first opens Camera view. There is no
  // permission gate screen — the tap that opens the camera IS the user gesture
  // iOS wants for the motion-permission prompt, and the map needs only GPS,
  // which starts on mount with no gesture at all.
  const [camera, setCamera] = useState<"off" | "starting" | "on">("off");
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number; alt: number | null } | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [pitch, setPitch] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<TimedCandidate[]>([]);
  // Wall-clock driving dead reckoning, bumped by a 500 ms ticker effect (kept
  // in state so render stays pure — no Date.now() during render).
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [mapAircraft, setMapAircraft] = useState<Candidate[]>([]);
  // First wide-radius sweep landed — before it, the map shows "scanning" rather
  // than claiming the sky is empty.
  const [mapSwept, setMapSwept] = useState(false);
  const [view, setView] = useState<"camera" | "map">("map");
  const [lockedId, setLockedId] = useState<string | null>(null);
  // Live-feed health, so a dropout shows "reconnecting…" instead of "no planes".
  const [feedError, setFeedError] = useState(false);
  const lastGoodAtRef = useRef(0); // last sweep that returned ≥1 candidate
  const lockSeenAtRef = useRef(0); // last time the locked plane was seen live
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null); // info (e.g. queued), not an error
  const [pendingCount, setPendingCount] = useState(0); // captures waiting to upload
  const flushingRef = useRef(false);
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  // Ticket economy: quota + balance for the HUD line (the header chip owns the
  // daily claim; this page just reads). `wall` = the 402 soft paywall notice.
  const [tickets, setTickets] = useState<TicketStatus | null>(null);
  const [wall, setWall] = useState(false);
  // What this user has already caught, across the dimensions knowable on the
  // map: type codes, airline ICAO codes (callsign prefixes — the stable newness
  // key, matching the server's discovery), and (normalised) registrations for the
  // livery check. Colours the markers gold/green/ink. null until loaded;
  // re-fetched after each capture. (Airports are NOT knowable pre-capture —
  // routes only come from FR24 at capture time.)
  const [collection, setCollection] = useState<{
    types: Set<string>;
    airlineIcaos: Set<string>;
    regs: Set<string>;
  } | null>(null);
  // Pre-capture rarity per type code, from the predict_rarity RPC (universe
  // tier → measured Europe-snapshot tier → rare). null-ish until fetched;
  // markers simply don't glow / show rarity until it arrives.
  const [typeRarity, setTypeRarity] = useState<Record<string, Rarity>>({});
  const rarityRequestedRef = useRef<Set<string>>(new Set());

  const videoRef = useRef<HTMLVideoElement>(null);
  const minimapRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const geoWatchRef = useRef<number | null>(null);
  const orientEventRef = useRef<string | null>(null);
  const [zoom, setZoom] = useState(1);
  // Non-null = device supports native (optical) zoom; null = digital-crop fallback.
  const [zoomCaps, setZoomCaps] = useState<{ min: number; max: number; step: number } | null>(null);
  // Two-finger pinch state: finger distance + zoom level at gesture start.
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);
  const lastTapRef = useRef(0);

  const onOrient = useCallback((e: DeviceOrientationEvent) => {
    const anyE = e as DeviceOrientationEvent & { webkitCompassHeading?: number };
    const h =
      typeof anyE.webkitCompassHeading === "number"
        ? anyE.webkitCompassHeading
        : e.alpha != null
          ? (360 - e.alpha) % 360
          : null;
    if (h != null) setHeading(Math.round(h));
    // Rear-camera elevation from the FULL orientation, not `beta − 90`: the old
    // form was only correct held upright in portrait and went 90–170° wrong held
    // sideways or aimed overhead. cameraElevation is screen-orientation-
    // independent and stays sane at the zenith; fall back to beta−90 only if
    // gamma is somehow missing.
    if (e.beta != null) {
      setPitch(
        Math.round(
          e.gamma != null ? cameraElevation(e.beta, e.gamma) : e.beta - 90,
        ),
      );
    }
  }, []);

  // Attach the compass listener exactly once (Android's plain deviceorientation
  // alpha is relative to whatever way the phone was pointing at page load, not
  // north — use the absolute variant where it exists; iOS supplies
  // webkitCompassHeading instead).
  const orientAttachedRef = useRef(false);
  const attachOrientation = useCallback(() => {
    if (orientAttachedRef.current) return;
    orientAttachedRef.current = true;
    const orientEvent =
      "ondeviceorientationabsolute" in window
        ? "deviceorientationabsolute"
        : "deviceorientation";
    orientEventRef.current = orientEvent;
    window.addEventListener(orientEvent, onOrient as EventListener, true);
  }, [onOrient]);

  // Ask for motion/orientation access. iOS only prompts from a user gesture:
  // the silent (mount-time) attempt resolves without a prompt where permission
  // is already granted or moot (Android, desktop, the native shell — whose
  // webview auto-grants) and quietly gives up otherwise, leaving the Camera
  // tap to retry with a gesture in hand.
  const requestOrientation = useCallback(
    async (silent: boolean) => {
      const DOE = window.DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<"granted" | "denied">;
      };
      if (DOE && typeof DOE.requestPermission === "function") {
        try {
          const granted = await DOE.requestPermission();
          if (granted !== "granted") {
            if (!silent) setError("Motion access denied — targeting won't work.");
            return;
          }
        } catch {
          return; // needs a user gesture — the Camera tap will retry
        }
      }
      attachOrientation();
    },
    [attachOrientation],
  );

  async function startCamera() {
    if (camera !== "off") return;
    setCamera("starting");
    setError(null);
    try {
      // Gesture context: a real motion prompt can show now if it's still needed.
      await requestOrientation(false);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      // The <video> is attached in an effect once camera flips to "on".
      streamRef.current = stream;

      // Detect native zoom support (mostly Android Chrome); else digital fallback.
      const track = stream.getVideoTracks()[0];
      trackRef.current = track ?? null;
      const caps = (track?.getCapabilities?.() ?? {}) as {
        zoom?: { min: number; max: number; step?: number };
      };
      if (caps.zoom) {
        setZoomCaps({ min: caps.zoom.min, max: caps.zoom.max, step: caps.zoom.step ?? 0.1 });
        setZoom((track.getSettings() as { zoom?: number }).zoom ?? caps.zoom.min);
      }

      setCamera("on");
    } catch (err) {
      setCamera("off");
      setError(err instanceof Error ? err.message : "Could not start the camera.");
    }
  }

  // GPS + a silent compass attempt start on mount — the map (the default view)
  // only needs these, so Spot opens with no gate and no tap. Cleanup releases
  // every sensor: camera tracks, the GPS watch, and the compass listener
  // (otherwise they keep firing after client-side nav, holding the OS location
  // indicator on and setting state on a dead component).
  useEffect(() => {
    // Attach the compass listener up front — registration needs no permission
    // anywhere (events are simply withheld until granted), and on Android /
    // desktop this alone lights up the map's facing cone with zero taps.
    attachOrientation();
    // Deferred a tick: react-hooks/set-state-in-effect follows the call into
    // requestOrientation's setError paths (none of which fire silently anyway).
    const t = setTimeout(() => requestOrientation(true), 0);
    // iOS (Safari AND the shell's webview) rejects requestPermission without a
    // user gesture, and Spot now opens on the map — so before v1.0 the facing
    // cone stayed empty until the user happened to open the Camera. Retry with
    // the FIRST tap anywhere as the gesture instead: once granted, the already-
    // attached listener starts receiving events immediately.
    const retryOnGesture = () => requestOrientation(true);
    window.addEventListener("click", retryOnGesture, { once: true, capture: true });
    window.addEventListener("touchend", retryOnGesture, { once: true, capture: true });
    if (navigator.geolocation) {
      geoWatchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, altitude } = pos.coords;
          // Only produce a new coords object when we've genuinely moved (~11 m);
          // the poll effects key on this object, so a fresh one per GPS fix would
          // restart the 6 s interval on every fix.
          setCoords((prev) =>
            prev &&
            Math.abs(prev.lat - latitude) < 1e-4 &&
            Math.abs(prev.lon - longitude) < 1e-4
              ? prev
              : { lat: latitude, lon: longitude, alt: altitude },
          );
        },
        (err) => setError(err.message),
        { enableHighAccuracy: true, maximumAge: 5000 },
      );
    } else {
      setTimeout(() => setError("No geolocation on this device."), 0);
    }
    return () => {
      clearTimeout(t);
      window.removeEventListener("click", retryOnGesture, true);
      window.removeEventListener("touchend", retryOnGesture, true);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (geoWatchRef.current != null) {
        navigator.geolocation.clearWatch(geoWatchRef.current);
      }
      if (orientEventRef.current) {
        window.removeEventListener(orientEventRef.current, onOrient as EventListener, true);
        orientAttachedRef.current = false;
      }
    };
  }, [requestOrientation, attachOrientation, onOrient]);

  // Poll live aircraft around the observer. On a dropout — a network error OR a
  // valid-but-empty gap — KEEP the last good candidates and surface
  // "reconnecting…" instead of blanking the list, and never drop the lock here
  // (the grace timer below owns that). A single bad poll under a flight path
  // must not wipe the plane you can plainly see.
  useEffect(() => {
    if (!coords) return;
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(
          `/api/flights?lat=${coords!.lat}&lon=${coords!.lon}&radiusKm=40${
            coords!.alt != null ? `&alt=${Math.round(coords!.alt)}` : ""
          }`,
        );
        if (!res.ok) {
          if (!cancelled) setFeedError(true); // keep the last candidates
          return;
        }
        const json = await res.json();
        if (cancelled || !Array.isArray(json.candidates)) return;
        const now = Date.now();
        const raw = json.candidates as Candidate[];
        if (raw.length > 0) {
          // Anchor each fix at CLIENT receive time minus the feed's own
          // position age — server timestamps would leak clock skew into the
          // dead reckoning, and network latency (~100 ms) is far smaller.
          const list = raw.map((c) => ({
            ...c,
            sampleAt: now - (c.seenPosS ?? 0) * 1000,
          }));
          setCandidates(list);
          lastGoodAtRef.current = now;
          setFeedError(false);
        } else if (now - lastGoodAtRef.current >= FEED_STALE_MS) {
          setCandidates([]); // sky genuinely quiet for a while
          setFeedError(false);
        } else {
          setFeedError(true); // transient empty gap — keep showing the last set
        }
      } catch {
        if (!cancelled) setFeedError(true); // keep candidates; show "reconnecting"
      }
    }
    poll();
    const id = setInterval(poll, 6000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [coords]);

  // Fast-poll the tracked plane between sweeps: a single-hex lookup every 2 s,
  // merged over its sweep entry, so the plane you're actually trying to catch
  // gets near-live geometry while the 40 km sweep stays at 6 s.
  useEffect(() => {
    if (!coords || !lockedId) return;
    let cancelled = false;
    async function pollHex() {
      try {
        const res = await fetch(
          `/api/flights?hex=${lockedId}&lat=${coords!.lat}&lon=${coords!.lon}${
            coords!.alt != null ? `&alt=${Math.round(coords!.alt)}` : ""
          }`,
        );
        const json = await res.json();
        const fresh = Array.isArray(json.candidates)
          ? (json.candidates[0] as Candidate | undefined)
          : undefined;
        if (cancelled || !fresh) return; // missing → the grace timer drops the lock
        lockSeenAtRef.current = Date.now();
        const sampleAt = Date.now() - (fresh.seenPosS ?? 0) * 1000;
        const timed = { ...fresh, sampleAt };
        setCandidates((prev) =>
          prev.some((c) => c.icao24 === fresh.icao24)
            ? prev.map((c) => (c.icao24 === fresh.icao24 ? timed : c))
            : [...prev, timed], // re-add a locked plane the sweep momentarily dropped
        );
      } catch {
        /* transient */
      }
    }
    const id = setInterval(pollHex, TRACKED_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [coords, lockedId]);

  // 500 ms ticker: drives the dead-reckoning memo below AND retires a lock that
  // has gone missing from both the sweep and the fast-poll for LOCK_GRACE_MS.
  // (No synchronous first set: until the first tick nowMs is null and the memo
  // passes raw fixes through — a half-second of the old behaviour.)
  useEffect(() => {
    if (!coords) return;
    const id = setInterval(() => {
      const now = Date.now();
      setNowMs(now);
      if (lockedId && now - lockSeenAtRef.current > LOCK_GRACE_MS) {
        setLockedId(null);
      }
    }, 500);
    return () => clearInterval(id);
  }, [coords, lockedId]);

  // Stamp the lock "just seen" the moment it's set, so the grace timer starts
  // from now rather than 0 (which would drop it on the very next tick).
  useEffect(() => {
    if (lockedId) lockSeenAtRef.current = Date.now();
  }, [lockedId]);

  // Own collection for the map's new-catch colouring.
  // Progressive enhancement: if this fails, markers just stay ink.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("sightings")
          .select("aircraft_type, registration, callsign")
          .eq("user_id", user.id);
        if (!cancelled && data) {
          setCollection({
            types: new Set(
              data.map((r) => (r.aircraft_type as string | null)?.toUpperCase()).filter(Boolean) as string[],
            ),
            // Key on the ICAO callsign code — the same stable value the server's
            // discovery uses (sightings.airline_icao) — so the map's "new airline"
            // hint and the post-capture reward can never disagree.
            airlineIcaos: new Set(
              data.map((r) => callsignIcao(r.callsign as string | null)).filter(Boolean) as string[],
            ),
            regs: new Set(
              data.map((r) => normalizeReg(r.registration as string | null)).filter(Boolean),
            ),
          });
        }
      } catch {
        /* non-essential */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [result]); // a fresh capture may have added a type/airline/livery

  // Newness across the dimensions knowable pre-capture. "all" = every dimension
  // this plane has is new for you (gold); "some" = at least one (green);
  // "none" = complete dupe (ink). Unknowable dimensions don't count against gold.
  function newness(c: Candidate): { level: "all" | "some" | "none"; bits: string[]; liveryName: string | null } {
    const sl = specialLivery(c.registration);
    if (!collection) return { level: "none", bits: [], liveryName: sl?.livery ?? null };
    const bits: string[] = [];
    const dims: boolean[] = [];
    if (c.aircraftType) {
      const n = !collection.types.has(c.aircraftType.toUpperCase());
      dims.push(n);
      if (n) bits.push("type");
    }
    const airlineIcao = callsignIcao(c.callsign);
    if (airlineIcao) {
      const n = !collection.airlineIcaos.has(airlineIcao);
      dims.push(n);
      if (n) bits.push("airline");
    }
    if (sl) {
      const n = !collection.regs.has(normalizeReg(c.registration));
      dims.push(n);
      if (n) bits.push("livery");
    }
    const level = dims.length && dims.every(Boolean) ? "all" : bits.length ? "some" : "none";
    return { level, bits, liveryName: sl?.livery ?? null };
  }

  // Rarity tiers for whatever types are on the map, fetched once per code.
  useEffect(() => {
    if (view !== "map" || mapAircraft.length === 0) return;
    const codes = Array.from(
      new Set(
        mapAircraft
          .map((c) => c.aircraftType?.toUpperCase())
          .filter((c): c is string => !!c),
      ),
    ).filter((c) => !rarityRequestedRef.current.has(c));
    if (codes.length === 0) return;
    codes.forEach((c) => rarityRequestedRef.current.add(c));
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("predict_rarity", { p_codes: codes });
      if (error || !data) {
        // Transient failure — allow a retry on the next poll.
        codes.forEach((c) => rarityRequestedRef.current.delete(c));
        return;
      }
      setTypeRarity((prev) => {
        const next = { ...prev };
        for (const row of data as { code: string; tier: Rarity }[]) next[row.code] = row.tier;
        return next;
      });
    })();
  }, [mapAircraft, view]);

  // Predicted rarity for a map plane: RPC tier lifted by the same category
  // floors the DB applies at registration (helicopter/widebody ≥ uncommon,
  // military ≥ rare, vintage ≥ epic) — category from the curated map, falling
  // back to live ADS-B hints exactly like /api/sightings does.
  function mapRarity(c: Candidate): Rarity | null {
    const code = c.aircraftType?.toUpperCase();
    if (!code) return null;
    const base = typeRarity[code];
    if (!base) return null;
    const cat =
      aircraftCategory(code) ??
      (c.military ? "military" : c.adsbCategory?.toUpperCase() === "A7" ? "helicopter" : null);
    const floor: Rarity =
      cat === "vintage" ? "epic"
      : cat === "military" ? "rare"
      : cat === "helicopter" || cat === "widebody" ? "uncommon"
      : "common";
    return RARITY_RANK[floor] > RARITY_RANK[base] ? floor : base;
  }

  // Map view: poll ALL aircraft in a wider radius (not just the capture cone).
  useEffect(() => {
    if (!coords || view !== "map") return;
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(
          `/api/flights?lat=${coords!.lat}&lon=${coords!.lon}&radiusKm=80&all=1${
            coords!.alt != null ? `&alt=${Math.round(coords!.alt)}` : ""
          }`,
        );
        const json = await res.json();
        if (!cancelled && Array.isArray(json.candidates)) {
          setMapAircraft(json.candidates);
          setMapSwept(true);
        }
      } catch {
        /* transient */
      }
    }
    poll();
    const id = setInterval(poll, 6000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [coords, view]);

  // Attach the camera stream once it's running (camera → on).
  useEffect(() => {
    if (camera !== "on") return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch(() => {});
    }
    // The corner overview shares the same stream, shown unzoomed.
    if (minimapRef.current && stream) {
      minimapRef.current.srcObject = stream;
      minimapRef.current.play().catch(() => {});
    }
  }, [camera]);

  // Keep the corner overview playing whenever digital zoom is engaged.
  useEffect(() => {
    const mm = minimapRef.current;
    if (mm && streamRef.current && !zoomCaps && zoom > 1) {
      if (mm.srcObject !== streamRef.current) mm.srcObject = streamRef.current;
      mm.play().catch(() => {});
    }
  }, [zoom, zoomCaps, camera]);

  const minZoom = zoomCaps?.min ?? 1;
  const maxZoom = zoomCaps?.max ?? 4;
  const clampZoom = (v: number) => Math.min(maxZoom, Math.max(minZoom, v));

  function applyZoom(v: number) {
    setZoom(v);
    const track = trackRef.current as
      | (MediaStreamTrack & { applyConstraints?: (c: object) => Promise<void> })
      | null;
    if (zoomCaps && track?.applyConstraints) {
      track.applyConstraints({ advanced: [{ zoom: v }] }).catch(() => {});
    }
  }

  // Pinch to zoom (the explicit ask) — two-finger distance ratio against the
  // gesture-start zoom, through the same applyZoom as the buttons. Double-tap
  // resets; a wheel handler makes it testable on desktop.
  const touchDist = (e: React.TouchEvent) =>
    Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY,
    );
  function onPinchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      pinchRef.current = { dist: touchDist(e), zoom };
    } else if (e.touches.length === 1) {
      const t = e.timeStamp;
      if (t - lastTapRef.current < 300) applyZoom(minZoom);
      lastTapRef.current = t;
    }
  }
  function onPinchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchRef.current && pinchRef.current.dist > 0) {
      applyZoom(clampZoom(pinchRef.current.zoom * (touchDist(e) / pinchRef.current.dist)));
    }
  }
  function onPinchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) pinchRef.current = null;
  }
  function onZoomWheel(e: React.WheelEvent) {
    applyZoom(clampZoom(zoom * Math.exp(-e.deltaY / 500)));
  }

  // Dead-reckon every candidate to "now": the sweep is 6 s apart and a 100 m/s
  // aircraft moves 600 m between polls — tens of degrees of bearing at close
  // range. Geometry is re-derived from the projected lat/lon at full precision;
  // the raw last-fix bearing/elevation ride along for the overlay's ghost.
  const liveCandidates = useMemo<LiveCandidate[]>(() => {
    return candidates.map((c) => {
      const base: LiveCandidate = {
        ...c,
        rawBearing: c.bearing,
        rawElevation: c.elevation,
      };
      if (nowMs == null || !coords || c.track == null || c.velocityMs == null) {
        return base;
      }
      const dtSec = (nowMs - c.sampleAt) / 1000;
      if (dtSec <= 0 || dtSec > 60) return base; // stale beyond trust, or clock oddity
      const p = projectForward(c.lat, c.lon, c.track, c.velocityMs, dtSec);
      const ground = haversineMeters(coords.lat, coords.lon, p.lat, p.lon);
      return {
        ...base,
        lat: p.lat,
        lon: p.lon,
        distanceKm: Number((ground / 1000).toFixed(1)),
        bearing: bearingDeg(coords.lat, coords.lon, p.lat, p.lon),
        elevation:
          c.altM != null ? elevationDeg(ground, c.altM - (coords.alt ?? 0)) : null,
      };
    });
  }, [candidates, coords, nowMs]);

  // Is the camera pointing at this aircraft? ONE true angular-separation cone —
  // self-relaxing near the zenith where azimuth degenerates (the "directly
  // overhead" feedback), unchanged at the horizon.
  function inCone(c: LiveCandidate) {
    return (
      heading != null &&
      pitch != null &&
      c.elevation != null &&
      angularSeparation(heading, pitch, c.bearing, c.elevation) <= CONE_TOL
    );
  }

  // Locked plane (if tracking one), else the best auto-match in the cone.
  const lockedCandidate = lockedId
    ? liveCandidates.find((c) => c.icao24 === lockedId) ?? null
    : null;
  const autoMatch =
    heading != null && pitch != null
      ? liveCandidates
          .filter(inCone)
          .sort(
            (a, b) =>
              angularSeparation(heading, pitch, a.bearing, a.elevation ?? 0) -
              angularSeparation(heading, pitch, b.bearing, b.elevation ?? 0),
          )[0] ?? null
      : null;
  // Fallback so a plane you can plainly see is still capturable when the compass
  // is off and you haven't locked one: the single nearest candidate within close
  // range. (Locking still overrides it when several sit close together.)
  const nearestClose =
    liveCandidates
      .filter((c) => c.distanceKm <= CLOSE_CAPTURE_KM)
      .sort((a, b) => a.distanceKm - b.distanceKm)[0] ?? null;
  const target = lockedCandidate ?? autoMatch ?? nearestClose;
  const targetInSights = target ? inCone(target) : false;
  // Capture is allowed when we're confidently pointing (in-cone) OR the user
  // explicitly locked this plane OR it's close enough that the compass cone is
  // moot. The server still verifies; a wrong aim just lands unverified → review.
  const targetClose = target != null && target.distanceKm <= CLOSE_CAPTURE_KM;
  const canCapture =
    target != null && (targetInSights || target.icao24 === lockedId || targetClose);
  const targetLabel = (c: Candidate) => c.registration || c.callsign || c.icao24;

  // ---- Offline capture queue: drain anything stashed while we had no signal.
  const flushQueue = useCallback(async () => {
    if (flushingRef.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    flushingRef.current = true;
    try {
      const items = await listCaptures();
      for (const item of items) {
        let res: Response;
        try {
          res = await postCapture(item.blob, item.meta);
        } catch {
          break; // still offline / timing out — retry on the next trigger
        }
        if (res.ok || res.status === 409) {
          await removeCapture(item.id); // saved (409 = already logged)
        } else if (res.status === 402 || res.status === 429 || res.status >= 500) {
          // Transient — leave it queued and retry later. 402 = out of Tickets
          // today; tomorrow's daily grant can settle it.
          break;
        } else {
          await removeCapture(item.id); // 400/401/413/415 can never succeed — drop it
        }
      }
    } catch {
      /* IndexedDB hiccup — try again next trigger */
    } finally {
      flushingRef.current = false;
      try {
        setPendingCount(await countCaptures());
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Flush on mount and whenever connectivity returns.
  useEffect(() => {
    flushQueue();
    const onOnline = () => flushQueue();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [flushQueue]);

  // Ticket status for the HUD line (client created inside the effect — the
  // react-hooks rules dislike a ref-held client feeding effect deps).
  useEffect(() => {
    const supabase = createClient();
    let alive = true;
    void supabase.rpc("ticket_status").then(({ data }) => {
      const s = data as TicketStatus | null;
      if (alive && s?.ok) setTickets(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Grab the current camera frame as a JPEG blob (centre-crop under digital
  // zoom), or null if the stream isn't ready (e.g. the tab was backgrounded).
  async function grabPhotoBlob(): Promise<Blob | null> {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!video || !canvas || !ctx || !video.videoWidth) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    if (!zoomCaps && zoom > 1) {
      const sw = video.videoWidth / zoom;
      const sh = video.videoHeight / zoom;
      ctx.drawImage(video, (video.videoWidth - sw) / 2, (video.videoHeight - sh) / 2, sw, sh, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.drawImage(video, 0, 0);
    }
    return new Promise<Blob | null>((r) => canvas.toBlob((b) => r(b), "image/jpeg", 0.85));
  }

  async function submit(target: Candidate | null) {
    if (!target) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    setWall(false);
    try {
      const blob = await grabPhotoBlob();
      const metaStr = JSON.stringify({
        lat: coords?.lat,
        lon: coords?.lon,
        heading,
        pitch,
        capturedAt: Date.now(),
        icao24: target.icao24,
        callsign: target.callsign,
        registration: target.registration,
        aircraftType: target.aircraftType,
        typeDesc: target.typeDesc,
        altM: target.altM,
        obsAltM: coords?.alt,
        bearing: target.bearing,
        elevation: target.elevation,
        // Dead-reckoned plane position + ground track at capture time.
        // Diagnostic context only — the server re-queries the live feed and
        // does its own back-projection; it never reads these.
        planeLat: target.lat,
        planeLon: target.lon,
        track: target.track,
        // NOTE: verified/rarity are decided server-side; nothing the client
        // sends here can assert them.
      });

      let res: Response;
      try {
        res = await postCapture(blob, metaStr);
      } catch {
        // No response at all — offline or timed out. Don't lose the catch.
        if (blob) {
          setPendingCount(await enqueueCapture(blob, metaStr));
          setNotice(QUEUED_MSG);
        } else {
          setError("Couldn't grab the photo — try again.");
        }
        return;
      }

      if (res.ok) {
        const json = await res.json();
        const s = json.sighting ?? {};
        const ct = (json.tickets ?? null) as CaptureTickets | null;
        if (ct) {
          setTickets((t) =>
            t ? { ...t, balance: ct.balance, spots_used_today: ct.spotsUsedToday } : t,
          );
          announceTicketsChanged(ct.balance); // keep the header chip in step
        }
        setResult({
          id: s.id,
          photoUrl: json.photoUrl,
          label: s.registration || s.callsign || target.icao24,
          typeCode: s.aircraft_type ?? null,
          typeName: json.typeName ?? s.aircraft_type ?? null,
          airline: s.airline ?? null,
          origin: s.origin ?? null,
          destination: s.destination ?? null,
          rarity: s.rarity ?? "common",
          discoveries: json.discoveries ?? { type: false, airline: false, origin: false, destination: false },
          specialLivery: json.specialLivery ?? null,
          tickets: ct,
          // The saved row, card-shaped — powers the standard Lightbox on photo tap.
          sighting: {
            ...s,
            aircraft_type: json.typeName ?? s.aircraft_type ?? null,
            photo_url: json.photoUrl ?? null,
          },
        });
        flushQueue(); // opportunistic: we're clearly online, clear any backlog
        return;
      }

      if (res.status === 409) {
        setNotice("You've already logged this aircraft just now.");
        return;
      }
      if (res.status === 402) {
        // Out of free spots AND Tickets (paywall enforced). Bank the catch —
        // tomorrow's daily grant settles it on the next flush — and show the
        // earn paths instead of a dead end.
        if (blob) {
          setPendingCount(await enqueueCapture(blob, metaStr));
        }
        setWall(true);
        return;
      }
      if (res.status === 429 || res.status >= 500) {
        // Transient (rate limit / server) — queue it and let the flusher retry.
        if (blob) {
          setPendingCount(await enqueueCapture(blob, metaStr));
          setNotice(QUEUED_MSG);
        } else {
          setError("Server busy — give it a moment and try again.");
        }
        return;
      }
      // 400 / 401 / 413 / 415 — a real rejection; queuing wouldn't help.
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Could not save sighting.");
    } finally {
      setBusy(false);
    }
  }

  // ---- render ----
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      {/* view toggle — Camera captures, Map is a read-only spotting aid. The
          Camera tap doubles as the permission gesture that starts the camera. */}
      <div className="mb-3 inline-flex rounded-lg border border-paper-edge bg-paper p-0.5 font-display text-sm font-semibold uppercase tracking-wide">
        {(["map", "camera"] as const).map((v) => (
          <button
            key={v}
            onClick={() => {
              setView(v);
              if (v === "camera") startCamera();
            }}
            className={`rounded-md px-4 py-1.5 ${
              view === v ? "bg-ink text-paper" : "text-ink-soft"
            }`}
          >
            {v === "camera" ? "Camera" : "Map"}
          </button>
        ))}
      </div>

      <div
        className={`relative overflow-hidden rounded-lg border border-paper-edge bg-ink ${
          view === "camera" ? "touch-none" : ""
        }`}
        {...(view === "camera"
          ? {
              onTouchStart: onPinchStart,
              onTouchMove: onPinchMove,
              onTouchEnd: onPinchEnd,
              onWheel: onZoomWheel,
            }
          : {})}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-[58vh] w-full bg-ink object-cover"
          style={!zoomCaps && zoom > 1 ? { transform: `scale(${zoom})` } : undefined}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* camera warming up / not yet started (e.g. permission denied earlier) */}
        {view === "camera" && camera !== "on" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
            {camera === "starting" ? (
              <p className="font-display text-sm uppercase tracking-wide text-paper/80">
                Starting camera…
              </p>
            ) : (
              <>
                <p className="max-w-sm text-sm text-paper/80">
                  We&apos;ll use your camera and compass to verify the aircraft you
                  photograph. Nothing is recorded until you capture.
                </p>
                <button onClick={startCamera} className="sd-btn sd-btn--capture">
                  Open camera
                </button>
              </>
            )}
          </div>
        )}

        {view === "camera" && camera === "on" && (
          <>
            {/* targeting reticle */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className={`h-24 w-24 rounded-full border-2 ${
                  targetInSights ? "border-stamp" : "border-paper/50"
                }`}
              />
            </div>

            {/* where we CALCULATE the target to be (solid) vs its raw last
                fix (ghost) — shows whether the calc runs ahead of or behind
                the real plane */}
            {target && heading != null && pitch != null && target.elevation != null && (
              <TargetOverlay
                heading={heading}
                pitch={pitch}
                zoom={zoom}
                label={targetLabel(target)}
                distanceKm={target.distanceKm}
                track={target.track}
                target={{ bearing: target.bearing, elevation: target.elevation }}
                ghost={
                  target.rawElevation != null &&
                  (target.rawBearing !== target.bearing ||
                    target.rawElevation !== target.elevation)
                    ? { bearing: target.rawBearing, elevation: target.rawElevation }
                    : null
                }
              />
            )}

            {/* sensor readout */}
            <div className="absolute left-3 top-3 rounded bg-ink/70 px-2 py-1 font-mono text-[11px] text-paper">
              HDG {heading ?? "—"}° · ELV {pitch ?? "—"}° · {candidates.length} in range
              {feedError ? " · reconnecting…" : ""}
            </div>

            {/* zoom overview (unzoomed corner view with the framed region) */}
            <div
              className={`absolute right-3 top-3 h-20 w-28 overflow-hidden rounded border-2 border-paper/70 bg-ink ${
                !zoomCaps && zoom > 1 ? "" : "hidden"
              }`}
            >
              <video ref={minimapRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              <div
                className="absolute border border-stamp"
                style={{
                  width: `${100 / zoom}%`,
                  height: `${100 / zoom}%`,
                  left: `${50 - 50 / zoom}%`,
                  top: `${50 - 50 / zoom}%`,
                }}
              />
            </div>

            {lockedCandidate && !targetInSights && (
              <div className="absolute left-1/2 top-12 -translate-x-1/2 rounded bg-sky px-3 py-1 font-display text-sm font-semibold uppercase tracking-wide text-paper">
                Tracking {targetLabel(lockedCandidate)} — aim to confirm, or capture anyway
              </div>
            )}
            {targetInSights && target && (
              <div className="absolute left-1/2 top-12 -translate-x-1/2 rounded bg-stamp px-3 py-1 font-display text-sm font-semibold uppercase tracking-wide text-paper">
                In sights: {targetLabel(target)}
              </div>
            )}

            {/* zoom — pinch anywhere on the preview OR the legacy slider;
                double-tap resets, wheel works on desktop. touch-auto +
                stopPropagation keep slider drags out of the pinch handlers. */}
            <div
              className="absolute bottom-3 left-1/2 flex -translate-x-1/2 touch-auto items-center gap-2 rounded bg-ink/70 px-3 py-1.5"
              onTouchStart={(e) => e.stopPropagation()}
            >
              <span className="font-mono text-[11px] text-paper">{zoom.toFixed(1)}×</span>
              <input
                type="range"
                min={zoomCaps?.min ?? 1}
                max={zoomCaps?.max ?? 4}
                step={zoomCaps?.step ?? 0.1}
                value={zoom}
                onChange={(e) => applyZoom(parseFloat(e.target.value))}
                className="w-36 accent-sky"
                aria-label="Zoom"
              />
            </div>
          </>
        )}

        {view === "map" &&
          (coords ? (
            <>
              <SpotMap
                observer={coords}
                heading={heading}
                aircraft={mapAircraft.map((c) => {
                  const n = newness(c);
                  return {
                    ...c,
                    kind: mapKind(c.aircraftType, c.adsbCategory),
                    newness: n.level,
                    newBits: n.bits,
                    liveryName: n.liveryName,
                    rarity: mapRarity(c),
                  };
                })}
                lockedId={lockedId}
                onSelect={(id) => {
                  setLockedId(id);
                  setView("camera");
                  startCamera(); // the map tap is a gesture too — no extra gate
                }}
              />
              {/* sweep status chip — a bare map must say whether it's still
                  looking or the sky is genuinely quiet */}
              {/* no z-index — SpotMap's own z-10 "Loading map…" overlay covers
                  this chip until the basemap is in */}
              {(!mapSwept || mapAircraft.length === 0) && (
                <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded bg-ink/85 px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-wide text-paper">
                  {!mapSwept ? (
                    <>
                      <PlaneSpinner size={16} tone="paper" />
                      Scanning the sky…
                    </>
                  ) : (
                    "No aircraft in range right now"
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <SpinnerBlock tone="paper" label="Waiting for location…" />
            </div>
          ))}
      </div>

      {view === "map" && (
        <p className="mt-2 text-sm text-ink-soft">
          Live aircraft around you — tap one to track it, then switch to Camera to capture.
          The map never logs a sighting; only a verified photo does.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        {camera === "on" ? (
          <button
            onClick={() => submit(target)}
            disabled={!canCapture || busy}
            className={`sd-btn ${canCapture ? "sd-btn--capture" : "sd-btn--disabled"}`}
          >
            {busy
              ? "Saving…"
              : !target
                ? "No aircraft in sights"
                : targetInSights
                  ? `Capture ${targetLabel(target)}`
                  : `Capture ${targetLabel(target)} — we'll check it`}
          </button>
        ) : (
          <button
            onClick={() => {
              setView("camera");
              startCamera();
            }}
            disabled={camera === "starting"}
            className={`sd-btn ${camera === "starting" ? "sd-btn--disabled" : "sd-btn--capture"}`}
          >
            {camera === "starting" ? "Starting camera…" : "Open camera to capture"}
          </button>
        )}
        {lockedId && (
          <button onClick={() => setLockedId(null)} className="sd-btn sd-btn--log">
            Stop tracking
          </button>
        )}
      </div>

      {tickets && (
        <p className="mt-2 flex items-center gap-1.5 font-mono text-xs text-ink-soft">
          <span>
            Spots today{" "}
            <span className="font-semibold text-ink">
              {tickets.spots_used_today}/{tickets.free_spots_per_day}
            </span>
          </span>
          <span aria-hidden="true">·</span>
          <TicketGlyph className="h-3.5 w-3.5 text-brass" />
          <span className="font-semibold text-ink">{tickets.balance}</span>
        </p>
      )}

      {error && <p className="mt-3 text-sm text-stamp">{error}</p>}
      {notice && <p className="mt-3 text-sm text-sky">{notice}</p>}
      {wall && (
        <div className="mt-3 rounded-lg border border-brass bg-brass-tint p-3 text-sm text-ink">
          <p className="font-semibold">You&apos;re out of free spots and Tickets for today.</p>
          <p className="mt-1 text-ink-soft">
            Earn more by{" "}
            <Link href="/review" className="font-semibold text-sky-deep underline">
              reviewing photos
            </Link>{" "}
            (+1 each), check{" "}
            <Link href="/tickets" className="font-semibold text-sky-deep underline">
              your Tickets
            </Link>
            , or get more in the SkyDex app. Fresh spots arrive tomorrow — any banked catch
            uploads by itself.
          </p>
        </div>
      )}
      {pendingCount > 0 && (
        <p className="mt-2 font-mono text-xs text-ink-soft">
          ⏳ {pendingCount} {pendingCount === 1 ? "catch" : "catches"} waiting to upload — we&apos;ll
          send {pendingCount === 1 ? "it" : "them"} automatically once you&apos;re back online.
        </p>
      )}

      {result && (
        <DiscoveryMoment
          result={result}
          onClose={() => setResult(null)}
          onRetake={async () => {
            const res = await deleteSighting(result.id);
            if (res.ok) setResult(null);
            else window.alert(res.error ?? "Could not remove — try again.");
          }}
        />
      )}

      {/* live nearby list — tap one to track only that aircraft */}
      <h2 className="mt-8 font-display text-xl font-semibold uppercase tracking-wide text-ink-soft">
        In range
      </h2>
      <p className="mt-1 text-sm text-ink-soft">Tap a plane to track only that one.</p>
      <ul className="mt-3 divide-y divide-paper-edge rounded-lg border border-paper-edge">
        {liveCandidates.slice(0, 12).map((c) => {
          const isLocked = lockedId === c.icao24;
          const isTarget = target?.icao24 === c.icao24 && targetInSights;
          const altFt =
            c.altM != null ? `${Math.round(c.altM / 0.3048).toLocaleString()} ft` : "—";
          return (
            <li key={c.icao24}>
              <button
                onClick={() => setLockedId(isLocked ? null : c.icao24)}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left font-mono text-sm ${
                  isLocked ? "bg-sky-tint" : isTarget ? "bg-stamp-tint" : ""
                }`}
              >
                <span className="flex flex-col">
                  <span className="font-semibold text-ink">
                    {c.registration || c.callsign || c.icao24}
                    {isLocked && <span className="ml-2 text-sky">● tracking</span>}
                    {isTarget && <span className="ml-2 text-stamp">◎ in sights</span>}
                  </span>
                  {(c.typeDesc || c.callsign) && (
                    <span className="text-xs text-ink-faint">
                      {[c.typeDesc, c.callsign].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </span>
                <span className="flex flex-col text-right text-ink-soft">
                  <span>{c.distanceKm} km · {altFt}</span>
                  <span className="text-xs">
                    BRG {Math.round(c.bearing)}° · ELV{" "}
                    {c.elevation == null ? "—" : Math.round(c.elevation)}°
                  </span>
                </span>
              </button>
            </li>
          );
        })}
        {candidates.length === 0 && (
          <li className="px-4 py-3 text-sm text-ink-faint">
            {!coords
              ? "Waiting for your location…"
              : feedError
                ? "Reconnecting to live flight data…"
                : heading == null
                  ? "Move your phone in a figure-8 to calibrate the compass."
                  : "No aircraft overhead right now — try near an airport or flight corridor."}
          </li>
        )}
      </ul>
    </main>
  );
}
