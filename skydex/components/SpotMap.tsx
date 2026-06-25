"use client";

import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MLMap, Marker as MLMarker, Popup as MLPopup } from "maplibre-gl";

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
};

type Props = {
  observer: { lat: number; lon: number };
  aircraft: MapAircraft[];
  lockedId: string | null;
  rangeKm?: number;
  onSelect: (icao24: string) => void;
};

const BRAND = { ink: "#20262b", sky: "#0e7c86", stamp: "#b5402e", paper: "#f2ebdc" };
// CARTO Positron — light vector basemap, free with attribution (already credited on /attributions).
const STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

// Polygon approximating a circle of `radiusKm` around (lat, lon).
function circle(lat: number, lon: number, radiusKm: number, points = 72): number[][] {
  const R = 6371;
  const latR = (lat * Math.PI) / 180;
  const lonR = (lon * Math.PI) / 180;
  const dr = radiusKm / R;
  const ring: number[][] = [];
  for (let i = 0; i <= points; i++) {
    const brng = (i / points) * 2 * Math.PI;
    const lat2 = Math.asin(
      Math.sin(latR) * Math.cos(dr) + Math.cos(latR) * Math.sin(dr) * Math.cos(brng),
    );
    const lon2 =
      lonR +
      Math.atan2(
        Math.sin(brng) * Math.sin(dr) * Math.cos(latR),
        Math.cos(dr) - Math.sin(latR) * Math.sin(lat2),
      );
    ring.push([(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }
  return ring;
}

function planeEl(rotation: number, color: string, scale: number): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.style.cssText = "background:none;border:none;padding:0;margin:0;cursor:pointer;line-height:0;";
  const size = 26 * scale;
  el.innerHTML =
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" ` +
    `style="transform:rotate(${rotation}deg);filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.4));">` +
    `<path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" ` +
    `fill="${color}" stroke="${BRAND.paper}" stroke-width="0.7"/></svg>`;
  return el;
}

export default function SpotMap({ observer, aircraft, lockedId, rangeKm = 40, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const mlRef = useRef<typeof import("maplibre-gl") | null>(null);
  const obsMarkerRef = useRef<MLMarker | null>(null);
  const planesRef = useRef<Record<string, { marker: MLMarker; el: HTMLButtonElement }>>({});
  const popupRef = useRef<MLPopup | null>(null);
  const readyRef = useRef(false);

  // Latest props for use inside DOM event handlers without re-binding.
  const aircraftRef = useRef(aircraft);
  aircraftRef.current = aircraft;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const observerRef = useRef(observer);
  observerRef.current = observer;

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
    box.innerHTML =
      `<div style="font-weight:700;color:${BRAND.ink};">${esc(label)}</div>` +
      `<div style="font-size:12px;color:#4a5560;margin:2px 0 8px;">${esc(sub)}</div>`;
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
      const color = locked ? BRAND.stamp : BRAND.ink;
      const scale = locked ? 1.4 : 1;
      const existing = planes[a.icao24];
      if (!existing) {
        const el = planeEl(rot, color, scale);
        el.title = a.registration || a.callsign || a.icao24;
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          openPopup(a.icao24);
        });
        const marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([a.lon, a.lat])
          .addTo(map);
        planes[a.icao24] = { marker, el };
      } else {
        existing.marker.setLngLat([a.lon, a.lat]);
        const svg = existing.el.querySelector("svg");
        if (svg) {
          const size = 26 * scale;
          svg.setAttribute("width", String(size));
          svg.setAttribute("height", String(size));
          svg.style.transform = `rotate(${rot}deg)`;
        }
        existing.el.querySelector("path")?.setAttribute("fill", color);
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

  function recenter() {
    mapRef.current?.flyTo({ center: [observer.lon, observer.lat], zoom: 9.5, duration: 600 });
  }

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" />
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
