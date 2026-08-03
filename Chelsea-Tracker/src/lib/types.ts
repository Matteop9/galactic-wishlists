export type Interest = "definitely" | "interested" | "if_others" | "not";
export type Outcome = "pending" | "success" | "unsuccessful";
export type HomeAway = "H" | "A";

export interface Member {
  id: string;
  name: string;
  membershipNumber: string;
  active: boolean;
}

export interface Game {
  id: string;
  /** Kickoff date, YYYY-MM-DD */
  date: string;
  opponent: string;
  competition: string;
  homeAway: HomeAway;
  /** Order window open, YYYY-MM-DDTHH:mm (UK local) */
  orderOpen: string;
  /** Order window close, YYYY-MM-DDTHH:mm (UK local) */
  orderClose: string;
  /** Sold on loyalty points (* in the club PDF) */
  loyaltyPoints: boolean;
  notes: string;
}

export interface MemberResponse {
  interest: Interest | null;
  applied: boolean;
  appliedAt?: string;
  outcome: Outcome | null;
}

export interface EmailSettings {
  to: string;
  template: string;
}

export interface Settings {
  seasonLabel: string;
  maxGamesPerSeason: number;
  email: EmailSettings;
}

export interface FeedbackItem {
  id: string;
  authorName: string;
  text: string;
  createdAt: string;
  resolved: boolean;
}

export interface AppData {
  version: 1;
  settings: Settings;
  members: Member[];
  games: Game[];
  /** responses[gameId][memberId] */
  responses: Record<string, Record<string, MemberResponse>>;
  feedback: FeedbackItem[];
}

export const INTEREST_ORDER: Interest[] = [
  "definitely",
  "interested",
  "if_others",
  "not",
];

export const INTEREST_META: Record<
  Interest,
  { label: string; short: string; symbol: string }
> = {
  definitely: { label: "Definitely", short: "In!", symbol: "✓✓" },
  interested: { label: "Interested", short: "Keen", symbol: "✓" },
  if_others: { label: "If others go", short: "If others", symbol: "?" },
  not: { label: "Not interested", short: "Out", symbol: "✗" },
};

export const OUTCOME_META: Record<Outcome, { label: string }> = {
  pending: { label: "Applied — awaiting result" },
  success: { label: "Successful" },
  unsuccessful: { label: "Unsuccessful" },
};

export type Action =
  | { type: "setInterest"; gameId: string; memberId: string; interest: Interest | null }
  | { type: "setApplied"; gameId: string; memberIds: string[]; applied: boolean }
  | { type: "setOutcome"; gameId: string; memberIds: string[]; outcome: Outcome | null }
  | { type: "addGame"; game: Omit<Game, "id"> }
  | { type: "updateGame"; game: Game }
  | { type: "deleteGame"; gameId: string }
  | { type: "addMember"; name: string; membershipNumber: string }
  | { type: "updateMember"; member: Member }
  | { type: "updateSettings"; settings: Settings }
  | { type: "addFeedback"; authorName: string; text: string }
  | { type: "setFeedbackResolved"; feedbackId: string; resolved: boolean }
  | { type: "deleteFeedback"; feedbackId: string }
  | { type: "resetSeason"; seasonLabel: string };

export type PatchFn = (action: Action) => Promise<AppData>;

export function emptyResponse(): MemberResponse {
  return { interest: null, applied: false, outcome: null };
}

export function getResponse(
  data: AppData,
  gameId: string,
  memberId: string
): MemberResponse {
  return data.responses[gameId]?.[memberId] ?? emptyResponse();
}

/** Games a member has successfully got tickets for this season. */
export function successCount(data: AppData, memberId: string): number {
  return data.games.filter(
    (g) => getResponse(data, g.id, memberId).outcome === "success"
  ).length;
}

/** Games a member has applied for that are still awaiting a result. */
export function pendingCount(data: AppData, memberId: string): number {
  return data.games.filter((g) => {
    const r = getResponse(data, g.id, memberId);
    return r.applied && r.outcome === "pending";
  }).length;
}
