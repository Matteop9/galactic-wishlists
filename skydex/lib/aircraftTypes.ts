// Canonical, license-clean ICAO aircraft type designator → friendly name.
//
// Compiled from public ICAO Doc 8643 type designators + manufacturer/model names
// (factual reference data, our own compilation). This REPLACES airplanes.live's
// `desc` field as the source of the names we persist into the `aircraft_types`
// universe — that feed's free tier is non-commercial, so persisting its strings was
// a licensing risk for the FR24-acquisition goal (see research/data-licences.md).
// The live feed / FR24 still supply the ICAO *code*; this map supplies the name.
//
// Mirrors the static-map pattern of lib/airports.ts / lib/airlines.ts. Unknown codes
// fall back to the raw ICAO code (the self-growing universe seeds those as common
// until curated here).
export const AIRCRAFT_TYPE_NAMES: Record<string, string> = {
  // Airbus
  A19N: "Airbus A319neo", A20N: "Airbus A320neo", A21N: "Airbus A321neo",
  A318: "Airbus A318", A319: "Airbus A319", A320: "Airbus A320", A321: "Airbus A321",
  A306: "Airbus A300-600", A310: "Airbus A310",
  A332: "Airbus A330-200", A333: "Airbus A330-300", A338: "Airbus A330-800neo",
  A339: "Airbus A330-900neo", A343: "Airbus A340-300", A345: "Airbus A340-500",
  A346: "Airbus A340-600", A359: "Airbus A350-900", A35K: "Airbus A350-1000",
  A388: "Airbus A380-800", A400: "Airbus A400M Atlas",
  BCS1: "Airbus A220-100", BCS3: "Airbus A220-300",
  // Boeing
  B712: "Boeing 717", B722: "Boeing 727-200",
  B733: "Boeing 737-300", B734: "Boeing 737-400", B735: "Boeing 737-500",
  B736: "Boeing 737-600", B737: "Boeing 737-700", B738: "Boeing 737-800",
  B739: "Boeing 737-900", B38M: "Boeing 737 MAX 8", B39M: "Boeing 737 MAX 9",
  B37M: "Boeing 737 MAX 7", B3XM: "Boeing 737 MAX 10",
  B741: "Boeing 747-100", B742: "Boeing 747-200", B743: "Boeing 747-300",
  B744: "Boeing 747-400", B748: "Boeing 747-8", B74F: "Boeing 747-400F",
  B752: "Boeing 757-200", B753: "Boeing 757-300",
  B762: "Boeing 767-200", B763: "Boeing 767-300", B764: "Boeing 767-400",
  B772: "Boeing 777-200", B77L: "Boeing 777-200LR", B773: "Boeing 777-300",
  B77W: "Boeing 777-300ER", B77F: "Boeing 777F", B778: "Boeing 777-8", B779: "Boeing 777-9",
  B788: "Boeing 787-8", B789: "Boeing 787-9", B78X: "Boeing 787-10",
  B17: "Boeing B-17 Flying Fortress", B52: "Boeing B-52 Stratofortress",
  // Embraer
  E135: "Embraer ERJ-135", E145: "Embraer ERJ-145",
  E170: "Embraer 170", E175: "Embraer 175", E75L: "Embraer 175",
  E190: "Embraer 190", E195: "Embraer 195", E290: "Embraer E190-E2", E295: "Embraer E195-E2",
  E55P: "Embraer Phenom 300", E50P: "Embraer Phenom 100",
  // Bombardier / Canadair
  CRJ2: "Bombardier CRJ200", CRJ7: "Bombardier CRJ700", CRJ9: "Bombardier CRJ900",
  CRJX: "Bombardier CRJ1000", CL35: "Bombardier Challenger 350",
  CL60: "Bombardier Challenger 600", GLEX: "Bombardier Global Express",
  GL7T: "Bombardier Global 7500", GL5T: "Bombardier Global 5000",
  // ATR / De Havilland / regional turboprops
  AT43: "ATR 42-300", AT45: "ATR 42-500", AT46: "ATR 42-600", AT72: "ATR 72",
  AT75: "ATR 72-500", AT76: "ATR 72-600",
  DH8A: "De Havilland Dash 8-100", DH8B: "De Havilland Dash 8-200",
  DH8C: "De Havilland Dash 8-300", DH8D: "De Havilland Dash 8 Q400",
  SF34: "Saab 340", SB20: "Saab 2000",
  // McDonnell Douglas / Douglas / Lockheed
  DC3: "Douglas DC-3", DC10: "McDonnell Douglas DC-10",
  MD11: "McDonnell Douglas MD-11", MD82: "McDonnell Douglas MD-82",
  MD83: "McDonnell Douglas MD-83", MD88: "McDonnell Douglas MD-88",
  MD90: "McDonnell Douglas MD-90", L101: "Lockheed L-1011 TriStar",
  C130: "Lockheed C-130 Hercules",
  // Antonov / Ilyushin / Tupolev
  AN12: "Antonov An-12", A124: "Antonov An-124", A225: "Antonov An-225 Mriya",
  IL76: "Ilyushin Il-76", TU95: "Tupolev Tu-95",
  // Business / GA
  C172: "Cessna 172", C152: "Cessna 152", C25A: "Cessna Citation CJ2",
  C25B: "Cessna Citation CJ3", C68A: "Cessna Citation Latitude",
  F2TH: "Dassault Falcon 2000", FA7X: "Dassault Falcon 7X", FA8X: "Dassault Falcon 8X",
  GLF5: "Gulfstream V", GLF6: "Gulfstream G650", GLF4: "Gulfstream IV",
  LJ45: "Learjet 45", LJ60: "Learjet 60", PC12: "Pilatus PC-12",
  PA28: "Piper PA-28", BE20: "Beechcraft King Air 200", BE9L: "Beechcraft King Air 90",
  // Helicopters
  A109: "AgustaWestland AW109", A119: "Leonardo AW119 Koala",
  A139: "Leonardo AW139", A149: "Leonardo AW149",
  A169: "Leonardo AW169", A189: "Leonardo AW189",
  EC20: "Airbus H120", EC25: "Airbus H225 Super Puma", EC30: "Airbus H130",
  EC35: "Airbus H135", EC45: "Airbus H145", EC55: "Airbus H155", EC75: "Airbus H175",
  AS50: "Airbus H125", AS55: "Airbus AS355",
  R22: "Robinson R22", R44: "Robinson R44", R66: "Robinson R66",
  B06: "Bell 206", B407: "Bell 407", B412: "Bell 412", B429: "Bell 429",
  S76: "Sikorsky S-76", S92: "Sikorsky S-92",
  // Military / warbirds / classics
  F16: "General Dynamics F-16", F15: "McDonnell Douglas F-15 Eagle",
  F18: "Boeing F/A-18 Hornet", F35: "Lockheed Martin F-35 Lightning II",
  EUFI: "Eurofighter Typhoon", HAWK: "BAE Hawk", A10: "Fairchild A-10 Thunderbolt II",
  C17: "Boeing C-17 Globemaster III", C30J: "Lockheed C-130J Super Hercules",
  C5M: "Lockheed C-5M Super Galaxy", K35R: "Boeing KC-135 Stratotanker",
  P8: "Boeing P-8 Poseidon", V22: "Bell Boeing V-22 Osprey",
  TEX2: "Beechcraft T-6 Texan II", H60: "Sikorsky UH-60 Black Hawk",
  P51: "North American P-51 Mustang",
  SPIT: "Supermarine Spitfire", LANC: "Avro Lancaster", VULC: "Avro Vulcan",
  CONC: "Aérospatiale/BAC Concorde",
  // Special freighters
  A3ST: "Airbus Beluga", A337: "Airbus BelugaXL", BLCF: "Boeing 747 Dreamlifter",
};

