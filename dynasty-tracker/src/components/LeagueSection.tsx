import type { Direction } from '../lib/engine/direction'
import type { LeagueReport } from '../lib/engine/report'
import type { VerdictKind, VerdictRow } from '../lib/engine/verdicts'
import { MyProfileCard } from './MyProfileCard'
import { VerdictColumns } from './VerdictColumns'
import { BuyTargets } from './BuyTargets'
import { OpponentLines } from './OpponentLines'

interface Props {
  league: LeagueReport
  onOverride: (leagueId: string, rosterId: number, direction: Direction | null) => void
  onDispute: (row: VerdictRow, desired: VerdictKind, note: string) => void
  onClearDispute: (playerId: string) => void
}

export function LeagueSection({ league, onOverride, onDispute, onClearDispute }: Props) {
  const tags = [
    `${league.numTeams} teams`,
    league.derived.tePremium ? 'TE premium' : null,
    league.derived.fourPointPassTd ? '4pt pass TD' : '6pt pass TD',
    league.derived.volumeBonus ? 'Yardage bonuses' : null,
  ].filter(Boolean)

  return (
    <section className="league-section" id={`league-${league.leagueId}`}>
      <div className="league-tags">{tags.join(' · ')}</div>
      <MyProfileCard
        league={league}
        onOverride={(direction) => onOverride(league.leagueId, league.myProfile.rosterId, direction)}
      />
      <h3>Verdicts</h3>
      <VerdictColumns rows={league.verdicts} onDispute={onDispute} onClearDispute={onClearDispute} />
      <h3>Buy targets</h3>
      <BuyTargets targets={league.buyTargets} />
      <h3>The market</h3>
      <OpponentLines
        opponents={league.opponents}
        onOverride={(rosterId, direction) => onOverride(league.leagueId, rosterId, direction)}
      />
    </section>
  )
}
