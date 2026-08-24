// ---- Domain types ----

export type User = {
  id: string;
  username: string; // unique, lowercase
  displayName: string;
  passwordHash: string;
  createdAt: string;
};

export type UsersDoc = { users: User[] };

export type LeagueMember = { userId: string; joinedAt: string };

export type League = {
  id: string;
  name: string;
  inviteCode: string;
  season: string; // e.g. "2026-27"
  competitionIds: number[];
  lockAt: string; // ISO datetime — predictions freeze & become public
  createdBy: string;
  createdAt: string;
  members: LeagueMember[];
};

export type LeaguesIndexDoc = {
  leagues: Record<string, { name: string; season: string; memberIds: string[] }>;
};

export type ScorerPick = { playerId?: number; playerName: string };

export type CompetitionPrediction = {
  ranking: number[]; // team ids, index 0 = predicted 1st
  scorer: ScorerPick | null;
};

export type PredictionDoc = {
  // keyed by competition id as string
  competitions: Record<string, CompetitionPrediction>;
  updatedAt: string;
};

export type CodeDoc = { leagueId: string };

// ---- football-data.org API types (trimmed to what we use) ----

export type ApiTeam = {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
};

export type ApiTableRow = {
  position: number;
  team: ApiTeam;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};

export type Standings = {
  season: { startDate: string; endDate: string };
  table: ApiTableRow[];
};

export type ApiScorer = {
  player: { id: number; name: string };
  team: ApiTeam;
  goals: number;
  assists: number | null;
  playedMatches: number;
};

export type ApiMatch = {
  id: number;
  utcDate: string; // ISO kickoff
  // Documented values are SCHEDULED/TIMED/IN_PLAY/PAUSED/FINISHED/…, but some
  // competitions (e.g. the Championship) return a datetime-ish string here.
  status: 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED' | (string & {});
  matchday: number | null;
  homeTeam: ApiTeam;
  awayTeam: ApiTeam;
  score: { winner?: string | null; fullTime: { home: number | null; away: number | null } };
};

export type SquadPlayer = {
  id: number;
  name: string;
  position: string | null;
  teamId: number;
  teamShortName: string;
};

export type TeamsDoc = {
  season: { startDate: string; endDate: string };
  teams: ApiTeam[];
  squad: SquadPlayer[];
};
