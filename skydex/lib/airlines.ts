// Minimal ICAO airline-code → name map for deriving the operator from a
// callsign (e.g. "BAW123" → British Airways). Falls back to the raw code.
// Expanded over time; route/airline enrichment proper comes later.
const ICAO_AIRLINES: Record<string, string> = {
  BAW: "British Airways",
  SHT: "British Airways (Shuttle)",
  EZY: "easyJet",
  EXS: "Jet2",
  RYR: "Ryanair",
  VIR: "Virgin Atlantic",
  DLH: "Lufthansa",
  AFR: "Air France",
  KLM: "KLM",
  UAE: "Emirates",
  QTR: "Qatar Airways",
  ETD: "Etihad",
  THY: "Turkish Airlines",
  IBE: "Iberia",
  SWR: "Swiss",
  TAP: "TAP Air Portugal",
  FIN: "Finnair",
  SAS: "SAS",
  AUA: "Austrian",
  EWG: "Eurowings",
  WZZ: "Wizz Air",
  VLG: "Vueling",
  AAL: "American Airlines",
  UAL: "United Airlines",
  DAL: "Delta Air Lines",
  JBU: "JetBlue",
  ACA: "Air Canada",
  SIA: "Singapore Airlines",
  CPA: "Cathay Pacific",
  ANA: "All Nippon Airways",
  JAL: "Japan Airlines",
  QFA: "Qantas",
  UPS: "UPS Airlines",
  FDX: "FedEx",
  DHL: "DHL",
  RAM: "Royal Air Maroc",
};

/**
 * Consolidate an airline name to its brand by dropping a trailing AOC region
 * suffix ("easyJet Europe" → "easyJet", "Eurowings Europe" → "Eurowings").
 *
 * BUT never strip the region word when it's part of the brand itself — i.e. an
 * "…Air <Region>" name: "Air France", "Air Malta", "TAP Air Portugal", "Wizz Air
 * Malta". The old blanket strip turned "Air France" into "Air" and "TAP Air
 * Portugal" into "TAP Air" (visible on cards + the scrapbook Carriers grid).
 */
export function normalizeBrand(name?: string | null): string | null {
  if (!name) return null;
  const n = name.trim();
  const m = n.match(
    /^(.*\S)\s+(UK|Europe|Switzerland|Austria|Malta|Germany|France|Italy|Portugal|International)$/i,
  );
  // Keep the whole name when the part before the region word is (or ends in) the
  // word "Air" — there the region is the brand, not an AOC suffix.
  if (m && !/(^|\s)air$/i.test(m[1])) {
    return m[1].trim() || null;
  }
  return n || null;
}

/** Derive an operator name from an ICAO callsign prefix, or null if unknown. */
export function airlineFromCallsign(callsign?: string | null): string | null {
  if (!callsign) return null;
  const code = callsign.trim().slice(0, 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return null;
  return ICAO_AIRLINES[code] ?? code;
}

/**
 * The raw ICAO airline code from a callsign (first three letters), or null.
 * This is the STABLE key for airline *newness*: unlike a resolved brand name it
 * is identical pre-capture (live callsign on the map) and post-capture (stored
 * callsign in the discovery probe), so the two can never disagree. `airlineFrom-
 * Callsign` and FR24's `operating_as` resolved the SAME callsign to different
 * names for franchises/wet-leases (BA CityFlyer vs British Airways, Malta Air vs
 * Ryanair) — the "it says a new airline then it isn't" whiplash. The brand name
 * is still used for *display*; only the new/not-new decision keys on this code.
 */
export function callsignIcao(callsign?: string | null): string | null {
  const code = callsign?.trim().slice(0, 3).toUpperCase();
  return code && /^[A-Z]{3}$/.test(code) ? code : null;
}
