import { AppData, Game, HomeAway } from "./types";

export const DEFAULT_TEMPLATE = `Hi Neil,

Hope all is well!

Please could I apply for {count} for {opponent} on {date}?

{members}

Many thanks as always.

{applier}`;

function g(
  id: string,
  date: string,
  opponent: string,
  homeAway: HomeAway,
  loyaltyPoints: boolean,
  openDate: string,
  closeDate: string,
  notes = ""
): Game {
  return {
    id,
    date,
    opponent,
    competition: "Premier League",
    homeAway,
    orderOpen: `${openDate}T10:00`,
    orderClose: `${closeDate}T12:00`,
    loyaltyPoints,
    notes,
  };
}

const EXT = "Extended window (UK holidays)";
const PLAT = "Platinum clubs only";

// Transcribed from the club's Order Periods PDF (2026-27).
// Applications open 10am on the first day and close 12 noon on the last day (UK time).
const HOME_GAMES: Game[] = [
  g("h-brighton", "2026-08-29", "Brighton & Hove Albion", "H", false, "2026-07-17", "2026-07-23"),
  g("h-hull", "2026-09-12", "Hull City", "H", false, "2026-07-31", "2026-08-06"),
  g("h-bournemouth", "2026-10-10", "AFC Bournemouth", "H", false, "2026-08-20", "2026-08-24"),
  g("h-tottenham", "2026-10-24", "Tottenham Hotspur", "H", true, "2026-09-04", "2026-09-07"),
  g("h-manutd", "2026-10-31", "Manchester United", "H", true, "2026-09-11", "2026-09-14"),
  g("h-leeds", "2026-11-21", "Leeds United", "H", true, "2026-10-02", "2026-10-05"),
  g("h-palace", "2026-12-02", "Crystal Palace", "H", false, "2026-10-09", "2026-10-12"),
  g("h-liverpool", "2026-12-05", "Liverpool", "H", true, "2026-10-16", "2026-10-19"),
  g("h-villa", "2026-12-19", "Aston Villa", "H", false, "2026-10-30", "2026-11-02"),
  g("h-newcastle", "2027-01-02", "Newcastle United", "H", false, "2026-11-13", "2026-11-16"),
  g("h-sunderland", "2027-01-16", "Sunderland", "H", false, "2026-11-27", "2026-11-30"),
  g("h-forest", "2027-01-30", "Nottingham Forest", "H", false, "2026-12-18", "2026-12-21"),
  g("h-ipswich", "2027-02-20", "Ipswich Town", "H", false, "2026-12-31", "2027-01-04", EXT),
  g("h-coventry", "2027-03-03", "Coventry City", "H", false, "2027-01-08", "2027-01-11"),
  g("h-arsenal", "2027-03-13", "Arsenal", "H", true, "2027-01-22", "2027-01-25"),
  g("h-fulham", "2027-04-10", "Fulham", "H", false, "2027-02-19", "2027-02-22"),
  g("h-mancity", "2027-04-24", "Manchester City", "H", true, "2027-03-06", "2027-03-08"),
  g("h-everton", "2027-05-15", "Everton", "H", false, "2027-03-25", "2027-03-30", EXT),
  g("h-brentford", "2027-05-30", "Brentford", "H", true, "2027-04-09", "2027-04-12"),
];

const AWAY_GAMES: Game[] = [
  g("a-fulham", "2026-08-24", "Fulham", "A", true, "2026-07-24", "2026-07-27", PLAT),
  g("a-arsenal", "2026-09-05", "Arsenal", "A", true, "2026-07-31", "2026-08-03", PLAT),
  g("a-brentford", "2026-09-19", "Brentford", "A", true, "2026-08-14", "2026-08-17", PLAT),
  g("a-everton", "2026-10-17", "Everton", "A", false, "2026-09-11", "2026-09-14", PLAT),
  g("a-sunderland", "2026-11-07", "Sunderland", "A", false, "2026-10-03", "2026-10-05", PLAT),
  g("a-forest", "2026-11-28", "Nottingham Forest", "A", false, "2026-10-23", "2026-10-26", PLAT),
  g("a-mancity", "2026-12-12", "Manchester City", "A", true, "2026-11-06", "2026-11-09", PLAT),
  g("a-coventry", "2026-12-26", "Coventry City", "A", false, "2026-11-20", "2026-11-23", PLAT),
  g("a-ipswich", "2026-12-30", "Ipswich Town", "A", false, "2026-11-20", "2026-11-23", PLAT),
  g("a-palace", "2027-01-06", "Crystal Palace", "A", true, "2026-11-27", "2026-11-30", PLAT),
  g("a-leeds", "2027-01-23", "Leeds United", "A", false, "2026-12-18", "2026-12-21", PLAT),
  g("a-manutd", "2027-02-06", "Manchester United", "A", true, "2026-12-31", "2027-01-04", `${PLAT} — ${EXT}`),
  g("a-newcastle", "2027-02-10", "Newcastle United", "A", false, "2026-12-31", "2027-01-04", `${PLAT} — ${EXT}`),
  g("a-villa", "2027-02-27", "Aston Villa", "A", false, "2027-01-29", "2027-02-01", PLAT),
  g("a-hull", "2027-03-20", "Hull City", "A", false, "2027-02-12", "2027-02-15", PLAT),
  g("a-brighton", "2027-04-17", "Brighton & Hove Albion", "A", false, "2027-03-12", "2027-03-15", PLAT),
  g("a-liverpool", "2027-05-01", "Liverpool", "A", true, "2027-03-25", "2027-03-30", `${PLAT} — ${EXT}`),
  g("a-tottenham", "2027-05-08", "Tottenham Hotspur", "A", true, "2027-04-02", "2027-04-05", PLAT),
  g("a-bournemouth", "2027-05-23", "AFC Bournemouth", "A", true, "2027-04-16", "2027-04-19", PLAT),
];

export function seedData(): AppData {
  return {
    version: 1,
    settings: {
      seasonLabel: "2026-27",
      maxGamesPerSeason: 8,
      email: {
        to: "",
        template: DEFAULT_TEMPLATE,
      },
    },
    // Members are added through the app (kept out of the public repo).
    members: [],
    games: [...HOME_GAMES, ...AWAY_GAMES].sort((a, b) =>
      a.date.localeCompare(b.date)
    ),
    responses: {},
    feedback: [],
  };
}
