import type { Thresholds } from '../config'
import type { FcValue, LeagueDerived } from '../types'

// League-adjusted value: FantasyCalc is league-agnostic, so scale for the
// league's scoring context before any ranking or lineup maths.
export function adjustedValue(fc: FcValue, derived: LeagueDerived, t: Thresholds): number {
  const a = t.valueAdjustments
  let value = fc.value
  if (derived.tePremium && fc.position === 'TE') value *= a.tePremiumMultiplier
  if (derived.fourPointPassTd && fc.position === 'QB') value *= a.qbFourPointPassTdMultiplier
  if (
    derived.volumeBonus &&
    (fc.position === 'RB' || fc.position === 'WR') &&
    fc.positionRank <= a.volumeBonusMinPositionRank
  ) {
    value *= a.volumeBonusRbWrMultiplier
  }
  return Math.round(value)
}
