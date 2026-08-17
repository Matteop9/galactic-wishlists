import type { LeagueReport } from '../lib/engine/report'
import { MyProfileCard } from './MyProfileCard'
import { VerdictTable } from './VerdictTable'
import { BuyTargets } from './BuyTargets'
import { OpponentLines } from './OpponentLines'

export function LeagueSection({ league }: { league: LeagueReport }) {
  const tags = [
    `${league.numTeams} teams`,
    league.derived.tePremium ? 'TE premium' : null,
    league.derived.fourPointPassTd ? '4pt pass TD' : '6pt pass TD',
    league.derived.volumeBonus ? 'Yardage bonuses' : null,
  ].filter(Boolean)

  return (
    <section className="league-section" id={`league-${league.leagueId}`}>
      <h2>{league.label}</h2>
      <div className="league-tags">{tags.join(' · ')}</div>
      <MyProfileCard league={league} />
      <h3>Verdicts</h3>
      <VerdictTable rows={league.verdicts} />
      <h3>Buy targets</h3>
      <BuyTargets targets={league.buyTargets} />
      <h3>The market</h3>
      <OpponentLines opponents={league.opponents} />
    </section>
  )
}
