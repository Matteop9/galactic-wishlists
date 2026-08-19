import { Link } from 'react-router-dom'
import type { LivePickStatus, PickScore } from '../lib/types'
import { odds2, score2 } from '../lib/format'
import { Avatar, DoubleChip, MethodBadge, StateIcon, TeamBadge, teamColor, VoidChip } from './ui'
import { ChampStars } from './ChampStars'
import LivePickChip from './LivePickChip'

/* Flagship component - design guide §3. 3px team gradient bar, header with
   team name + n-FOLD overline and combined odds, pick rows, footer status. */

interface Props {
  teamName: string
  displayColor?: string
  picks: PickScore[]
  live?: LivePickStatus[]
}

function combinedOdds(picks: PickScore[]) {
  const real = picks.filter((p) => p.method !== 'N/A')
  if (!real.length) return null
  return real.reduce((acc, p) => acc * p.odds, 1)
}

function footer(picks: PickScore[]) {
  const settled = picks.filter((p) => p.result != null)
  const wins = settled.filter((p) => p.result === 1).length
  const losses = settled.filter((p) => p.result === 0).length
  const pending = picks.length - settled.length
  const tally = `${wins}W · ${losses}L · ${pending} pending`

  if (losses > 0 && pending > 0)
    return { text: `Acca down — ${losses} leg${losses > 1 ? 's' : ''} lost`, color: 'var(--color-loss)', tally }
  if (losses > 0)
    return { text: `Acca down — finished ${wins}/${picks.length}`, color: 'var(--color-loss)', tally }
  if (pending === 0 && picks.length > 0)
    return { text: `All ${wins} landed — clean sweep!`, color: 'var(--color-gold)', tally }
  if (wins > 0)
    return { text: `All ${picks.length} alive — ${pending} to go`, color: 'var(--color-accent-bright)', tally }
  return { text: `${picks.length} legs in — good luck`, color: 'var(--color-muted)', tally }
}

export default function AccaCard({ teamName, displayColor, picks, live }: Props) {
  const color = displayColor ?? teamColor(teamName)
  const combined = combinedOdds(picks)
  const f = footer(picks)
  const liveFor = (id: string) => live?.find((l) => l.pick_id === id)

  return (
    <div className="overflow-hidden rounded-[14px] bg-surface">
      <div
        className="h-[3px]"
        style={{ background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 30%, transparent))` }}
      />
      <div className="flex items-end justify-between px-3.5 pb-2 pt-3">
        <div>
          <div className="overline">{picks.length}-FOLD</div>
          <div className="display text-[22px] leading-tight" style={{ color }}>
            {teamName}
          </div>
        </div>
        <div className="text-right">
          <div className="overline">COMBINED</div>
          <div className="font-mono text-[19px] font-bold leading-tight">
            {combined ? odds2(combined) : '–'}
          </div>
        </div>
      </div>

      <div>
        {picks.map((p) => {
          const lost = p.result === 0
          const l = liveFor(p.id)
          return (
            <div
              key={p.id}
              className="flex items-center gap-2.5 border-t px-3.5 py-[9px]"
              style={{
                borderColor: 'var(--color-line)',
                background: lost ? 'rgba(240,101,95,0.05)' : undefined,
              }}
            >
              <Avatar name={p.name} team={p.acca_team} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[13px] font-bold" style={{ color: teamColor(p.acca_team) }}>
                    {p.name}
                  </span>
                  <ChampStars playerId={p.player_id} />
                  <MethodBadge method={p.method} />
                  {p.void_reason && <VoidChip reason={p.void_reason} />}
                  {p.doubled && p.result === 1 && <DoubleChip />}
                </div>
                <div className="flex items-center gap-1.5 text-[11.5px] text-muted">
                  {p.method !== 'N/A' && <TeamBadge name={p.team} size={14} />}
                  <span className="truncate">
                    {p.method === 'N/A'
                      ? 'No pick submitted'
                      : p.method === 'BTTS' && p.second_team
                        ? `${p.team} v ${p.second_team}`
                        : p.team}
                  </span>
                  {p.method === 'BTTS' && p.second_team && <TeamBadge name={p.second_team} size={14} />}
                </div>
                {l && l.live_state !== 'NOT_STARTED' && (
                  <div className="mt-0.5">
                    <LivePickChip status={l} />
                  </div>
                )}
              </div>
              <div className="w-[44px] text-right">
                <span
                  className="font-mono text-[14px] font-semibold"
                  style={{
                    color: lost ? 'var(--color-loss)' : undefined,
                    textDecoration: lost ? 'line-through' : undefined,
                  }}
                >
                  {p.method === 'N/A' ? '–' : odds2(p.odds)}
                </span>
              </div>
              <StateIcon result={p.result} />
            </div>
          )
        })}
      </div>

      <div
        className="flex items-center justify-between px-3.5 py-2.5"
        style={{ background: 'var(--color-surface-2)' }}
      >
        <span className="text-[12px] font-semibold" style={{ color: f.color }}>
          {f.text}
        </span>
        <span className="font-mono text-[10.5px] text-muted">{f.tally}</span>
      </div>
    </div>
  )
}

export function TeamWeekHeader({ teamName, score, color }: { teamName: string; score: number; color?: string }) {
  return (
    <div className="overline px-1 pb-1.5" style={{ color: color ?? teamColor(teamName) }}>
      {teamName} — WEEK SCORE {score2(score)}
    </div>
  )
}

export { combinedOdds }

export function pickRowLink(playerId: string) {
  return <Link to={`/players/${playerId}`} />
}
