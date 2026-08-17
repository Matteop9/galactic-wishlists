import type { Thresholds } from '../config'
import type { FcValue } from '../types'

export type Archetype = 'Win-now vet' | 'Youth asset' | 'Prime' | 'Declining' | 'Balanced'

export function classifyArchetype(age: number, fc: FcValue | null, t: Thresholds): Archetype {
  if (!fc) return 'Balanced'
  const a = t.archetypes
  const redraft = fc.redraftValue
  const redraftDominant = redraft !== null && fc.value > 0 && redraft / fc.value >= a.redraftDominanceRatio
  const dynastyDominant = redraft !== null && redraft > 0 && fc.value / redraft >= a.redraftDominanceRatio

  if (age >= a.decliningMinAge && (fc.trend30Day ?? 0) < a.decliningTrend30Max) return 'Declining'
  if (age >= a.winNowVetMinAge && redraftDominant) return 'Win-now vet'
  if (age <= a.youthAssetMaxAge && dynastyDominant) return 'Youth asset'
  if (age >= a.primeMinAge && age <= a.primeMaxAge) return 'Prime'
  return 'Balanced'
}
