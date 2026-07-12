"use client";

import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MLMap, Marker as MLMarker, Popup as MLPopup } from "maplibre-gl";
import type { MapKind } from "@/lib/aircraftTypes";

// A read-only situational map: what's overhead right now, where you'd point.
// It never captures — tapping a plane only tracks it and hands back to the camera.

export type MapAircraft = {
  icao24: string;
  callsign: string;
  registration: string | null;
  typeDesc: string | null;
  lat: number;
  lon: number;
  track: number | null;
  bearing: number;
  distanceKm: number;
  kind: MapKind; // icon shape: heli / light / narrow / wide
  // How much of this plane is uncaught for the viewer, across the dimensions
  // knowable pre-capture (type / airline / special livery):
  newness: "all" | "some" | "none"; // gold / green / ink
  newBits: string[]; // which dimensions are new, for the popup
  liveryName: string | null; // special-livery name, when the airframe wears one
};

type Props = {
  observer: { lat: number; lon: number };
  aircraft: MapAircraft[];
  lockedId: string | null;
  heading: number | null; // device compass — drives the field-of-view cone
  rangeKm?: number;
  onSelect: (icao24: string) => void;
};

// green mirrors --color-rarity-uncommon: "some of this plane is new for you".
const BRAND = {
  ink: "#20262b",
  sky: "#0e7c86",
  stamp: "#b5402e",
  paper: "#f2ebdc",
  brass: "#b98a2e",
  green: "#3e7a5a",
};
// Mirror the capture logic's HEADING_TOL (spot page) — the cone IS the window
// the camera would accept a target in, so what you see is what you can catch.
const FOV_HALF_ANGLE = 22;
// CARTO Positron — light vector basemap, free with attribution (already credited on /attributions).
const STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

// Destination point `distKm` from (lat, lon) along bearing `brngDeg`.
function destPoint(lat: number, lon: number, brngDeg: number, distKm: number): number[] {
  const R = 6371;
  const latR = (lat * Math.PI) / 180;
  const lonR = (lon * Math.PI) / 180;
  const dr = distKm / R;
  const brng = (brngDeg * Math.PI) / 180;
  const lat2 = Math.asin(
    Math.sin(latR) * Math.cos(dr) + Math.cos(latR) * Math.sin(dr) * Math.cos(brng),
  );
  const lon2 =
    lonR +
    Math.atan2(
      Math.sin(brng) * Math.sin(dr) * Math.cos(latR),
      Math.cos(dr) - Math.sin(latR) * Math.sin(lat2),
    );
  return [(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI];
}

// Polygon approximating a circle of `radiusKm` around (lat, lon).
function circle(lat: number, lon: number, radiusKm: number, points = 72): number[][] {
  const ring: number[][] = [];
  for (let i = 0; i <= points; i++) {
    ring.push(destPoint(lat, lon, (i / points) * 360, radiusKm));
  }
  return ring;
}

// Field-of-view wedge: observer apex, arc at `lengthKm`, ±halfAngle around heading.
function fovSector(
  lat: number,
  lon: number,
  headingDeg: number,
  halfAngle: number,
  lengthKm: number,
): number[][] {
  const ring: number[][] = [[lon, lat]];
  for (let a = headingDeg - halfAngle; a <= headingDeg + halfAngle; a += 4) {
    ring.push(destPoint(lat, lon, a, lengthKm));
  }
  ring.push(destPoint(lat, lon, headingDeg + halfAngle, lengthKm));
  ring.push([lon, lat]);
  return ring;
}

const EMPTY_FEATURE: GeoJSON.Feature = {
  type: "Feature",
  geometry: { type: "Polygon", coordinates: [] },
  properties: {},
};

// One silhouette per kind, all nose-up in a 24×24 viewBox. Size differences do
// most of the talking: a widebody reads bigger than a Cessna at a glance.
const GLYPH_SIZE: Record<MapKind, number> = { heli: 24, light: 19, narrow: 26, wide: 34 };

function glyphSvg(kind: MapKind, color: string): string {
  const outline = `fill="${color}" stroke="${BRAND.paper}" stroke-width="0.7"`;
  switch (kind) {
    case "heli":
      // Rotor cross over a stubby fuselage + tail boom.
      return (
        `<path d="M12 6.6c1.9 0 3.1 1.4 3.1 3.3 0 1.5-.9 2.7-2.1 3.1l.5 5.6 2.5 1.3v1.4l-3.4-.7-3.4.7v-1.4l2.5-1.3.5-5.6c-1.2-.4-2.1-1.6-2.1-3.1 0-1.9 1.2-3.3 3.1-3.3z" ${outline}/>` +
        `<g stroke="${color}" stroke-width="1.7" stroke-linecap="round" opacity="0.95">` +
        `<line x1="4.5" y1="2.5" x2="19.5" y2="17.5"/><line x1="19.5" y1="2.5" x2="4.5" y2="17.5"/></g>`
      );
    case "light":
      // High straight wing well forward — small GA / bizjet.
      return (
        `<path d="M12 2.4c.55 0 1 .5 1 1.1v3l9 1v2.1l-9 .3-.4 7.6 2.7 1.7v1.4l-3.3-.8-3.3.8v-1.4l2.7-1.7-.4-7.6-9-.3V7.5l9-1v-3c0-.6.45-1.1 1-1.1z" ${outline}/>`
      );
    case "wide":
      // Longer fuselage, deeper swept wing + bigger tail.
      return (
        `<path d="M12 1.6c.75 0 1.25.75 1.25 1.7v5.5l9.35 6v2.2l-9.35-3v4.6l2.9 2.2v1.7L12 21.4l-4.15 1.1v-1.7l2.9-2.2v-4.6l-9.35 3v-2.2l9.35-6V3.3c0-.95.5-1.7 1.25-1.7z" ${outline}/>`
      );
    default:
      // Narrowbody — the original SkyDex jet.
      return (
        `<path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" ${outline}/>`
      );
  }
}

function planeMarkup(kind: MapKind, rotation: number, color: string, scale: number): string {
  const size = GLYPH_SIZE[kind] * scale;
  return (
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" ` +
    `style="transform:rotate(${rotation}deg);filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.4));">` +
    `${glyphSvg(kind, color)}</svg>`
  );
}

// Special-livery airframes get a dashed brass ring around the marker,
// independent of the fill colour (CSS outline follows the border-radius).
function applyLiveryRing(el: HTMLButtonElement, special: boolean) {
  el.style.borderRadius = "9999px";
  el.style.outline = special ? `1.5px dashed ${BRAND.brass}` : "none";
  el.style.outlineOffset = "2px";
}

function planeEl(
  kind: MapKind,
  rotation: number,
  color: string,
  scale: number,
  special: boolean,
): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.style.cssText = "background:none;border:none;padding:0;margin:0;cursor:pointer;line-height:0;";
  applyLiveryRing(el, special);
  el.innerHTML = planeMarkup(kind, rotation, color, scale);
  return el;
}

