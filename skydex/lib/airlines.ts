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

// Brand name → IATA code, for fetching airline logos (the logo CDN keys on
// IATA). Keyed by lowercased brand name to tolerate casing variants. Carriers
// we can't map simply get no logo (the UI falls back to the name alone).
const AIRLINE_IATA: Record<string, string> = {
  "aegean airlines": "A3",
  aeromexico: "AM",
  "air canada": "AC",
  "air china": "CA",
  "air france": "AF",
  "air india": "AI",
  "air new zealand": "NZ",
  "alaska airlines": "AS",
  "all nippon airways": "NH",
  "american airlines": "AA",
  "asiana airlines": "OZ",
  "atlas air": "5Y",
  "austrian airlines": "OS",
  azul: "AD",
  "ba euroflyer": "BA",
  "british airways": "BA",
  "brussels airlines": "SN",
  cargolux: "CV",
  "cathay pacific": "CX",
  "china airlines": "CI",
  "china eastern": "MU",
  "china southern": "CZ",
  condor: "DE",
  "delta air lines": "DL",
  easyjet: "U2",
  egyptair: "MS",
  "el al": "LY",
  "el al israel airlines": "LY",
  emirates: "EK",
  "ethiopian airlines": "ET",
  "etihad airways": "EY",
  eurowings: "EW",
  "eva air": "BR",
  "fedex express": "FX",
  finnair: "AY",
  "garuda indonesia": "GA",
  gol: "G3",
  iberia: "IB",
  "japan airlines": "JL",
  jet2: "LS",
  jetblue: "B6",
  jetstar: "JQ",
  klm: "KL",
  "korean air": "KE",
  latam: "LA",
  loganair: "LM",
  lufthansa: "LH",
  "malaysia airlines": "MH",
  norwegian: "DY",
  qantas: "QF",
  "qatar airways": "QR",
  "royal air maroc": "AT",
  "royal jordanian": "RJ",
  ryanair: "FR",
  sas: "SK",
  saudia: "SV",
  "singapore airlines": "SQ",
  "southwest airlines": "WN",
  "spirit airlines": "NK",
  swiss: "LX",
  "tap air portugal": "TP",
  "thai airways": "TG",
  "tui airways": "BY",
  "turkish airlines": "TK",
  "united airlines": "UA",
  "ups airlines": "5X",
  "virgin atlantic": "VS",
  "virgin australia": "VA",
  vueling: "VY",
  westjet: "WS",
  "wizz air": "W6",
};

/** IATA code for an airline brand name, or null if we don't have one. */
export function airlineIata(name?: string | null): string | null {
  if (!name) return null;
  return AIRLINE_IATA[name.trim().toLowerCase()] ?? null;
}

/**
 * Logo URL for an airline brand, via the Kiwi.com logo CDN (full-colour,
 * transparent PNG, keyed by IATA). Returns null when we can't resolve a code,
 * so callers can fall back to showing the name alone. Centralised here so the
 * logo source can be swapped in one place.
 */
export function airlineLogoUrl(name?: string | null): string | null {
  const code = airlineIata(name);
  return code ? `https://images.kiwi.com/airlines/64/${code}.png` : null;
}
