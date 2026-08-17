import { fmtDate, fmtShare, fmtTrend, fmtValue, ordinal } from '../format'
import type { ReportModel } from '../engine/report'

// Renders the same ReportModel the UI consumes, so the export can never
// drift from what is on screen.
export function buildMarkdown(report: ReportModel): string {
  const lines: string[] = []
  const title =
    report.meta.kind === 'preseason'
      ? `Preseason baseline ${report.meta.season}`
      : `Week ${report.meta.week} review, ${report.meta.season}`
  lines.push(`# Dynasty Tracker — ${title}`)
  lines.push('')
  lines.push(`Data fetched ${fmtDate(report.meta.fetchedAt)}.`)
  lines.push('')

  lines.push('## Cross-league summary')
  lines.push('')
  lines.push('| League | Direction | Starter rank | Youth share | Pick capital |')
  lines.push('|---|---|---|---|---|')
  for (const row of report.summary) {
    lines.push(
      `| ${row.label} | ${row.direction} | ${ordinal(row.starterRank)} of ${row.numTeams} | ${fmtShare(row.youthShare)} | ${fmtValue(row.pickCapitalValue)} (${ordinal(row.pickCapitalRank)}) |`,
    )
  }
  lines.push('')

  for (const league of report.leagues) {
    lines.push(`## ${league.label}`)
    lines.push('')
    lines.push(`**${league.myDirection}.** ${league.directionStatement}`)
    lines.push('')
    const p = league.myProfile
    lines.push(
      `Total value ${fmtValue(p.totalValue)} (${ordinal(league.myRanks.total)}) — starters ${fmtValue(p.starterValue)} (${ordinal(league.myRanks.starter)}), depth ${fmtValue(p.depthValue)}. ` +
        `Age split: ${fmtShare(p.ageSplit.young)} young / ${fmtShare(p.ageSplit.mid)} prime / ${fmtShare(p.ageSplit.old)} ageing. ` +
        `Pick capital ${fmtValue(p.pickCapital.total)} (${ordinal(league.myRanks.pickCapital)}).`,
    )
    if (p.unvalued.length > 0) {
      lines.push('')
      lines.push(`Not valued by FantasyCalc: ${p.unvalued.join(', ')}.`)
    }
    lines.push('')

    lines.push('### Verdicts')
    lines.push('')
    lines.push('| Player | Pos | Age | Adj value | 30d | Verdict | Counterparty |')
    lines.push('|---|---|---|---|---|---|---|')
    for (const v of league.verdicts) {
      const age = v.ageEstimated ? `~${v.age}` : String(v.age)
      const counterparty = v.counterparty ?? '—'
      lines.push(
        `| ${v.name} | ${v.position} | ${age} | ${fmtValue(v.adjValue)} | ${fmtTrend(v.trend30Day)} | ${v.verdict} — ${v.reason} | ${counterparty} |`,
      )
    }
    lines.push('')

    lines.push('### Buy targets')
    lines.push('')
    if (league.buyTargets.length === 0) {
      lines.push('No targets clear the bar this week — the right assets are not for sale cheap.')
    } else {
      for (const b of league.buyTargets) {
        lines.push(
          `- **${b.name}** (${b.position}, ${b.age}, ${fmtValue(b.adjValue)}) — held by ${b.holderName} (${b.holderDirection}); adds ${fmtValue(b.marginalStarterValue)} to my starting lineup. ${b.reason}.`,
        )
      }
    }
    lines.push('')

    lines.push('### The market')
    lines.push('')
    for (const o of league.opponents) {
      lines.push(`- **${o.ownerName}** — ${o.line}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}