export default function SpotMap({
  observer,
  aircraft,
  lockedId,
  heading,
  rangeKm = 40,
  onSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const mlRef = useRef<typeof import("maplibre-gl") | null>(null);
  const obsMarkerRef = useRef<MLMarker | null>(null);
  const planesRef = useRef<Record<string, { marker: MLMarker; el: HTMLButtonElement; sig: string }>>({});
  const popupRef = useRef<MLPopup | null>(null);
  const readyRef = useRef(false);

  // Latest props for use inside DOM event handlers without re-binding.
  const aircraftRef = useRef(aircraft);
  aircraftRef.current = aircraft;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const observerRef = useRef(observer);
  observerRef.current = observer;
  const headingRef = useRef(heading);
  headingRef.current = heading;

  function fovData(): GeoJSON.Feature {
    const o = observerRef.current;
    const h = headingRef.current;
    if (h == null) return EMPTY_FEATURE;
    return {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [fovSector(o.lat, o.lon, h, FOV_HALF_ANGLE, rangeKm * 0.45)],
      },
      properties: {},
    };
  }

  // Init once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !containerRef.current) return;
      mlRef.current = maplibregl;
      const o = observerRef.current;
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: STYLE_URL,
        center: [o.lon, o.lat],
        zoom: 9.5,
        attributionControl: { compact: true },
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
      mapRef.current = map;

      map.on("load", () => {
        if (cancelled) return;
        const oo = observerRef.current;
        map.addSource("range", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [circle(oo.lat, oo.lon, rangeKm)] },
            properties: {},
          },
        });
        map.addLayer({
          type: "fill",
          id: "range-fill",
          source: "range",
          paint: { "fill-color": BRAND.sky, "fill-opacity": 0.06 },
        });
        map.addLayer({
          type: "line",
          id: "range-line",
          source: "range",
          paint: { "line-color": BRAND.sky, "line-opacity": 0.5, "line-width": 1.5, "line-dasharray": [3, 2] },
        });

        // Field-of-view cone — where the phone is pointing, sized to the
        // capture heading tolerance. Empty until the compass reports.
        map.addSource("fov", { type: "geojson", data: fovData() });
        map.addLayer({
          type: "fill",
          id: "fov-fill",
          source: "fov",
          paint: { "fill-color": BRAND.brass, "fill-opacity": 0.18 },
        });
        map.addLayer({
          type: "line",
          id: "fov-line",
          source: "fov",
          paint: { "line-color": BRAND.brass, "line-opacity": 0.6, "line-width": 1 },
        });

        const dot = document.createElement("div");
        dot.style.cssText =
          `width:16px;height:16px;border-radius:9999px;background:${BRAND.sky};` +
          `border:3px solid ${BRAND.paper};box-shadow:0 0 0 2px ${BRAND.sky}55;`;
        obsMarkerRef.current = new maplibregl.Marker({ element: dot, anchor: "center" })
          .setLngLat([oo.lon, oo.lat])
          .addTo(map);

        readyRef.current = true;
        syncPlanes();
      });
    })();

    return () => {
      cancelled = true;
      popupRef.current?.remove();
      Object.values(planesRef.current).forEach((p) => p.marker.remove());
      planesRef.current = {};
      mapRef.current?.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openPopup(id: string) {
    const map = mapRef.current;
    const maplibregl = mlRef.current;
    if (!map || !maplibregl) return;
    const a = aircraftRef.current.find((x) => x.icao24 === id);
    if (!a) return;
    const label = a.registration || a.callsign || a.icao24;
    const sub = [a.typeDesc, `${a.distanceKm} km`].filter(Boolean).join(" · ");
    const box = document.createElement("div");
    box.style.cssText = "font-family:system-ui,sans-serif;min-width:150px;";
    const liveryLine = a.liveryName
      ? `<div style="font-size:12px;color:${BRAND.brass};margin:0 0 2px;">✦ ${esc(a.liveryName)}</div>`
      : "";
    const newLine = a.newBits.length
      ? `<div style="font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;` +
        `color:${a.newness === "all" ? BRAND.brass : BRAND.green};margin:0 0 8px;">` +
        `New for you: ${esc(a.newBits.join(" · "))}</div>`
      : "";
    box.innerHTML =
      `<div style="font-weight:700;color:${BRAND.ink};">${esc(label)}</div>` +
      `<div style="font-size:12px;color:#4a5560;margin:2px 0 ${liveryLine || newLine ? "4px" : "8px"};">${esc(sub)}</div>` +
      liveryLine +
      newLine;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Track & aim →";
    btn.style.cssText =
      `display:block;width:100%;background:${BRAND.sky};color:${BRAND.paper};border:none;` +
      `border-radius:6px;padding:7px 10px;font-weight:600;font-size:13px;cursor:pointer;`;
    btn.addEventListener("click", () => {
      onSelectRef.current(id);
      popupRef.current?.remove();
    });
    box.appendChild(btn);

    popupRef.current?.remove();
    popupRef.current = new maplibregl.Popup({ closeButton: true, offset: 16 })
      .setLngLat([a.lon, a.lat])
      .setDOMContent(box)
      .addTo(map);
  }

  function syncPlanes() {
    const map = mapRef.current;
    const maplibregl = mlRef.current;
    if (!map || !maplibregl || !readyRef.current) return;
    const planes = planesRef.current;
    const seen = new Set<string>();

    for (const a of aircraftRef.current) {
      seen.add(a.icao24);
      const rot = a.track ?? a.bearing ?? 0;
      const locked = a.icao24 === lockedId;
      const special = a.liveryName != null;
      // Tracking wins; then gold = everything about it is new for you,
      // green = something is, ink = complete dupe.
      const color = locked
        ? BRAND.stamp
        : a.newness === "all"
          ? BRAND.brass
          : a.newness === "some"
            ? BRAND.green
            : BRAND.ink;
      const scale = locked ? 1.4 : 1;
      const sig = `${a.kind}|${rot}|${color}|${scale}|${special}`;
      const existing = planes[a.icao24];
      if (!existing) {
        const el = planeEl(a.kind, rot, color, scale, special);
        el.title = a.registration || a.callsign || a.icao24;
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          openPopup(a.icao24);
        });
        const marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([a.lon, a.lat])
          .addTo(map);
        planes[a.icao24] = { marker, el, sig };
      } else {
        existing.marker.setLngLat([a.lon, a.lat]);
        if (existing.sig !== sig) {
          existing.el.innerHTML = planeMarkup(a.kind, rot, color, scale);
          applyLiveryRing(existing.el, special);
          existing.sig = sig;
        }
      }
    }

    for (const id of Object.keys(planes)) {
      if (!seen.has(id)) {
        planes[id].marker.remove();
        delete planes[id];
      }
    }
  }

  // Re-sync markers when the aircraft set or the locked plane changes.
  useEffect(() => {
    syncPlanes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aircraft, lockedId]);

  // Follow the observer (move dot + range ring) without yanking the user's pan.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    obsMarkerRef.current?.setLngLat([observer.lon, observer.lat]);
    const src = map.getSource("range") as { setData?: (d: unknown) => void } | undefined;
    src?.setData?.({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [circle(observer.lat, observer.lon, rangeKm)] },
      properties: {},
    });
  }, [observer, rangeKm]);

  // Swing the field-of-view cone with the compass (and observer moves).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const src = map.getSource("fov") as { setData?: (d: unknown) => void } | undefined;
    src?.setData?.(fovData());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heading, observer, rangeKm]);

  function recenter() {
    mapRef.current?.flyTo({ center: [observer.lon, observer.lat], zoom: 9.5, duration: 600 });
  }

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1 rounded bg-ink/75 px-2.5 py-1.5 font-mono text-[10px] leading-4 text-paper">
        <span>
          <span style={{ color: BRAND.brass }}>✈</span> all new for you
        </span>
        <span>
          <span style={{ color: "#5ea87f" }}>✈</span> something new
        </span>
        <span>
          <span style={{ color: BRAND.stamp }}>✈</span> tracking
        </span>
        <span>
          <span style={{ color: BRAND.brass }}>◌</span> special livery
        </span>
      </div>
      <button
        type="button"
        onClick={recenter}
        className="absolute bottom-3 right-3 rounded bg-ink/80 px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-wide text-paper"
      >
        Recenter
      </button>
    </div>
  );
}
