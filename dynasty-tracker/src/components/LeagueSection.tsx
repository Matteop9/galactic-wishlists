import type { Direction } from '../lib/engine/direction'
import type { LeagueReport } from '../lib/engine/report'
import type { MarketPlayer } from '../lib/engine/tradeCheck'
import type { ReviewedTrade } from '../lib/engine/tradeHistory'
import type { VerdictKind, VerdictRow } from '../lib/engine/verdicts'
import type { IntelMap } from '../lib/intel'
import { MyProfileCard } from './MyProfileCard'
import { VerdictColumns } from './VerdictColumns'
import { BuyTargets } from './BuyTargets'
import { OpponentLines } from './OpponentLines'
import { TradeCheck } from './TradeCheck'
import { TradeHistory } from './TradeHistory'

interface Props {
  league: LeagueReport
  pool: MarketPlayer[]
  trades: ReviewedTrade[] | null
  intel: IntelMap
  onOverride: (leagueId: string, rosterId: number, direction: Direction | null) => void
  onDispute: (row: VerdictRow, desired: VerdictKind, note: string) => void
  onClearDispute: (playerId: string) => void
  onIntel: (rosterId: number, text: string) => void
}

export function LeagueSection({ league, pool, trades, intel, onOverride, onDispute, onClearDispute, onIntel }: Props) {
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
      <h3>Trade check</h3>
      <TradeCheck league={league} pool={pool} />
      <h3>My trade history</h3>
      <TradeHistory trades={trades} />
      <h3>The market</h3>
      <OpponentLines
        leagueId={league.leagueId}
        opponents={league.opponents}
        intel={intel}
        onOverride={(rosterId, direction) => onOverride(league.leagueId, rosterId, direction)}
        onIntel={onIntel}
      />
    </section>
  )
}
