export interface PoolPlayer {
  id: string
  position: string
  value: number
}

export interface LineupSlot {
  slot: string
  player: PoolPlayer | null
}

export interface LineupResult {
  slots: LineupSlot[]
  starterValue: number
  starterIds: Set<string>
}

const SLOT_ELIGIBILITY: Record<string, readonly string[]> = {
  QB: ['QB'],
  RB: ['RB'],
  WR: ['WR'],
  TE: ['TE'],
  K: ['K'],
  DEF: ['DEF'],
  FLEX: ['RB', 'WR', 'TE'],
  WRRB_FLEX: ['WR', 'RB'],
  REC_FLEX: ['WR', 'TE'],
  SUPER_FLEX: ['QB', 'RB', 'WR', 'TE'],
}

export function lineupSlots(rosterPositions: string[]): string[] {
  return rosterPositions.filter((slot) => slot in SLOT_ELIGIBILITY)
}

export function eligibleSlotsFor(position: string): string[] {
  return Object.keys(SLOT_ELIGIBILITY).filter((slot) => SLOT_ELIGIBILITY[slot].includes(position))
}

// Best legal lineup by value. Dedicated slots are filled before flex slots
// (ascending eligibility-set size), each taking the best remaining eligible
// player — optimal for Sleeper's nested slot families.
export function optimalLineup(pool: PoolPlayer[], rosterPositions: string[]): LineupResult {
  const slots = lineupSlots(rosterPositions)
    .map((slot, order) => ({ slot, order }))
    .sort(
      (a, b) =>
        SLOT_ELIGIBILITY[a.slot].length - SLOT_ELIGIBILITY[b.slot].length || a.order - b.order,
    )
  const byValue = [...pool].sort((a, b) => b.value - a.value)
  const used = new Set<string>()
  const filled: { slot: string; order: number; player: PoolPlayer | null }[] = []
  for (const { slot, order } of slots) {
    const eligible = SLOT_ELIGIBILITY[slot]
    const pick = byValue.find((p) => !used.has(p.id) && eligible.includes(p.position)) ?? null
    if (pick) used.add(pick.id)
    filled.push({ slot, order, player: pick })
  }
  filled.sort((a, b) => a.order - b.order)
  return {
    slots: filled.map(({ slot, player }) => ({ slot, player })),
    starterValue: filled.reduce((sum, f) => sum + (f.player?.value ?? 0), 0),
    starterIds: used,
  }
}
