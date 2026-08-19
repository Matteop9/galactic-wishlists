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

/* Emblem grammar (docs/Emblem Grammar.dc.html). Tiers 1–4 are the original
   shipped marks and stay canonical; tiers 5+ follow the register sequence
   FLANK → BASE (chevrons) → CREST (rays) → FRAME (ring) → PLINTH (banner).
   Tier 9+ = one more BASE chevron per tier, viewBox height +2 — unbounded.
   All tiers render at the SAME height; the silhouette, not the size, carries
   rank, so runs share one baseline. */

type Part =
  | { kind: 'fill'; d: string }
  | { kind: 'stroke'; d: string; w: number }

const r = (n: number) => Math.round(n * 100) / 100

const STAR_PTS: Array<[number, number]> = [
  [0, 0], [1.12, 3.45], [4.76, 3.45], [1.82, 5.59], [2.94, 9.05],
  [0, 6.91], [-2.94, 9.05], [-1.82, 5.59], [-4.76, 3.45], [-1.12, 3.45],
]

function starPath(cx: number, dy = 0): string {
  return 'M' + STAR_PTS.map(([x, y]) => `${r(cx + x)} ${r(dy + y)}`).join('L') + 'Z'
}

/* --- tier 5+ registers --- */

function wingsNew(cx: number, dy: number): Part[] {
  const rel = [
    [4.4, 4.0, 6.1, 3.6, 7.5, 2.8, 8.1, 1.6],
    [4.6, 5.6, 6.3, 5.4, 7.7, 4.7, 8.4, 3.6],
    [4.7, 7.1, 6.2, 7.1, 7.5, 6.6, 8.2, 5.7],
  ]
  const out: Part[] = []
  for (const g of [-1, 1])
    for (const q of rel)
      out.push({
        kind: 'stroke', w: 1,
        d: `M${r(cx + g * q[0])} ${r(dy + q[1])}C${r(cx + g * q[2])} ${r(dy + q[3])} ${r(cx + g * q[4])} ${r(dy + q[5])} ${r(cx + g * q[6])} ${r(dy + q[7])}`,
      })
  return out
}

function wreathIn(cx: number, dy: number, s: number): Part[] {
  return [-1, 1].map((g): Part => ({
    kind: 'stroke', w: 1,
    d: `M${r(cx + g * s)} ${r(dy + 9.6)}C${r(cx + g * (s + 0.8))} ${r(dy + 8.2)} ${r(cx + g * (s + 1))} ${r(dy + 6.6)} ${r(cx + g * (s + 0.6))} ${r(dy + 5.2)}`,
  }))
}

function chev(cx: number, by: number): Part {
  return { kind: 'stroke', w: 1.1, d: `M${r(cx - 2.4)} ${r(by)}L${r(cx)} ${r(by - 1.2)}L${r(cx + 2.4)} ${r(by)}` }
}

function rays(cx: number, ty: number): Part[] {
  return [
    { kind: 'stroke', w: 1.1, d: `M${r(cx)} ${r(ty)}L${r(cx)} ${r(ty + 2)}` },
    { kind: 'stroke', w: 1.1, d: `M${r(cx - 3.1)} ${r(ty + 0.6)}L${r(cx - 1.9)} ${r(ty + 2.2)}` },
    { kind: 'stroke', w: 1.1, d: `M${r(cx + 3.1)} ${r(ty + 0.6)}L${r(cx + 1.9)} ${r(ty + 2.2)}` },
  ]
}

function ringTop(cx: number, cy: number, rr: number): Part {
  const k = 0.47, q = 0.883
  return { kind: 'stroke', w: 1.1, d: `M${r(cx - k * rr)} ${r(cy - q * rr)}A${rr} ${rr} 0 1 0 ${r(cx + k * rr)} ${r(cy - q * rr)}` }
}

function banner(cx: number, y: number): Part {
  return { kind: 'fill', d: `M${r(cx - 4.8)} ${r(y)}L${r(cx + 4.8)} ${r(y)}L${r(cx + 4)} ${r(y + 1.7)}L${r(cx - 4)} ${r(y + 1.7)}Z` }
}

/** Star + wings + inner laurel — the tier-4+ core the higher registers build on. */
function starBase(cx: number, dy: number): Part[] {
  return [{ kind: 'fill', d: starPath(cx, dy) }, ...wingsNew(cx, dy), ...wreathIn(cx, dy, 4.9)]
}

function starTier(t: number): { w: number; h: number; parts: Part[] } {
  if (t === 5) return { w: 18, h: 14, parts: [...starBase(9, 0), chev(9, 11), chev(9, 13)] }
  if (t === 6) return { w: 18, h: 17, parts: [...starBase(9, 3), chev(9, 14), chev(9, 16), ...rays(9, 0.6)] }
  const extra = Math.max(t - 8, 0)
  const chevs = Array.from({ length: 2 + extra }, (_, i) => chev(11, 14.4 + i * 2))
  const parts = [...starBase(11, 3.4), ...chevs, ...rays(11, 0.6), ringTop(11, 9.3, 8.5)]
  if (t >= 8) parts.push(banner(11, 18.2 + extra * 2))
  return { w: 22, h: t === 7 ? 18.5 : 20 + extra * 2, parts }
}

/**
 * Rank emblem that evolves with win count rather than repeating glyphs:
 * 1 star · 2 +laurel · 3 wings · 4 wings+laurel+chevron · 5 double chevron ·
 * 6 +rays · 7 laurel seals into a ring · 8 +banner · 9+ chevrons stack.
 */
export function Emblem({ tier, color, size }: { tier: number; color: string; size: number }) {
  const t = Math.max(tier, 1)
  if (t <= 4) {
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
        width={r((width / height) * size)}
        height={size}
        viewBox={`0 0 ${width} ${height}`}
        overflow="visible"
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
  const g = starTier(t)
  return (
    <svg
      width={r((g.w / g.h) * size)}
      height={size}
      viewBox={`0 0 ${g.w} ${g.h}`}
      overflow="visible"
      className="shrink-0"
      aria-hidden="true"
    >
      {g.parts.map((p, i) =>
        p.kind === 'fill' ? (
          <path key={i} d={p.d} fill={color} />
        ) : (
          <path key={i} d={p.d} stroke={color} strokeWidth={p.w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ),
      )}
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
    <span className="inline-flex shrink-0 items-end align-middle" style={{ gap: r(size * 0.3) }} title={label}>
      {gold.length > 0 && <Emblem tier={gold.length} color="var(--color-gold)" size={size} />}
      {silver.length > 0 && <Emblem tier={silver.length} color="var(--color-silver)" size={size} />}
    </span>
  )
}
