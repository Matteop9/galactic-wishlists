import { disputeKey, type Dispute, type DisputeMap, type VerdictKind } from './engine/verdicts'

// Browser-side dispute store — the persistence half of the training loop.
// The engine owns the Dispute shape (engine/verdicts.ts); this module only
// handles localStorage, mirroring overrides.ts.
const DISPUTES_KEY = 'dynasty_verdict_disputes'

const KINDS: VerdictKind[] = ['Sell', 'Unsure', 'Hold']

export function loadDisputes(): DisputeMap {
  try {
    const parsed = JSON.parse(localStorage.getItem(DISPUTES_KEY) ?? '{}') as DisputeMap
    const clean: DisputeMap = {}
    for (const [key, dispute] of Object.entries(parsed)) {
      if (!dispute || typeof dispute !== 'object') continue
      if (!dispute.leagueId || !dispute.playerId || !dispute.context) continue
      if (!KINDS.includes(dispute.desiredVerdict)) continue
      clean[key] = dispute
    }
    return clean
  } catch {
    return {}
  }
}

export function withDispute(map: DisputeMap, dispute: Dispute): DisputeMap {
  const next = { ...map, [disputeKey(dispute.leagueId, dispute.playerId)]: dispute }
  localStorage.setItem(DISPUTES_KEY, JSON.stringify(next))
  return next
}

export function withoutDispute(map: DisputeMap, leagueId: string, playerId: string): DisputeMap {
  const next = { ...map }
  delete next[disputeKey(leagueId, playerId)]
  localStorage.setItem(DISPUTES_KEY, JSON.stringify(next))
  return next
}
