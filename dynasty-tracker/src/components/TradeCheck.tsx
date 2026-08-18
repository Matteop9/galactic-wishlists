import { useMemo, useState } from 'react'
import { thresholds } from '../lib/config'
import { fmtValue } from '../lib/format'
import type { LeagueReport } from '../lib/engine/report'
import { checkTrade, type MarketPlayer, type TradeNote } from '../lib/engine/tradeCheck'
import { PlayerFace } from './PlayerFace'

interface Props {
  league: LeagueReport
  pool: MarketPlayer[]
}

function gradeDot(grade: TradeNote['grade']): string {
  if (grade === 'good') return 'dot dot-hold'
  if (grade === 'bad') return 'dot dot-sell'
  return 'dot dot-unsure'
}

export function TradeCheck({ league, pool }: Props) {
  const [giveIds, setGiveIds] = useState<string[]>([])
  const [getIds, setGetIds] = useState<string[]>([])
  const [search, setSearch] = useState('')

  const gives = league.verdicts.filter((v) => giveIds.includes(v.playerId))
  const gets = pool.filter((p) => getIds.includes(p.playerId))

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (q.length < 2) return []
    return pool.filter((p) => !getIds.includes(p.playerId) && p.name.toLowerCase().includes(q)).slice(0, 8)
  }, [search, pool, getIds])

  const result = useMemo(
    () =>
      gives.length > 0 || gets.length > 0
        ? checkTrade(
            gives,
            gets,
            league.myProfile,
            league.myDirection,
            league.myRanks.starter,
            league.numTeams,
            league.rosterPositions,
            thresholds,
          )
        : null,
    [gives, gets, league],
  )

  return (
    <div className="card trade-check">
      <div className="trade-sides">
        <div className="trade-side">
          <div className="pop-label">I give</div>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) setGiveIds([...giveIds, e.target.value])
            }}
          >
            <option value="">Add from my roster…</option>
            {league.verdicts
              .filter((v) => !giveIds.includes(v.playerId))
              .map((v) => (
                <option key={v.playerId} value={v.playerId}>
                  {v.name} ({v.position}, {fmtValue(v.adjValue)})
                </option>
              ))}
          </select>
          {gives.map((v) => (
            <button key={v.playerId} className="chip" onClick={() => setGiveIds(giveIds.filter((id) => id !== v.playerId))}>
              {v.name} ×
            </button>
          ))}
        </div>
        <div className="trade-side">
          <div className="pop-label">I get</div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search their rosters…"
          />
          {matches.map((p) => (
            <button
              key={p.playerId}
              className="chip chip-add"
              onClick={() => {
                setGetIds([...getIds, p.playerId])
                setSearch('')
              }}
            >
              {p.name} <span className="dim">({p.position}, {fmtValue(p.adjValue)} — {p.holderName})</span>
            </button>
          ))}
          {gets.map((p) => (
            <button key={p.playerId} className="chip" onClick={() => setGetIds(getIds.filter((id) => id !== p.playerId))}>
              {p.name} ×
            </button>
          ))}
        </div>
      </div>

      {result && (
        <div className="trade-result">
          <p className="trade-summary">{result.summary}</p>
          <p className="small dim">
            Starting lineup {result.starterValueDelta >= 0 ? 'gains' : 'loses'}{' '}
            {fmtValue(Math.abs(result.starterValueDelta))} adjusted value.
          </p>
          {[...result.gives, ...result.gets.map((g) => ({ ...g, incoming: true }))].map((note) => {
            const source = 'incoming' in note ? gets.find((p) => p.playerId === note.playerId) : gives.find((v) => v.playerId === note.playerId)
            return (
              <div className="trade-note" key={`${'incoming' in note ? 'in' : 'out'}-${note.playerId}`}>
                {source && <PlayerFace playerId={note.playerId} name={note.name} position={source.position} size={26} />}
                <span className={gradeDot(note.grade)} />
                <span>
                  <strong>{note.name}</strong> <span className="dim">— {note.note}</span>
                </span>
              </div>
            )
          })}
          <button
            className="dispute-btn"
            onClick={() => {
              setGiveIds([])
              setGetIds([])
              setSearch('')
            }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}
