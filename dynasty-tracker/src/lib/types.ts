import { z } from 'zod'

// FantasyCalc value entry, keyed in the snapshot by String(sleeperId).
export const fcValueSchema = z.object({
  value: z.number(),
  overallRank: z.number(),
  positionRank: z.number(),
  trend30Day: z.number().nullable(),
  tier: z.number().nullable(),
  redraftValue: z.number().nullable(),
  redraftDynastyValueDifference: z.number().nullable(),
  age: z.number().nullable(),
  name: z.string(),
  position: z.string(),
})
export type FcValue = z.infer<typeof fcValueSchema>

export const fcVariantSchema = z.enum(['12team', '10team'])
export type FcVariant = z.infer<typeof fcVariantSchema>

export const rosterSnapshotSchema = z.object({
  rosterId: z.number(),
  ownerId: z.string().nullable(),
  players: z.array(z.string()),
  starters: z.array(z.string()),
  taxi: z.array(z.string()),
  reserve: z.array(z.string()),
  record: z.object({
    wins: z.number(),
    losses: z.number(),
    ties: z.number(),
    fpts: z.number(),
    fptsAgainst: z.number(),
  }),
})
export type RosterSnapshot = z.infer<typeof rosterSnapshotSchema>

export const tradedPickSchema = z.object({
  season: z.string(),
  round: z.number(),
  originalRosterId: z.number(),
  currentOwnerRosterId: z.number(),
  previousOwnerRosterId: z.number().nullable(),
})
export type TradedPick = z.infer<typeof tradedPickSchema>

export const leagueDerivedSchema = z.object({
  tePremium: z.boolean(),
  fourPointPassTd: z.boolean(),
  volumeBonus: z.boolean(),
})
export type LeagueDerived = z.infer<typeof leagueDerivedSchema>

export const leagueSettingsSchema = z.object({
  name: z.string(),
  numTeams: z.number(),
  rosterPositions: z.array(z.string()),
  taxiSlots: z.number(),
  reserveSlots: z.number(),
  draftRounds: z.number(),
  scoring: z.object({
    passTd: z.number(),
    teRecBonus: z.number(),
    ppr: z.number(),
  }),
  derived: leagueDerivedSchema,
})
export type LeagueSettings = z.infer<typeof leagueSettingsSchema>

// Matchups/transactions are only fetched in-season and are unused until Phase 4;
// stored loosely so early snapshots never block on their exact shape.
export const matchupRowSchema = z.object({
  rosterId: z.number(),
  matchupId: z.number().nullable(),
  points: z.number(),
  starters: z.array(z.string()).nullable(),
  playersPoints: z.record(z.string(), z.number()).nullable(),
})
export type MatchupRow = z.infer<typeof matchupRowSchema>

export const leagueSnapshotSchema = z.object({
  leagueId: z.string(),
  label: z.string(),
  fantasyCalcVariant: fcVariantSchema,
  settings: leagueSettingsSchema,
  rosters: z.array(rosterSnapshotSchema),
  users: z.record(z.string(), z.string()),
  tradedPicks: z.array(tradedPickSchema),
  matchups: z.array(matchupRowSchema).optional(),
  transactions: z.array(z.unknown()).optional(),
})
export type LeagueSnapshot = z.infer<typeof leagueSnapshotSchema>

export const snapshotSchema = z.object({
  meta: z.object({
    schemaVersion: z.literal(1),
    season: z.string(),
    kind: z.enum(['preseason', 'week']),
    week: z.number(),
    fetchedAt: z.string(),
    sleeperState: z.object({
      season: z.string(),
      seasonType: z.string(),
      week: z.number(),
      displayWeek: z.number(),
    }),
  }),
  fantasyCalc: z.object({
    '12team': z.record(z.string(), fcValueSchema),
    '10team': z.record(z.string(), fcValueSchema),
  }),
  leagues: z.array(leagueSnapshotSchema),
})
export type Snapshot = z.infer<typeof snapshotSchema>

export const playersFileSchema = z.object({
  meta: z.object({
    fetchedAt: z.string(),
    source: z.literal('sleeper'),
    count: z.number(),
  }),
  players: z.record(
    z.string(),
    z.object({
      name: z.string(),
      position: z.string(),
      team: z.string().nullable(),
      age: z.number().nullable(),
      yearsExp: z.number().nullable(),
      injuryStatus: z.string().nullable(),
      status: z.string().nullable(),
    }),
  ),
})
export type PlayersFile = z.infer<typeof playersFileSchema>
export type PlayerInfo = PlayersFile['players'][string]
