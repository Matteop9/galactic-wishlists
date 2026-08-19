import { useQuery } from '@tanstack/react-query'
import { fetchSeasonChampions } from '../lib/queries'
import type { SeasonChampionRow } from '../lib/types'

/** One shared cache — champions only change when a season ends. */
export function useChampions() {
  return useQuery({
    queryKey: ['seasonChampions'],
    queryFn: fetchSeasonChampions,
    staleTime: Infinity,
  })
}

function starPath(cx: number): string {
  return (
    `M${cx} 0 L${cx + 1.12} 3.45 L${cx + 4.76} 3.45 L${cx + 1.82} 5.59 ` +
    `L${cx + 2.94} 9.05 L${cx} 6.91 L${cx - 2.94} 9.05 L${cx - 1.82} 5.59 ` +
    `L${cx - 4.76} 3.45 L${cx - 1.12} 3.45 Z`
  )
}

/**
 * Rank emblem that evolves with win count rather than repeating glyphs:
 * 1 = star, 2 = star in laurel wreath, 3 = winged star, 4+ = winged star + wreath.
 */
function Emblem({ tier, color, size }: { tier: number; color: string; size: number }) {
  const t = Math.min(Math.max(tier, 1), 4)
  const width = { 1: 10, 2: 14, 3: 18, 4: 18 }[t]!
  const cx = width / 2
  const arc = (stroke: string) => (
    <>
      <path d={`M${cx - 4.8} 9.4 C${cx - 6.4} 7.2 ${cx - 6.4} 4.2 ${cx - 4.6} 2.2`} stroke={stroke} strokeWidth="1.1" strokeLinecap="round" fill="none" />
      <path d={`M${cx + 4.8} 9.4 C${cx + 6.4} 7.2 ${cx + 6.4} 4.2 ${cx + 4.6} 2.2`} stroke={stroke} strokeWidth="1.1" strokeLinecap="round" fill="none" />
    </>
  )
  const wings = (stroke: string) => (
    <>
      <path d={`M${cx - 2.8} 6.6 C${cx - 5} 6.8 ${cx - 6.8} 6.2 ${cx - 8.2} 4.8`} stroke={stroke} strokeWidth="1" strokeLinecap="round" fill="none" />
      <path d={`M${cx - 2.8} 5 C${cx - 4.6} 5 ${cx - 6} 4.4 ${cx - 7} 3.2`} stroke={stroke} strokeWidth="1" strokeLinecap="round" fill="none" />
      <path d={`M${cx - 2.8} 3.4 C${cx - 4} 3.2 ${cx - 4.8} 2.8 ${cx - 5.4} 1.9`} stroke={stroke} strokeWidth="1" strokeLinecap="round" fill="none" />
      <path d={`M${cx + 2.8} 6.6 C${cx + 5} 6.8 ${cx + 6.8} 6.2 ${cx + 8.2} 4.8`} stroke={stroke} strokeWidth="1" strokeLinecap="round" fill="none" />
      <path d={`M${cx + 2.8} 5 C${cx + 4.6} 5 ${cx + 6} 4.4 ${cx + 7} 3.2`} stroke={stroke} strokeWidth="1" strokeLinecap="round" fill="none" />
      <path d={`M${cx + 2.8} 3.4 C${cx + 4} 3.2 ${cx + 4.8} 2.8 ${cx + 5.4} 1.9`} stroke={stroke} strokeWidth="1" strokeLinecap="round" fill="none" />
    </>
  )
  const chevron = (stroke: string) => (
    <path d={`M${cx - 2.4} 11 L${cx} 9.8 L${cx + 2.4} 11`} stroke={stroke} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  )
  const height = t === 4 ? 12 : 10
  return (
    <svg
      width={(width / 10) * size}
      height={(height / 10) * size}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0"
      aria-hidden="true"
    >
      <path d={starPath(cx)} fill={color} />
      {t === 2 && arc(color)}
      {t >= 3 && wings(color)}
      {t === 4 && chevron(color)}
    </svg>
  )
}

/**
 * Champion emblems for a player: gold = individual season winner, silver =
 * winning-team member. Renders nothing for players with no honours.
 */
export function ChampStars({ playerId, size = 10 }: { playerId: string; size?: number }) {
  const { data } = useChampions()
  const mine: SeasonChampionRow[] = (data ?? []).filter((r) => r.player_id === playerId)
  if (mine.length === 0) return null
  const gold = mine.filter((r) => r.star === 'gold')
  const silver = mine.filter((r) => r.star === 'silver')
  const label = [
    gold.length > 0 ? `Champion: ${gold.map((r) => r.season_name).join(', ')}` : null,
    silver.length > 0 ? `Team champion: ${silver.map((r) => r.season_name).join(', ')}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <span className="inline-flex shrink-0 items-center gap-1 align-middle" title={label}>
      {gold.length > 0 && <Emblem tier={gold.length} color="var(--color-gold)" size={size} />}
      {silver.length > 0 && <Emblem tier={silver.length} color="var(--color-silver)" size={size} />}
    </span>
  )
}
