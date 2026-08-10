import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchCurrentGameweek,
  fetchPickScores,
  fetchSeasonTeamMembers,
  fetchSeasons,
  fetchTeamDictionary,
  upsertPick,
} from '../lib/queries'
import { usePlayer } from '../hooks/usePlayer'
import { useCountdown } from '../hooks/useCountdown'
import RequireAuth from '../components/RequireAuth'
import LiveBanner from '../components/LiveBanner'
import TeamCombobox from '../components/TeamCombobox'
import { Avatar, IntlBreakChip, PageTitle, teamColor } from '../components/ui'
import { gwDate, odds2, ukTime } from '../lib/format'
import { SPORTS } from '../lib/teams'

/* Enter Pick: any teammate can enter for their team (pair-scoped on the Test
   Weekend). Method segmented control, selection, second team iff BTTS, odds
   stepper (min 1.50), lock CTA, team progress row. */

function EnterPickInner() {
  const qc = useQueryClient()
  const { me, players } = usePlayer()
  const { data: gw } = useQuery({ queryKey: ['currentGw'], queryFn: fetchCurrentGameweek })
  const { data: seasons } = useQuery({ queryKey: ['seasons'], queryFn: fetchSeasons })
  const season = seasons?.find((s) => s.id === gw?.season_id)
  const { data: stm } = useQuery({
    queryKey: ['stm', season?.id],
    queryFn: () => fetchSeasonTeamMembers(season!.id),
    enabled: !!season,
  })
  const { data: picks } = useQuery({
    queryKey: ['pickScores', gw?.id],
    queryFn: () => fetchPickScores(gw!.id),
    enabled: !!gw,
  })
  const { data: teamDict } = useQuery({
    queryKey: ['teamDictionary'],
    queryFn: fetchTeamDictionary,
    staleTime: 10 * 60_000,
  })

  // Break weeks suggest sports; normal weeks suggest clubs (never both).
  const isBreak = !!gw?.is_international_break
  const pickOptions = useMemo(() => {
    const dict = teamDict ?? []
    if (!isBreak) return dict.filter((o) => !SPORTS.has(o.name))
    const used = dict.filter((o) => SPORTS.has(o.name))
    const unused = [...SPORTS]
      .filter((s) => !used.some((u) => u.name === s))
      .map((name) => ({ name, uses: 0 }))
    return [...used, ...unused]
  }, [teamDict, isBreak])

  // Who can I pick for? season_team_members mapping if it exists, else my acca team.
  const myTeamPlayers = useMemo(() => {
    if (!me) return []
    if (stm && stm.length > 0) {
      const mine = stm.find((m) => m.player_id === me.id)
      if (!mine) return [] // not taking part in this (test) gameweek
      const ids = new Set(stm.filter((m) => m.team_name === mine.team_name).map((m) => m.player_id))
      return players.filter((p) => ids.has(p.id))
    }
    return players.filter((p) => p.acca_team === me.acca_team)
  }, [me, players, stm])

  const [forPlayer, setForPlayer] = useState<string | null>(null)
  const target = forPlayer ?? me?.id ?? null
  const existing = picks?.find((p) => p.player_id === target && p.method !== 'N/A')

  const [method, setMethod] = useState<'Win' | 'BTTS'>('Win')
  const [team, setTeam] = useState('')
  const [secondTeam, setSecondTeam] = useState('')
  const [odds, setOdds] = useState(1.5)

  useEffect(() => {
    if (existing) {
      setMethod(existing.method === 'BTTS' ? 'BTTS' : 'Win')
      setTeam(existing.team)
      setSecondTeam(existing.second_team ?? '')
      setOdds(Number(existing.odds))
    } else {
      setTeam('')
      setSecondTeam('')
      setOdds(1.5)
      setMethod('Win')
    }
  }, [existing?.id, target])

  const windowOpen =
    !!gw &&
    ['scheduled', 'open'].includes(gw.status) &&
    Date.now() >= new Date(gw.window_opens).getTime() &&
    Date.now() < new Date(gw.window_closes).getTime()
  const closesIn = useCountdown(windowOpen ? gw!.window_closes : null)

  const save = useMutation({
    mutationFn: () =>
      upsertPick({
        gameweek_id: gw!.id,
        player_id: target!,
        method,
        team: team.trim(),
        second_team: method === 'BTTS' ? secondTeam.trim() || null : null,
        odds: Math.round(odds * 100) / 100,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pickScores', gw?.id] }),
  })

  const valid =
    !!target && team.trim().length > 0 && odds >= 1.5 && (method === 'Win' || secondTeam.trim().length > 0)

  if (!gw)
    return (
      <div className="px-4">
        <PageTitle>ENTER PICK</PageTitle>
        <div className="rounded-[14px] bg-surface p-6 text-center text-sm text-muted">No gameweek scheduled.</div>
      </div>
    )

  if (me && myTeamPlayers.length === 0)
    return (
      <div className="px-4">
        <PageTitle>ENTER PICK</PageTitle>
        <div className="rounded-[14px] bg-surface p-6 text-center text-sm text-muted">
          You're not taking part in this gameweek — {gwDate(gw.gw_date)} is
          {season?.kind === 'test' ? ' a Test Weekend for drawn pairs and you\'re not in one. You can still watch everything.' : ' restricted.'}
        </div>
      </div>
    )

  return (
    <div className="px-4 pb-6">
      <PageTitle
        right={
          windowOpen ? (
            <span className="font-mono text-[11px]" style={{ color: 'var(--color-accent)' }}>{closesIn}</span>
          ) : undefined
        }
      >
        ENTER PICK
      </PageTitle>

      <div
        className="mb-3 rounded-[12px] border px-3.5 py-2.5 text-[11.5px]"
        style={{
          borderColor: 'color-mix(in srgb, var(--color-gold) 45%, transparent)',
          background: 'rgba(242,201,76,0.07)',
          color: 'var(--color-gold)',
        }}
      >
        <span className="font-bold">Group chat first.</span> This page only records your pick — it
        doesn't count unless it's been posted in the group chat.
      </div>

      {isBreak && (
        <div
          className="mb-3 flex items-start gap-2 rounded-[12px] border px-3.5 py-2.5 text-[11.5px]"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-jhp) 45%, transparent)',
            background: 'rgba(87,184,240,0.07)',
            color: 'var(--color-jhp)',
          }}
        >
          <span className="pt-0.5"><IntlBreakChip /></span>
          <span>
            No club football this week — pick a <span className="font-bold">sport</span> instead
            (NFL, boxing, the horses…). Odds rules as normal. No live scores on break weeks.
          </span>
        </div>
      )}

      {!windowOpen && (
        <LiveBanner pulse={false}>
          Window is {gw.status === 'closed' || Date.now() >= new Date(gw.window_closes).getTime() ? 'closed' : `not open yet — opens ${ukTime(gw.window_opens)}`}
        </LiveBanner>
      )}

      {/* who am I picking for */}
      <div className="mb-4 mt-3">
        <div className="overline mb-1.5">PICKING FOR — {gwDate(gw.gw_date)}</div>
        <div className="flex flex-wrap gap-2">
          {myTeamPlayers.map((p) => {
            const has = picks?.some((x) => x.player_id === p.id && x.method !== 'N/A')
            const active = target === p.id
            return (
              <button
                key={p.id}
                onClick={() => setForPlayer(p.id)}
                className="flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3"
                style={
                  active
                    ? { borderColor: 'var(--color-accent)', background: 'rgba(180,227,61,0.1)' }
                    : { borderColor: has ? 'var(--color-line-strong)' : 'transparent', borderStyle: has ? 'solid' : 'dashed', outline: has ? undefined : '1px dashed var(--color-line-strong)' }
                }
              >
                <Avatar name={p.name} team={p.acca_team} size={22} />
                <span className="text-[12px] font-semibold" style={{ color: active ? 'var(--color-accent-bright)' : teamColor(p.acca_team) }}>
                  {p.name}
                  {p.id === me?.id ? ' (you)' : ''}
                </span>
                {has && <span className="font-mono text-[9px]" style={{ color: 'var(--color-win)' }}>✓</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* method segmented */}
      <div className="mb-4">
        <div className="overline mb-1.5">METHOD</div>
        <div className="flex gap-2">
          {(['Win', 'BTTS'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className="flex-1 rounded-[10px] border px-3 py-2.5 text-[13px] font-semibold"
              style={
                method === m
                  ? { background: 'rgba(180,227,61,0.1)', border: '1.5px solid var(--color-accent)', color: 'var(--color-accent-bright)' }
                  : { borderColor: 'var(--color-line-strong)', color: 'var(--color-muted)' }
              }
            >
              {m === 'Win' ? 'Win' : 'Both teams to score'}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <div className="overline mb-1.5">
          {isBreak ? 'SPORT' : method === 'BTTS' ? 'FIRST TEAM' : 'SELECTION'}
        </div>
        <TeamCombobox
          value={team}
          onChange={setTeam}
          options={pickOptions}
          placeholder={isBreak ? 'e.g. NFL' : method === 'BTTS' ? 'e.g. Bolton' : 'e.g. Charlton'}
        />
      </div>

      <div className="mb-4" style={{ opacity: method === 'BTTS' ? 1 : 0.4 }}>
        <div className="overline mb-1.5">SECOND TEAM</div>
        <TeamCombobox
          value={secondTeam}
          onChange={setSecondTeam}
          options={pickOptions}
          disabled={method !== 'BTTS'}
          placeholder={method === 'BTTS' ? 'e.g. Stockport' : 'Only for BTTS picks'}
        />
      </div>

      {/* odds stepper */}
      <div className="mb-5">
        <div className="overline mb-1.5">DECIMAL ODDS</div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOdds((o) => Math.max(1.5, Math.round((o - 0.05) * 100) / 100))}
            className="h-11 w-11 rounded-[10px] border text-xl font-bold"
            style={{ borderColor: 'var(--color-line-strong)', color: 'var(--color-muted)' }}
          >
            −
          </button>
          <input
            inputMode="decimal"
            value={odds}
            onChange={(e) => {
              const v = parseFloat(e.target.value)
              if (!Number.isNaN(v)) setOdds(v)
              else if (e.target.value === '') setOdds(0)
            }}
            className="w-24 flex-1 rounded-[10px] border bg-surface-2 py-2 text-center font-mono text-2xl font-bold"
            style={{ borderColor: 'var(--color-line-strong)' }}
          />
          <button
            onClick={() => setOdds((o) => Math.round((o + 0.05) * 100) / 100)}
            className="h-11 w-11 rounded-[10px] border text-xl font-bold"
            style={{ borderColor: 'var(--color-line-strong)', color: 'var(--color-muted)' }}
          >
            +
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-muted">Minimum 1.50 · odds lock at submission</p>
      </div>

      <div className="mb-5 rounded-[12px] border p-3.5 text-[11.5px] text-muted" style={{ borderColor: 'var(--color-line)' }}>
        Picks are public the moment they're in, with a one-hour challenge window. If odds have
        moved, you get the lower odds unless you've got a timestamped screenshot. Saturday 2 PM+
        kick-offs only; Bet365 Winnings Boost eligible.
      </div>

      {save.isError && (
        <p className="mb-2 text-[11.5px]" style={{ color: 'var(--color-loss)' }}>
          {(save.error as Error).message}
        </p>
      )}
      {save.isSuccess && (
        <p className="mb-2 text-[11.5px]" style={{ color: 'var(--color-accent-bright)' }}>
          Locked in{existing ? ' (updated)' : ''}. Editable until {ukTime(gw.window_closes)}.
        </p>
      )}

      <button
        disabled={!valid || !windowOpen || save.isPending}
        onClick={() => save.mutate()}
        className="w-full rounded-[12px] py-3.5 text-[15px] font-bold disabled:opacity-40"
        style={{
          background: 'var(--color-accent)',
          color: 'var(--color-on-accent)',
          boxShadow: '0 4px 24px rgba(180,227,61,0.25)',
        }}
      >
        {existing ? 'Update pick' : 'Lock it in'}
      </button>
      <p className="mt-2 text-center text-[11px] text-muted">
        {odds2(odds)} on {team || '…'} {method === 'BTTS' ? `v ${secondTeam || '…'} (BTTS)` : 'to win'}
      </p>
    </div>
  )
}

export default function EnterPick() {
  return (
    <RequireAuth>
      <EnterPickInner />
    </RequireAuth>
  )
}
