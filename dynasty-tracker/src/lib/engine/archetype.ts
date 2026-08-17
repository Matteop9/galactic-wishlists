import type { Thresholds } from '../config'
import type { FcValue } from '../types'

export type Archetype = 'Win-now vet' | 'Youth asset' | 'Prime' | 'Declining' | 'Balanced'

// Position-specific age cliff: WRs fall off the market around 28, RBs around 28
// (the "second golden age" pushed this later than the old 25-cliff), QBs age
// slowest, TEs hold value deep into their careers. Unknown positions fall back
// to the generic decliningMinAge.
export function decliningAgeFor(position: string, t: Thresholds): number {
  const byPos = t.archetypes.decliningMinAgeByPosition as Record<string, number | undefined>
  return byPos[position] ?? t.archetypes.decliningMinAge
}

export function isRedraftDominant(fc: FcValue | null, t: Thresholds): boolean {
  if (!fc) return false
  const redraft = fc.redraftValue
  return redraft !== null && fc.value > 0 && redraft / fc.value >= t.archetypes.redraftDominanceRatio
}

export function classifyArchetype(age: number, position: string, fc: FcValue | null, t: Thresholds): Archetype {
  if (!fc) return 'Balanced'
  const a = t.archetypes

  if (age >= decliningAgeFor(position, t) && (fc.trend30Day ?? 0) < a.decliningTrend30Max) return 'Declining'
  if (age >= a.winNowVetMinAge && isRedraftDominant(fc, t)) return 'Win-now vet'
  // Youth is an age fact, not a market-ratio fact: a 22-year-old is a youth
  // asset whether or not FantasyCalc's dynasty/redraft split happens to agree.
  if (age <= a.youthAssetMaxAge) return 'Youth asset'
  if (age >= a.primeMinAge && age <= a.primeMaxAge) return 'Prime'
  return 'Balanced'
}