// ---- Category taxonomy — mirrors the CHECK constraint on aircraft_types ----
// Single source of truth for classifying a type code, used at capture time (to
// register new types with the right category → rarity floor) and on the spot
// map (icon shape per kind). Military trumps helicopter (an H60 is military).

export type AircraftCategory =
  | "widebody" | "narrowbody" | "regional" | "business jet"
  | "general aviation" | "freighter" | "helicopter" | "military" | "vintage";

const CATEGORY_SETS: Record<AircraftCategory, string> = {
  widebody:
    "A306 A310 A332 A333 A338 A339 A343 A345 A346 A359 A35K A388 " +
    "B744 B748 B762 B763 B764 B772 B77L B773 B77W B778 B779 B788 B789 B78X MD11",
  narrowbody:
    "A19N A20N A21N A318 A319 A320 A321 BCS1 BCS3 " +
    "B712 B733 B734 B735 B736 B737 B738 B739 B37M B38M B39M B3XM B752 B753",
  regional:
    "E135 E145 E170 E175 E75L E190 E195 E290 E295 " +
    "CRJ2 CRJ7 CRJ9 CRJX AT43 AT45 AT46 AT72 AT75 AT76 " +
    "DH8A DH8B DH8C DH8D SF34 SB20",
  "business jet":
    "C25A C25B C68A CL35 CL60 GLEX GL7T GL5T E55P E50P " +
    "F2TH FA7X FA8X GLF4 GLF5 GLF6 LJ45 LJ60",
  "general aviation": "C172 C152 PA28 PC12 PC7 BE20 BE9L SR22 DA40 DA42 TBM9",
  freighter: "B74F B77F AN12 A124 A225 IL76 A3ST A337 BLCF",
  helicopter:
    "A109 A119 A139 A149 A169 A189 EC20 EC25 EC30 EC35 EC45 EC55 EC75 " +
    "AS50 AS55 R22 R44 R66 B06 B407 B412 B429 S76 S92",
  military:
    "A400 B52 C130 C30J C17 C5M K35R P8 V22 TU95 " +
    "F15 F16 F18 F35 EUFI HAWK A10 TEX2 H60",
  vintage:
    "B17 B722 B741 B742 B743 DC3 DC10 L101 MD82 MD83 MD88 MD90 " +
    "P51 SPIT LANC VULC CONC",
};

