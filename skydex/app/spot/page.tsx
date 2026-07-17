"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { angularDiff } from "@/lib/geo";
import { aircraftCategory, mapKind } from "@/lib/aircraftTypes";
import { airlineFromCallsign } from "@/lib/airlines";
import { RARITY_RANK, type Rarity } from "@/lib/rarity";
import { specialLivery, normalizeReg } from "@/lib/specialLiveries";
import { createClient } from "@/lib/supabase/client";
import DiscoveryMoment, { type DiscoveryResult } from "@/components/DiscoveryMoment";
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
  adsbCategory: string | null;
  military: boolean;
};

// Phone compasses drift; keep the cone wide (the proposal notes 10–20°).
const HEADING_TOL = 22;
const PITCH_TOL = 22;

export default function SpotPage() {
  const [phase, setPhase] = useState<"idle" | "active">("idle");
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number; alt: number | null } | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [pitch, setPitch] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [mapAircraft, setMapAircraft] = useState<Candidate[]>([]);
  const [view, setView] = useState<"camera" | "map">("camera");
  const [lockedId, setLockedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  // What this user has already caught, across the dimensions knowable on the
  // map: type codes, airline brands, and (normalised) registrations for the
  // livery check. Colours the markers gold/green/ink. null until loaded;
  // re-fetched after each capture. (Airports are NOT knowable pre-capture —
  // routes only come from FR24 at capture time.)
  const [collection, setCollection] = useState<{
    types: Set<string>;
    airlines: Set<string>;
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

  const onOrient = useCallback((e: DeviceOrientationEvent) => {
    const anyE = e as DeviceOrientationEvent & { webkitCompassHeading?: number };
    const h =
      typeof anyE.webkitCompassHeading === "number"
        ? anyE.webkitCompassHeading
        : e.alpha != null
          ? (360 - e.alpha) % 360
          : null;
    if (h != null) setHeading(Math.round(h));
    // Rear-camera elevation ≈ device beta − 90 (held upright → ~0 at horizon).
    if (e.beta != null) setPitch(Math.round(e.beta - 90));
  }, []);

  async function start() {
    setError(null);
    try {
      const DOE = window.DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<"granted" | "denied">;
      };
      if (DOE && typeof DOE.requestPermission === "function") {
        const granted = await DOE.requestPermission();
        if (granted !== "granted") setError("Motion access denied — targeting won't work.");
      }
      // Android's plain deviceorientation alpha is relative to whatever way the
      // phone was pointing at page load, not north — use the absolute variant
      // where it exists (iOS supplies webkitCompassHeading instead).
      const orientEvent =
        "ondeviceorientationabsolute" in window
          ? "deviceorientationabsolute"
          : "deviceorientation";
      orientEventRef.current = orientEvent;
      window.addEventListener(orientEvent, onOrient as EventListener, true);

      if (!navigator.geolocation) throw new Error("No geolocation on this device.");
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

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      // The <video> only mounts once phase is "active"; attach in an effect.
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

      setPhase("active");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start capture.");
    }
  }

  // Poll live aircraft around the observer.
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
        const json = await res.json();
        if (!cancelled && Array.isArray(json.candidates)) {
          const list = json.candidates as Candidate[];
          setCandidates(list);
          // Drop the lock when the tracked plane leaves range.
          setLockedId((id) =>
            id && !list.some((c) => c.icao24 === id) ? null : id,
          );
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
  }, [coords]);

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
          .select("aircraft_type, airline, registration")
          .eq("user_id", user.id);
        if (!cancelled && data) {
          setCollection({
            types: new Set(data.map((r) => r.aircraft_type as string).filter(Boolean)),
            airlines: new Set(data.map((r) => r.airline as string).filter(Boolean)),
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
      const n = !collection.types.has(c.aircraftType);
      dims.push(n);
      if (n) bits.push("type");
    }
    const brand = airlineFromCallsign(c.callsign);
    if (brand) {
      const n = !collection.airlines.has(brand);
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
        if (!cancelled && Array.isArray(json.candidates)) setMapAircraft(json.candidates);
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

  // Attach the camera stream once the <video> has mounted (phase → active).
  useEffect(() => {
    if (phase !== "active") return;
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
  }, [phase]);

  // Keep the corner overview playing whenever digital zoom is engaged.
  useEffect(() => {
    const mm = minimapRef.current;
    if (mm && streamRef.current && !zoomCaps && zoom > 1) {
      if (mm.srcObject !== streamRef.current) mm.srcObject = streamRef.current;
      mm.play().catch(() => {});
    }
  }, [zoom, zoomCaps, phase]);

  // Release every sensor when leaving the page: camera tracks, the GPS watch,
  // and the compass listener (otherwise they keep firing after client-side nav,
  // holding the OS location indicator on and setting state on a dead component).
  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (geoWatchRef.current != null) {
        navigator.geolocation.clearWatch(geoWatchRef.current);
      }
      if (orientEventRef.current) {
        window.removeEventListener(orientEventRef.current, onOrient as EventListener, true);
      }
    },
    [onOrient],
  );

  function applyZoom(v: number) {
    setZoom(v);
    const track = trackRef.current as
      | (MediaStreamTrack & { applyConstraints?: (c: object) => Promise<void> })
      | null;
    if (zoomCaps && track?.applyConstraints) {
      track.applyConstraints({ advanced: [{ zoom: v }] }).catch(() => {});
    }
  }

  // Is the camera pointing at this aircraft (within the tolerance cone)?
  function inCone(c: Candidate) {
    return (
      heading != null &&
      pitch != null &&
      c.elevation != null &&
      angularDiff(heading, c.bearing) <= HEADING_TOL &&
      Math.abs(pitch - c.elevation) <= PITCH_TOL
    );
  }

  // Locked plane (if tracking one), else the best auto-match in the cone.
  const lockedCandidate = lockedId
    ? candidates.find((c) => c.icao24 === lockedId) ?? null
    : null;
  const autoMatch =
    heading != null && pitch != null
      ? candidates
          .filter(inCone)
          .sort(
            (a, b) =>
              angularDiff(heading, a.bearing) +
              Math.abs(pitch - (a.elevation ?? 0)) -
              (angularDiff(heading, b.bearing) + Math.abs(pitch - (b.elevation ?? 0))),
          )[0] ?? null
      : null;
  const target = lockedCandidate ?? autoMatch;
  const targetInSights = target ? inCone(target) : false;
  const targetLabel = (c: Candidate) => c.registration || c.callsign || c.icao24;

  async function submit(target: Candidate | null) {
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d")!;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        if (!zoomCaps && zoom > 1) {
          // Digital zoom: capture the centre crop so the photo matches the preview.
          const sw = video.videoWidth / zoom;
          const sh = video.videoHeight / zoom;
          ctx.drawImage(
            video,
            (video.videoWidth - sw) / 2,
            (video.videoHeight - sh) / 2,
            sw,
            sh,
            0,
            0,
            canvas.width,
            canvas.height,
          );
        } else {
          ctx.drawImage(video, 0, 0);
        }
        const blob = await new Promise<Blob | null>((r) =>
          canvas.toBlob((b) => r(b), "image/jpeg", 0.85),
        );
        if (blob) fd.append("photo", blob, "sighting.jpg");
      }
      fd.append(
        "meta",
        JSON.stringify({
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
          // Plane position + ground track at capture time (context for the
          // server's own live-feed verification).
          planeLat: target.lat,
          planeLon: target.lon,
          track: target.track,
          // NOTE: verified/rarity are decided server-side; nothing the client
          // sends here can assert them.
        }),
      );
      const res = await fetch("/api/sightings", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not save sighting.");
      const s = json.sighting ?? {};
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
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save sighting.");
    } finally {
      setBusy(false);
    }
  }

  // ---- render ----
  if (phase === "idle") {
    return (
      <main className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight">Spot</h1>
        <p className="mt-3 max-w-md text-ink-soft">
          We&apos;ll use your location, the compass, and your camera to verify the
          aircraft you photograph. Nothing is recorded until you capture.
        </p>
        <button onClick={start} className="sd-btn sd-btn--capture mt-8">
          Allow camera &amp; motion
        </button>
        {error && <p className="mt-4 text-sm text-stamp">{error}</p>}
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      {/* view toggle — Camera captures, Map is a read-only spotting aid */}
      <div className="mb-3 inline-flex rounded-lg border border-paper-edge bg-paper p-0.5 font-display text-sm font-semibold uppercase tracking-wide">
        {(["camera", "map"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-md px-4 py-1.5 ${
              view === v ? "bg-ink text-paper" : "text-ink-soft"
            }`}
          >
            {v === "camera" ? "Camera" : "Map"}
          </button>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-lg border border-paper-edge bg-ink">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-[58vh] w-full bg-ink object-cover"
          style={!zoomCaps && zoom > 1 ? { transform: `scale(${zoom})` } : undefined}
        />
        <canvas ref={canvasRef} className="hidden" />

        {view === "camera" && (
          <>
            {/* targeting reticle */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className={`h-24 w-24 rounded-full border-2 ${
                  targetInSights ? "border-stamp" : "border-paper/50"
                }`}
              />
            </div>

            {/* sensor readout */}
            <div className="absolute left-3 top-3 rounded bg-ink/70 px-2 py-1 font-mono text-[11px] text-paper">
              HDG {heading ?? "—"}° · ELV {pitch ?? "—"}° · {candidates.length} in range
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
                Tracking {targetLabel(lockedCandidate)} — point at it
              </div>
            )}
            {targetInSights && target && (
              <div className="absolute left-1/2 top-12 -translate-x-1/2 rounded bg-stamp px-3 py-1 font-display text-sm font-semibold uppercase tracking-wide text-paper">
                In sights: {targetLabel(target)}
              </div>
            )}

            {/* zoom */}
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded bg-ink/70 px-3 py-1.5">
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
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center font-display text-sm uppercase tracking-wide text-paper/80">
              Waiting for location…
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
        <button
          onClick={() => submit(target)}
          disabled={!targetInSights || busy}
          className={`sd-btn ${targetInSights ? "sd-btn--capture" : "sd-btn--disabled"}`}
        >
          {busy
            ? "Saving…"
            : targetInSights && target
              ? `Capture ${targetLabel(target)}`
              : lockedCandidate
                ? `Point at ${targetLabel(lockedCandidate)}`
                : "No aircraft in sights"}
        </button>
        {lockedId && (
          <button onClick={() => setLockedId(null)} className="sd-btn sd-btn--log">
            Stop tracking
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-stamp">{error}</p>}

      {result && <DiscoveryMoment result={result} onClose={() => setResult(null)} />}

      {/* live nearby list — tap one to track only that aircraft */}
      <h2 className="mt-8 font-display text-xl font-semibold uppercase tracking-wide text-ink-soft">
        In range
      </h2>
      <p className="mt-1 text-sm text-ink-soft">Tap a plane to track only that one.</p>
      <ul className="mt-3 divide-y divide-paper-edge rounded-lg border border-paper-edge">
        {candidates.slice(0, 12).map((c) => {
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
                  <span className="text-xs">BRG {c.bearing}° · ELV {c.elevation}°</span>
                </span>
              </button>
            </li>
          );
        })}
        {candidates.length === 0 && (
          <li className="px-4 py-3 text-sm text-ink-faint">
            No aircraft overhead right now — try near an airport or flight corridor.
          </li>
        )}
      </ul>
    </main>
  );
}
