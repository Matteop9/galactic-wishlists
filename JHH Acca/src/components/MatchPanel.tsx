import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteMatchSuggestion,
  fetchFixtures,
  fetchMatchSuggestions,
  fetchWeekendFixtures,
  ingestResponses,
  matchPick,
  requestPickMatching,
} from '../lib/queries'
import type { PickScore } from '../lib/types'
import { ChampStars } from './ChampStars'

/* Admin match queue: fetch the weekend's fixture list (1 API call), run the
   AI auto-match (OpenRouter, async - ingest applies it), confirm low-
   confidence suggestions, or match/mark-no-live manually. */

export default function MatchPanel({ gwId, picks }: { gwId: string; picks: PickScore[] }) {
  const qc = useQueryClient()
  const [busy, setBusy] = useState<string | null>(null)
  const [choice, setChoice] = useState<Record<string, string>>({}) // pickId -> "fixtureId|side"

  const { data: fixtures } = useQuery({ queryKey: ['fixtures', gwId], queryFn: () => fetchFixtures(gwId) })
  const { data: suggestions } = useQuery({ queryKey: ['matchSuggestions'], queryFn: fetchMatchSuggestions })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['fixtures', gwId] })
    qc.invalidateQueries({ queryKey: ['matchSuggestions'] })
    qc.invalidateQueries({ queryKey: ['pickScores', gwId] })
    qc.invalidateQueries({ queryKey: ['live', gwId] })
  }

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label)
    try {
      await fn()
      invalidate()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const applyMatch = useMutation({
    mutationFn: ({ pickId, fixtureId, side }: { pickId: string; fixtureId: number | null; side: 'HOME' | 'AWAY' | null }) =>
      matchPick(pickId, fixtureId, side),
    onSuccess: invalidate,
  })

  const unmatched = picks.filter((p) => p.method !== 'N/A' && p.fixture_id == null)
  const sugFor = (pickId: string) => suggestions?.find((s) => s.pick_id === pickId)

  return (
    <div className="mb-5 rounded-[14px] border bg-surface p-3.5" style={{ borderColor: 'var(--color-line-strong)' }}>
      <div className="overline mb-2">LIVE SCORES — FIXTURE MATCHING (ADMIN)</div>
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          disabled={!!busy}
          onClick={() => run('fetch', () => fetchWeekendFixtures(gwId))}
          className="rounded-[8px] border px-3 py-1.5 text-[11px] font-bold disabled:opacity-40"
          style={{ borderColor: 'var(--color-line-strong)' }}
        >
          {busy === 'fetch' ? 'Requesting…' : `Fetch fixtures (${fixtures?.length ?? 0})`}
        </button>
        <button
          disabled={!!busy || !fixtures?.length || unmatched.length === 0}
          onClick={() => run('ai', () => requestPickMatching(gwId))}
          className="rounded-[8px] border px-3 py-1.5 text-[11px] font-bold disabled:opacity-40"
          style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
        >
          {busy === 'ai' ? 'Requesting…' : 'Auto-match (AI)'}
        </button>
        <button
          disabled={!!busy}
          onClick={() => run('ingest', ingestResponses)}
          className="rounded-[8px] border px-3 py-1.5 text-[11px] font-bold disabled:opacity-40"
          style={{ borderColor: 'var(--color-line-strong)', color: 'var(--color-muted)' }}
        >
          {busy === 'ingest' ? 'Checking…' : 'Check results'}
        </button>
      </div>
      <p className="mb-3 text-[10.5px] text-muted">
        Fetch and auto-match run in the background — tap “Check results” after ~10 seconds to pull
        them in. Picks left unmatched simply show “no live option”.
      </p>

      {unmatched.map((p) => {
        const sug = sugFor(p.id)
        const sugFixture = sug?.fixture_id != null ? fixtures?.find((f) => f.id === sug.fixture_id) : null
        const sel = choice[p.id] ?? ''
        return (
          <div key={p.id} className="border-t py-2.5" style={{ borderColor: 'var(--color-line)' }}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[12px] font-bold">
                {p.name} <ChampStars playerId={p.player_id} size={8} /> ·{' '}
                <span className="font-normal text-muted">{p.team}{p.second_team ? ` v ${p.second_team}` : ''} ({p.method})</span>
              </span>
            </div>
            {sug && (
              <div className="mb-1.5 flex items-center gap-2 text-[11px]">
                <span style={{ color: 'var(--color-gold)' }}>
                  AI: {sugFixture ? `${sugFixture.home_team} v ${sugFixture.away_team}${sug.fixture_side ? ` (${sug.fixture_side})` : ''}` : 'no live option'}
                  {sug.confidence != null ? ` · ${(Number(sug.confidence) * 100).toFixed(0)}%` : ''}
                </span>
                <button
                  className="rounded-[6px] border px-2 py-0.5 text-[10px] font-bold"
                  style={{ borderColor: 'var(--color-win-solid)', color: 'var(--color-win)' }}
                  onClick={() =>
                    run('conf' + p.id, async () => {
                      await matchPick(p.id, sug.fixture_id, sug.fixture_side, Number(sug.confidence ?? 0.5))
                      await deleteMatchSuggestion(p.id)
                    })
                  }
                >
                  Confirm
                </button>
                <button
                  className="rounded-[6px] border px-2 py-0.5 text-[10px] font-bold text-muted"
                  style={{ borderColor: 'var(--color-line-strong)' }}
                  onClick={() => run('rej' + p.id, () => deleteMatchSuggestion(p.id))}
                >
                  Dismiss
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <select
                value={sel}
                onChange={(e) => setChoice({ ...choice, [p.id]: e.target.value })}
                className="min-w-0 flex-1 rounded-[8px] border bg-surface-2 px-2 py-1.5 text-[11px]"
                style={{ borderColor: 'var(--color-line-strong)' }}
              >
                <option value="">Match manually…</option>
                {(fixtures ?? []).map((f) => (
                  <optgroup key={f.id} label={`${f.home_team} v ${f.away_team} (${f.competition})`}>
                    {p.method === 'BTTS' ? (
                      <option value={`${f.id}|`}>BTTS — this fixture</option>
                    ) : (
                      <>
                        <option value={`${f.id}|HOME`}>{f.home_team} (home)</option>
                        <option value={`${f.id}|AWAY`}>{f.away_team} (away)</option>
                      </>
                    )}
                  </optgroup>
                ))}
              </select>
              <button
                disabled={!sel || applyMatch.isPending}
                onClick={() => {
                  const [fid, side] = sel.split('|')
                  applyMatch.mutate({ pickId: p.id, fixtureId: Number(fid), side: (side || null) as 'HOME' | 'AWAY' | null })
                }}
                className="rounded-[8px] px-3 py-1.5 text-[11px] font-bold disabled:opacity-40"
                style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
              >
                Link
              </button>
            </div>
          </div>
        )
      })}
      {unmatched.length === 0 && (
        <p className="border-t pt-2 text-[11.5px] text-muted" style={{ borderColor: 'var(--color-line)' }}>
          Every pick is matched or has no live option.
        </p>
      )}
    </div>
  )
}
