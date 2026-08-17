import type { ReportModel } from '../engine/report'
import type { DisputeMap, VerdictKind } from '../engine/verdicts'
import { fmtDate, fmtTrend, fmtValue } from '../format'

interface DisputeStatus {
  label: string
  open: boolean
}

function statusOf(report: ReportModel, leagueId: string, playerId: string, desired: VerdictKind): DisputeStatus {
  const league = report.leagues.find((l) => l.leagueId === leagueId)
  const row = league?.verdicts.find((v) => v.playerId === playerId)
  if (!row) return { label: 'Player no longer in the verdict table (traded, dropped or unvalued).', open: false }
  if (row.verdict === desired) return { label: 'Engine now agrees — clear the dispute in the app.', open: false }
  return { label: `Open — engine still says ${row.verdict}.`, open: true }
}

// The paste-into-Claude half of the training loop. The preamble tells Claude
// exactly what "adjusting the logic" means so the workflow survives sessions.
export function buildTrainingReport(report: ReportModel, disputes: DisputeMap): string {
  const all = Object.values(disputes)
  const lines: string[] = []
  lines.push('# Dynasty Tracker — training report')
  lines.push('')
  lines.push(`${all.length} disputed verdict${all.length === 1 ? '' : 's'}, exported ${fmtDate(new Date().toISOString())}.`)
  lines.push('')
  lines.push(
    'Instructions for Claude (dynasty-tracker project): for each dispute below, decide whether a ' +
      'threshold or a ladder rule is wrong. Apply the correction (`config/thresholds.json` for numbers, ' +
      '`src/lib/engine/verdicts.ts` for rules), append an entry to the Training log in `STRATEGY.md`, and ' +
      'add a regression case to `tests/verdicts.test.ts` reproducing the disputed situation. If a dispute ' +
      'is wrong on the strategy merits, say so and leave the engine alone — but explain why. Never regress ' +
      "STRATEGY.md's hard rules.",
  )
  lines.push('')

  const enriched = all
    .map((d) => ({
      d,
      status: statusOf(report, d.leagueId, d.playerId, d.desiredVerdict),
      leagueLabel: report.leagues.find((l) => l.leagueId === d.leagueId)?.label ?? d.leagueId,
    }))
    .sort((a, b) => Number(b.status.open) - Number(a.status.open) || a.d.createdAt.localeCompare(b.d.createdAt))

  for (const { d, status, leagueLabel } of enriched) {
    const c = d.context
    lines.push(`## ${c.playerName} (${c.position}, ${c.age}) — ${leagueLabel}`)
    lines.push('')
    lines.push(
      `- Situation at dispute (${c.season} ${c.kind === 'preseason' ? 'preseason' : `week ${c.week}`}): my direction ${c.myDirection}, archetype ${c.archetype}, adjusted value ${fmtValue(c.adjValue)}, 30-day trend ${fmtTrend(c.trend30Day)}`,
    )
    lines.push(`- Engine said: **${c.engineVerdict}** — ${c.engineReason}`)
    lines.push(`- I say: **${d.desiredVerdict}**${d.note ? ` — "${d.note}"` : ''}`)
    lines.push(`- Disputed: ${fmtDate(d.createdAt)}`)
    lines.push(`- Status: ${status.label}`)
    lines.push('')
  }

  if (all.length === 0) {
    lines.push('No disputes recorded.')
    lines.push('')
  }

  return lines.join('\n')
}
