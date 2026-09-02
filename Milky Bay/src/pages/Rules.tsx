import { useQuery } from '@tanstack/react-query'
import { fetchHonoursList, fetchRules, fetchSeasonHistory } from '../lib/queries'
import { usePlayer } from '../hooks/usePlayer'
import { score2 } from '../lib/format'
import { LoadFailed, PageTitle, playerColor } from '../components/ui'
import { Skeleton } from '../components/Skeleton'

/* The syndicate agreement. Sections live in the rules_sections table so
   admins can amend them in-app — every change lands in the audit trail.
   History renders from honours + season_history, not editable text. */

export default function Rules() {
  const { players } = usePlayer()
  const sectionsQ = useQuery({ queryKey: ['rules'], queryFn: fetchRules })
  const sections = sectionsQ.data
  const { data: honours } = useQuery({ queryKey: ['honoursList'], queryFn: fetchHonoursList })
  const { data: history } = useQuery({ queryKey: ['seasonHistory'], queryFn: fetchSeasonHistory })

  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? '…'

  // One line per past season, oldest first: winner · last place (+ score where known)
  const seasonLabels = [...new Set((honours ?? []).map((h) => h.season_label))].sort()
  const historyLines = seasonLabels.map((label) => {
    const rows = (honours ?? []).filter((h) => h.season_label === label)
    const winner = rows.find((h) => h.award === 'winner' || h.award === 'half_season_winner')
    const spoon = rows.find((h) => h.award === 'wooden_spoon' || h.award === 'half_wooden_spoon')
    const half = winner?.award === 'half_season_winner'
    const scores = (history ?? []).filter((s) => s.season_label === label)
    const wScore = winner && scores.find((s) => s.player_id === winner.player_id)?.score
    return {
      label,
      half,
      winner: winner ? nameOf(winner.player_id) : '—',
      winnerScore: wScore,
      spoon: spoon ? nameOf(spoon.player_id) : '—',
    }
  })

  return (
    <div className="page-in px-4 pb-6">
      <PageTitle>The Agreement</PageTitle>
      <p className="mb-4 px-1 text-[12px] text-muted">
        Milky Bay Betting Syndicate · Season 26/27 · Harry, Luke, Tim, Sandy & Liam. In effect
        from the first bet of Gameweek 1. Admins can amend the rules — every change is audited.
      </p>
      {sectionsQ.isPending && (
        <div className="flex flex-col gap-2.5 rounded-[14px] bg-surface px-4 py-6">
          {[18, 96, 88, 92, 60, 18, 94, 86, 90, 72, 40].map((w, i) => (
            <Skeleton key={i} w={`${w}%`} h={w === 18 ? 16 : 11} />
          ))}
        </div>
      )}
      {!sectionsQ.isPending && sectionsQ.isError && <LoadFailed what="the rules" />}

      <div className="flex flex-col gap-3">
        {(sections ?? []).map((s) => (
          <div key={s.id} className="rounded-[14px] bg-surface p-4">
            <div className="display mb-2 text-[15px]" style={{ color: 'var(--color-accent)' }}>
              {s.title}
            </div>
            <ul className="flex flex-col gap-1.5">
              {s.items.map((item, i) => (
                <li key={i} className="flex gap-2 text-[13px] leading-snug text-text">
                  <span style={{ color: 'var(--color-accent)' }}>·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="rounded-[14px] bg-surface p-4">
          <div className="display mb-2 text-[15px]" style={{ color: 'var(--color-gold)' }}>
            History
          </div>
          <ul className="flex flex-col gap-1.5">
            {historyLines.map((h) => (
              <li key={h.label} className="flex gap-2 text-[13px] leading-snug">
                <span style={{ color: 'var(--color-gold)' }}>·</span>
                <span>
                  <span className="font-mono text-[12px] text-muted">{h.label}{h.half ? ' (half season)' : ''}:</span>{' '}
                  won by <span className="font-semibold" style={{ color: playerColor(h.winner) }}>{h.winner}</span>
                  {h.winnerScore != null && <span className="text-muted"> ({score2(Number(h.winnerScore))})</span>}
                  {' · '}
                  <span className="font-semibold" style={{ color: playerColor(h.spoon) }}>{h.spoon}</span> last
                </span>
              </li>
            ))}
            <li className="flex gap-2 text-[13px] leading-snug text-muted">
              <span style={{ color: 'var(--color-gold)' }}>·</span>
              <span>
                Getting to the top takes consistency, bravery and a touch of genius. Coming last,
                you carry with you — as long as Milky Bay lives.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