const CATEGORY_BY_CODE: Record<string, AircraftCategory> = {};
for (const [cat, codes] of Object.entries(CATEGORY_SETS) as [AircraftCategory, string][]) {
  for (const code of codes.split(/\s+/)) CATEGORY_BY_CODE[code] = cat;
}

/** Curated category for an ICAO type code, or null when uncurated. */
export function aircraftCategory(code: string | null): AircraftCategory | null {
  if (!code) return null;
  return CATEGORY_BY_CODE[code.toUpperCase()] ?? null;
}

// ---- Map icon kind — the visual class a plane marker takes on the spot map ----

export type MapKind = "heli" | "light" | "narrow" | "wide";

// Heavy military transports/tankers read as widebodies on the map.
const HEAVY_MILITARY = new Set(["A400", "C130", "C30J", "C17", "C5M", "K35R", "B52", "TU95", "P8"]);

/**
 * Icon class for a type code, falling back to the live feed's ADS-B emitter
 * category (A1 light … A5 heavy, A7 rotorcraft) for uncurated codes.
 */
export function mapKind(code: string | null, adsbCategory?: string | null): MapKind {
  const cat = aircraftCategory(code);
  if (cat) {
    switch (cat) {
      case "helicopter": return "heli";
      case "widebody":
      case "freighter": return "wide";
      case "business jet":
      case "general aviation": return "light";
      case "military": return HEAVY_MILITARY.has(code!.toUpperCase()) ? "wide" : "light";
      default: return "narrow"; // narrowbody, regional, vintage
    }
  }
  const a = (adsbCategory ?? "").toUpperCase();
  if (a === "A7") return "heli";
  if (a === "A1" || a === "A2") return "light";
  if (a === "A5") return "wide";
  return "narrow";
}

// Leading-manufacturer prefixes stripped to get the short display name (e.g.
// "Airbus A320neo" → "A320neo", "Boeing 737-800" → "737-800"). Regional/GA brands
// (ATR, Pilatus, Dassault, Gulfstream-model names, etc.) are intentionally kept where
// the model alone would be meaningless. Kept in sync with the DB re-seed (regexp_replace).
const MANUFACTURER_RE =
  /^(Airbus|Boeing|McDonnell Douglas|Embraer|Bombardier|De Havilland|Lockheed|Ilyushin|Antonov|Tupolev|Cessna|Piper|Saab|Learjet|Gulfstream|Aérospatiale\/BAC|Aerospatiale\/BAC|North American|Supermarine|Avro|General Dynamics)\s+/i;

/** Full friendly name for an ICAO type code (e.g. "A20N" → "Airbus A320neo"), or null. */
export function aircraftTypeName(code: string | null): string | null {
  if (!code) return null;
  return AIRCRAFT_TYPE_NAMES[code.toUpperCase()] ?? null;
}

/** Short display name (manufacturer stripped) — what cards/grids show. */
export function aircraftTypeDisplay(code: string | null): string | null {
  const name = aircraftTypeName(code);
  return name ? name.replace(MANUFACTURER_RE, "").trim() : null;
}
