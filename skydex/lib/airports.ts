// IATA airport-code → airport metadata lookup, used to reveal an airport's name
// when a spotter taps a bare code on a card, and to group the scrapbook's
// airport atlas by continent → country. Routes are stored as IATA codes only
// (see lib/route.ts), so this is the display-side mapping.
//
// Not exhaustive — covers the major hubs that scheduled airliners actually fly,
// weighted towards the UK/Europe where most early spotting happens. Unknown
// codes fall back to the bare code (airportName/airportInfo return null).
//
// Continent taste calls (kept consistent rather than argued): Turkey → Europe,
// Egypt → Africa, the Gulf/Levant → Middle East, Mexico + Panama → North America.

export type Continent =
  | "Europe"
  | "North America"
  | "South America"
  | "Asia"
  | "Middle East"
  | "Africa"
  | "Oceania";

export type AirportInfo = { name: string; country: string; continent: Continent };

const a = (name: string, country: string, continent: Continent): AirportInfo => ({
  name,
  country,
  continent,
});

const AIRPORTS: Record<string, AirportInfo> = {
  // United Kingdom & Ireland
  LHR: a("London Heathrow", "United Kingdom", "Europe"),
  LGW: a("London Gatwick", "United Kingdom", "Europe"),
  STN: a("London Stansted", "United Kingdom", "Europe"),
  LTN: a("London Luton", "United Kingdom", "Europe"),
  LCY: a("London City", "United Kingdom", "Europe"),
  SEN: a("London Southend", "United Kingdom", "Europe"),
  MAN: a("Manchester", "United Kingdom", "Europe"),
  BHX: a("Birmingham", "United Kingdom", "Europe"),
  EDI: a("Edinburgh", "United Kingdom", "Europe"),
  GLA: a("Glasgow", "United Kingdom", "Europe"),
  BRS: a("Bristol", "United Kingdom", "Europe"),
  NCL: a("Newcastle", "United Kingdom", "Europe"),
  LPL: a("Liverpool", "United Kingdom", "Europe"),
  LBA: a("Leeds Bradford", "United Kingdom", "Europe"),
  EMA: a("East Midlands", "United Kingdom", "Europe"),
  BFS: a("Belfast International", "United Kingdom", "Europe"),
  BHD: a("Belfast City", "United Kingdom", "Europe"),
  ABZ: a("Aberdeen", "United Kingdom", "Europe"),
  SOU: a("Southampton", "United Kingdom", "Europe"),
  CWL: a("Cardiff", "United Kingdom", "Europe"),
  EXT: a("Exeter", "United Kingdom", "Europe"),
  NWI: a("Norwich", "United Kingdom", "Europe"),
  DUB: a("Dublin", "Ireland", "Europe"),
  ORK: a("Cork", "Ireland", "Europe"),
  SNN: a("Shannon", "Ireland", "Europe"),
  // Western Europe
  CDG: a("Paris Charles de Gaulle", "France", "Europe"),
  ORY: a("Paris Orly", "France", "Europe"),
  BVA: a("Paris Beauvais", "France", "Europe"),
  NCE: a("Nice Côte d'Azur", "France", "Europe"),
  LYS: a("Lyon", "France", "Europe"),
  MRS: a("Marseille", "France", "Europe"),
  TLS: a("Toulouse", "France", "Europe"),
  BOD: a("Bordeaux", "France", "Europe"),
  NTE: a("Nantes", "France", "Europe"),
  AMS: a("Amsterdam Schiphol", "Netherlands", "Europe"),
  FRA: a("Frankfurt", "Germany", "Europe"),
  MUC: a("Munich", "Germany", "Europe"),
  BER: a("Berlin Brandenburg", "Germany", "Europe"),
  DUS: a("Düsseldorf", "Germany", "Europe"),
  HAM: a("Hamburg", "Germany", "Europe"),
  CGN: a("Cologne Bonn", "Germany", "Europe"),
  STR: a("Stuttgart", "Germany", "Europe"),
  BRU: a("Brussels", "Belgium", "Europe"),
  CRL: a("Brussels Charleroi", "Belgium", "Europe"),
  LUX: a("Luxembourg", "Luxembourg", "Europe"),
  GVA: a("Geneva", "Switzerland", "Europe"),
  ZRH: a("Zurich", "Switzerland", "Europe"),
  BSL: a("Basel Mulhouse", "Switzerland", "Europe"),
  VIE: a("Vienna", "Austria", "Europe"),
  MAD: a("Madrid Barajas", "Spain", "Europe"),
  BCN: a("Barcelona El Prat", "Spain", "Europe"),
  AGP: a("Málaga", "Spain", "Europe"),
  PMI: a("Palma de Mallorca", "Spain", "Europe"),
  ALC: a("Alicante", "Spain", "Europe"),
  VLC: a("Valencia", "Spain", "Europe"),
  SVQ: a("Seville", "Spain", "Europe"),
  IBZ: a("Ibiza", "Spain", "Europe"),
  LIS: a("Lisbon", "Portugal", "Europe"),
  OPO: a("Porto", "Portugal", "Europe"),
  FAO: a("Faro", "Portugal", "Europe"),
  FCO: a("Rome Fiumicino", "Italy", "Europe"),
  CIA: a("Rome Ciampino", "Italy", "Europe"),
  MXP: a("Milan Malpensa", "Italy", "Europe"),
  LIN: a("Milan Linate", "Italy", "Europe"),
  BGY: a("Milan Bergamo", "Italy", "Europe"),
  VCE: a("Venice Marco Polo", "Italy", "Europe"),
  NAP: a("Naples", "Italy", "Europe"),
  BLQ: a("Bologna", "Italy", "Europe"),
  PSA: a("Pisa", "Italy", "Europe"),
  CTA: a("Catania", "Italy", "Europe"),
  // Nordics & Baltics
  CPH: a("Copenhagen", "Denmark", "Europe"),
  ARN: a("Stockholm Arlanda", "Sweden", "Europe"),
  OSL: a("Oslo Gardermoen", "Norway", "Europe"),
  HEL: a("Helsinki Vantaa", "Finland", "Europe"),
  KEF: a("Reykjavík Keflavík", "Iceland", "Europe"),
  RIX: a("Riga", "Latvia", "Europe"),
  TLL: a("Tallinn", "Estonia", "Europe"),
  VNO: a("Vilnius", "Lithuania", "Europe"),
  // Central & Eastern Europe
  WAW: a("Warsaw Chopin", "Poland", "Europe"),
  KRK: a("Kraków", "Poland", "Europe"),
  GDN: a("Gdańsk", "Poland", "Europe"),
  PRG: a("Prague", "Czechia", "Europe"),
  BUD: a("Budapest", "Hungary", "Europe"),
  OTP: a("Bucharest Otopeni", "Romania", "Europe"),
  SOF: a("Sofia", "Bulgaria", "Europe"),
  BEG: a("Belgrade", "Serbia", "Europe"),
  ZAG: a("Zagreb", "Croatia", "Europe"),
  LJU: a("Ljubljana", "Slovenia", "Europe"),
  // Southern Europe & Mediterranean
  ATH: a("Athens", "Greece", "Europe"),
  SKG: a("Thessaloniki", "Greece", "Europe"),
  HER: a("Heraklion", "Greece", "Europe"),
  RHO: a("Rhodes", "Greece", "Europe"),
  JMK: a("Mykonos", "Greece", "Europe"),
  JTR: a("Santorini", "Greece", "Europe"),
  MLA: a("Malta", "Malta", "Europe"),
  LCA: a("Larnaca", "Cyprus", "Europe"),
  IST: a("Istanbul", "Turkey", "Europe"),
  SAW: a("Istanbul Sabiha Gökçen", "Turkey", "Europe"),
  AYT: a("Antalya", "Turkey", "Europe"),
  // Middle East
  DXB: a("Dubai International", "United Arab Emirates", "Middle East"),
  DWC: a("Dubai World Central", "United Arab Emirates", "Middle East"),
  AUH: a("Abu Dhabi", "United Arab Emirates", "Middle East"),
  DOH: a("Doha Hamad", "Qatar", "Middle East"),
  BAH: a("Bahrain", "Bahrain", "Middle East"),
  KWI: a("Kuwait", "Kuwait", "Middle East"),
  RUH: a("Riyadh", "Saudi Arabia", "Middle East"),
  JED: a("Jeddah", "Saudi Arabia", "Middle East"),
  TLV: a("Tel Aviv Ben Gurion", "Israel", "Middle East"),
  AMM: a("Amman Queen Alia", "Jordan", "Middle East"),
  // North America
  JFK: a("New York JFK", "United States", "North America"),
  EWR: a("Newark Liberty", "United States", "North America"),
  LGA: a("New York LaGuardia", "United States", "North America"),
  BOS: a("Boston Logan", "United States", "North America"),
  IAD: a("Washington Dulles", "United States", "North America"),
  DCA: a("Washington Reagan", "United States", "North America"),
  PHL: a("Philadelphia", "United States", "North America"),
  ATL: a("Atlanta", "United States", "North America"),
  MIA: a("Miami", "United States", "North America"),
  MCO: a("Orlando", "United States", "North America"),
  FLL: a("Fort Lauderdale", "United States", "North America"),
  ORD: a("Chicago O'Hare", "United States", "North America"),
  MDW: a("Chicago Midway", "United States", "North America"),
  DFW: a("Dallas Fort Worth", "United States", "North America"),
  IAH: a("Houston Bush", "United States", "North America"),
  DEN: a("Denver", "United States", "North America"),
  LAS: a("Las Vegas Harry Reid", "United States", "North America"),
  LAX: a("Los Angeles", "United States", "North America"),
  SFO: a("San Francisco", "United States", "North America"),
  SEA: a("Seattle Tacoma", "United States", "North America"),
  SAN: a("San Diego", "United States", "North America"),
  PHX: a("Phoenix Sky Harbor", "United States", "North America"),
  YYZ: a("Toronto Pearson", "Canada", "North America"),
  YVR: a("Vancouver", "Canada", "North America"),
  YUL: a("Montréal Trudeau", "Canada", "North America"),
  YYC: a("Calgary", "Canada", "North America"),
  MEX: a("Mexico City", "Mexico", "North America"),
  CUN: a("Cancún", "Mexico", "North America"),
  PTY: a("Panama City Tocumen", "Panama", "North America"),
  // Asia
  HKG: a("Hong Kong", "Hong Kong", "Asia"),
  PVG: a("Shanghai Pudong", "China", "Asia"),
  PEK: a("Beijing Capital", "China", "Asia"),
  PKX: a("Beijing Daxing", "China", "Asia"),
  CAN: a("Guangzhou", "China", "Asia"),
  NRT: a("Tokyo Narita", "Japan", "Asia"),
  HND: a("Tokyo Haneda", "Japan", "Asia"),
  KIX: a("Osaka Kansai", "Japan", "Asia"),
  ICN: a("Seoul Incheon", "South Korea", "Asia"),
  TPE: a("Taipei Taoyuan", "Taiwan", "Asia"),
  SIN: a("Singapore Changi", "Singapore", "Asia"),
  KUL: a("Kuala Lumpur", "Malaysia", "Asia"),
  BKK: a("Bangkok Suvarnabhumi", "Thailand", "Asia"),
  DMK: a("Bangkok Don Mueang", "Thailand", "Asia"),
  CGK: a("Jakarta", "Indonesia", "Asia"),
  MNL: a("Manila", "Philippines", "Asia"),
  DEL: a("Delhi Indira Gandhi", "India", "Asia"),
  BOM: a("Mumbai", "India", "Asia"),
  BLR: a("Bengaluru", "India", "Asia"),
  MAA: a("Chennai", "India", "Asia"),
  HYD: a("Hyderabad", "India", "Asia"),
  CMB: a("Colombo", "Sri Lanka", "Asia"),
  MLE: a("Malé", "Maldives", "Asia"),
  // Africa
  CAI: a("Cairo", "Egypt", "Africa"),
  JNB: a("Johannesburg", "South Africa", "Africa"),
  CPT: a("Cape Town", "South Africa", "Africa"),
  NBO: a("Nairobi", "Kenya", "Africa"),
  ADD: a("Addis Ababa", "Ethiopia", "Africa"),
  LOS: a("Lagos", "Nigeria", "Africa"),
  CMN: a("Casablanca", "Morocco", "Africa"),
  RAK: a("Marrakesh", "Morocco", "Africa"),
  TUN: a("Tunis", "Tunisia", "Africa"),
  ALG: a("Algiers", "Algeria", "Africa"),
  MRU: a("Mauritius", "Mauritius", "Africa"),
  // Oceania
  SYD: a("Sydney", "Australia", "Oceania"),
  MEL: a("Melbourne", "Australia", "Oceania"),
  BNE: a("Brisbane", "Australia", "Oceania"),
  PER: a("Perth", "Australia", "Oceania"),
  AKL: a("Auckland", "New Zealand", "Oceania"),
  // South America
  GRU: a("São Paulo Guarulhos", "Brazil", "South America"),
  GIG: a("Rio de Janeiro Galeão", "Brazil", "South America"),
  EZE: a("Buenos Aires Ezeiza", "Argentina", "South America"),
  SCL: a("Santiago", "Chile", "South America"),
  BOG: a("Bogotá", "Colombia", "South America"),
  LIM: a("Lima", "Peru", "South America"),
};

/** Full airport metadata for an IATA code, or null if not in the lookup. */
export function airportInfo(code?: string | null): AirportInfo | null {
  if (!code) return null;
  return AIRPORTS[code.trim().toUpperCase()] ?? null;
}

/** Full airport name for an IATA code, or null if not in the lookup. */
export function airportName(code?: string | null): string | null {
  return airportInfo(code)?.name ?? null;
}

/** Sorted {code, name} list — powers the home-airport autocomplete. */
export const AIRPORTS_LIST: { code: string; name: string }[] = Object.entries(AIRPORTS)
  .map(([code, info]) => ({ code, name: info.name }))
  .sort((a, b) => a.code.localeCompare(b.code));
