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
  A109: "AgustaWestland AW109", A169: "Leonardo AW169", A189: "Leonardo AW189",
  EC35: "Airbus H135", EC45: "Airbus H145",
  // Military / warbirds / classics
  F16: "General Dynamics F-16", P51: "North American P-51 Mustang",
  SPIT: "Supermarine Spitfire", LANC: "Avro Lancaster", VULC: "Avro Vulcan",
  CONC: "Aérospatiale/BAC Concorde",
};

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
