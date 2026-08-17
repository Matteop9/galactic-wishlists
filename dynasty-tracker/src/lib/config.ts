import { z } from 'zod'
import leaguesRaw from '../../config/leagues.json'
import thresholdsRaw from '../../config/thresholds.json'
import { fcVariantSchema } from './types'

// Config JSON files use underscore-prefixed keys as comments; strip them
// recursively before validation so the schemas stay strict.
function stripComments(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripComments)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !key.startsWith('_'))
        .map(([key, child]) => [key, stripComments(child)]),
    )
  }
  return value
}

const leaguesConfigSchema = z.object({
  season: z.string(),
  userId: z.string(),
  username: z.string(),
  leagues: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        fantasyCalcVariant: fcVariantSchema,
        overrides: z.object({
          tePremium: z.boolean().optional(),
          fourPointPassTd: z.boolean().optional(),
          volumeBonus: z.boolean().optional(),
        }),
      }),
    )
    .min(1),
})

const thresholdsSchema = z.object({
  valueAdjustments: z.object({
    tePremiumMultiplier: z.number(),
    qbFourPointPassTdMultiplier: z.number(),
    volumeBonusRbWrMultiplier: z.number(),
    volumeBonusMinPositionRank: z.number(),
  }),
  ageBands: z.object({
    youngMax: z.number(),
    primeMax: z.number(),
    defaultAge: z.number(),
  }),
  direction: z.object({
    contenderStarterRankMax: z.number(),
    contenderWinNowShareMin: z.number(),
    contenderMinWinPct: z.number(),
    ascendingTotalRankMax: z.number(),
    ascendingYouthShareMin: z.number(),
    rebuildingStarterRankMinFromBottom: z.number(),
    rebuildingYouthShareMin: z.number(),
    rebuildingPickCapitalRankMax: z.number(),
  }),
  archetypes: z.object({
    winNowVetMinAge: z.number(),
    youthAssetMaxAge: z.number(),
    primeMinAge: z.number(),
    primeMaxAge: z.number(),
    decliningMinAge: z.number(),
    decliningTrend30Max: z.number(),
    redraftDominanceRatio: z.number(),
  }),
  picks: z.object({
    firstEarlySlot: z.number(),
    firstMidSlot: z.number(),
    firstLateSlot: z.number(),
    secondSlot: z.number(),
    thirdSlot: z.number(),
    fourthSlot: z.number(),
    futureSeasonDiscount: z.number(),
    seasonsAhead: z.number(),
    roundsValued: z.number(),
    earlyStandingsCutoff: z.number(),
    lateStandingsCutoff: z.number(),
  }),
  verdicts: z.object({
    sellDuplicateDepthMinCount: z.number(),
    duplicateDepthMinValue: z.number(),
    buyTargetMaxPerLeague: z.number(),
    buyTargetMinAdjValue: z.number(),
    minMarginalStarterValue: z.number(),
  }),
  refresh: z.object({
    playersDumpMaxAgeDays: z.number(),
    requestDelayMs: z.number(),
    retries: z.number(),
    retryBackoffMs: z.number(),
    timeoutMs: z.number(),
    fcJoinRateWarnBelow: z.number(),
  }),
})

export const leaguesConfig = leaguesConfigSchema.parse(stripComments(leaguesRaw))
export const thresholds = thresholdsSchema.parse(stripComments(thresholdsRaw))

export type LeaguesConfig = z.infer<typeof leaguesConfigSchema>
export type LeagueConfigEntry = LeaguesConfig['leagues'][number]
export type Thresholds = z.infer<typeof thresholdsSchema>
