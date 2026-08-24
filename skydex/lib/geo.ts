// Spherical geometry for the verification loop.
const R = 6_371_000; // Earth radius, metres
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Great-circle ground distance between two lat/lon points, in metres. */
export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Initial compass bearing from point 1 to point 2, degrees 0–360 (0 = north). */
export function bearingDeg(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Elevation angle above the horizon, degrees, given ground distance and altitude delta (both metres). */
export function elevationDeg(groundMeters: number, deltaAltMeters: number): number {
  if (groundMeters <= 0) return 90;
  return toDeg(Math.atan2(deltaAltMeters, groundMeters));
}

/** Smallest absolute difference between two compass angles, 0–180 degrees. */
export function angularDiff(a: number, b: number): number {
  const d = Math.abs(((a - b + 540) % 360) - 180);
  return d;
}

/** Signed compass delta from `from` to `to`, −180…180 degrees (positive = clockwise/right). */
export function signedAzimuthDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

/**
 * True angular separation between two pointing directions given as
 * (azimuth, elevation) pairs, in degrees — spherical law of cosines.
 * This is the one number that should gate "am I pointing at it": it collapses
 * to the azimuth difference at the horizon and self-relaxes near the zenith,
 * where a plane can swing 90° of bearing while barely moving across the sky.
 */
export function angularSeparation(
  az1: number,
  el1: number,
  az2: number,
  el2: number,
): number {
  const e1 = toRad(el1);
  const e2 = toRad(el2);
  const dAz = toRad(az2 - az1);
  const cosSep =
    Math.sin(e1) * Math.sin(e2) + Math.cos(e1) * Math.cos(e2) * Math.cos(dAz);
  // Clamp for float noise before acos.
  return toDeg(Math.acos(Math.min(1, Math.max(-1, cosSep))));
}

/**
 * Elevation of the REAR camera's optical axis above the horizon, in degrees
 * (−90 = straight down, 0 = horizon, +90 = straight up), from the device's
 * `beta`/`gamma` orientation angles.
 *
 * The rear camera looks along the device's −Z axis, whose world-up component is
 * −cos(beta)·cos(gamma), so elevation = asin(−cos β · cos γ). Two properties the
 * old `beta − 90` lacked: it is INDEPENDENT of screen orientation (portrait vs
 * landscape is a rotation about that same Z axis, which never moves where the
 * camera points), and it neither wraps nor degenerates near the zenith. `beta −
 * 90` was only correct held upright in portrait and went 90–170° wrong held
 * sideways or aimed overhead — the "plane is on screen but the direction is well
 * off" bug.
 */
export function cameraElevation(betaDeg: number, gammaDeg: number): number {
  const up = -Math.cos(toRad(betaDeg)) * Math.cos(toRad(gammaDeg));
  return toDeg(Math.asin(Math.min(1, Math.max(-1, up))));
}

/**
 * Project a moving aircraft along its ground track. Flat-earth offset — plenty
 * accurate over the ≤2 min horizons we use it for (dead-reckoning between
 * polls, back-projecting a live sample to the shutter instant). Negative
 * `dtSec` projects backwards.
 */
export function projectForward(
  lat: number,
  lon: number,
  trackDeg: number,
  speedMs: number,
  dtSec: number,
): { lat: number; lon: number } {
  const dist = speedMs * dtSec; // metres along track
  const t = toRad(trackDeg);
  const dNorth = dist * Math.cos(t);
  const dEast = dist * Math.sin(t);
  return {
    lat: lat + dNorth / 111_320,
    lon: lon + dEast / (111_320 * Math.cos(toRad(lat))),
  };
}
