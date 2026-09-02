import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteTeamBadge, fetchTeamBadges, fetchTeamDictionary, saveTeamBadge } from '../lib/queries'
import { searchClubBadges, smallBadge, type BadgeCandidate } from '../lib/sportsdb'
import { crestUrl } from '../lib/teams'
import { TeamBadge } from './ui'
import { SkeletonPanel } from './Skeleton'

/* Admin -> Team logos (ported from The Acca v0.9.0). Every W-acca selection
   anyone has picked is checked against the build-time crest maps
   (lib/teams.ts); anything still on an initials chip is listed here with a
   one-click TheSportsDB lookup, a paste-a-URL escape hatch, and a skip for
   selections that aren't clubs. Saves land in team_badges (mb_0019), so a new
   crest is live for everyone the moment it's set — no code change, no deploy.
   Lives inside Admin's collapsible Section, which only mounts this when the
   admin opens it — that's what keeps the paged pick read off every page load. */

const btn = 'font-mono text-[10px] underline'
const lineStrong = { borderColor: 'var(--color-line-strong)' }

function Candidates({
  results,
  pending,
  error,
  onPick,
}: {
  results: BadgeCandidate[] | null
  pending: boolean
  error: string | null
  onPick: (url: string) => void
}) {
  return (
    <div className="mt-2">
      {pending && <p className="text-[11px] text-muted">Searching TheSportsDB…</p>}
      {error && (
        <p className="text-[11px]" style={{ color: 'var(--color-loss)' }}>
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {(results ?? []).map((c) => (
          <button
            key={c.id}
            onClick={() => onPick(smallBadge(c.badge))}
            className="flex items-center gap-2 rounded-[8px] border bg-surface-2 px-2 py-1.5 text-left"
            style={lineStrong}
          >
            <img
              src={smallBadge(c.badge)}
              alt=""
              width={22}
              height={22}
              style={{ width: 22, height: 22, objectFit: 'contain' }}
            />
            <span className="text-[11px] leading-tight">
              {c.team}
              <span className="block font-mono text-[9px] text-muted">
                {[c.country, c.league].filter(Boolean).join(' · ')}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function AdminTeamLogos() {
  const qc = useQueryClient()
  const [picking, setPicking] = useState<string | null>(null)
  const [pasting, setPasting] = useState<{ team: string; url: string } | null>(null)
  const [results, setResults] = useState<BadgeCandidate[] | null>(null)
  const [searchErr, setSearchErr] = useState<string | null>(null)

  // Both reads are shared cache entries: the dictionary with Enter Pick, the
  // overrides with every TeamBadge on the page.
  const { data: dict, isLoading: dictLoading } = useQuery({
    queryKey: ['teamDictionary'],
    queryFn: fetchTeamDictionary,
  })
  const { data: rows } = useQuery({ queryKey: ['teamBadges'], queryFn: fetchTeamBadges })
  const setHere = rows ?? []
  const decided = new Set(setHere.map((r) => r.team))

  const save = useMutation({
    mutationFn: ({ team, url }: { team: string; url: string | null }) => saveTeamBadge(team, url),
    onSuccess: () => {
      setPicking(null)
      setPasting(null)
      setResults(null)
      qc.invalidateQueries({ queryKey: ['teamBadges'] })
    },
  })
  const remove = useMutation({
    mutationFn: deleteTeamBadge,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teamBadges'] }),
  })
  const search = useMutation({
    mutationFn: searchClubBadges,
    onSuccess: (r) => {
      setResults(r)
      if (r.length === 0) setSearchErr('No club found — try the URL option.')
    },
    onError: (e) => setSearchErr((e as Error).message),
  })

  const find = (team: string) => {
    setPicking(team)
    setPasting(null)
    setResults(null)
    setSearchErr(null)
    search.mutate(team)
  }

  // Still on an initials chip: no build-time crest, and no decision recorded
  // in team_badges yet.
  const missing = (dict ?? []).filter((t) => !crestUrl(t.name) && !decided.has(t.name))

  if (dictLoading) return <SkeletonPanel rows={4} rowHeight={40} />

  return (
    <div>
      <div className="overline mb-1">
        {missing.length === 0 ? 'Every club has a logo ✓' : `${missing.length} without a logo`}
      </div>
      {missing.map((t) => (
        <div key={t.name} className="border-b py-2 last:border-b-0" style={{ borderColor: 'var(--color-line)' }}>
          <div className="flex items-center gap-2">
            <TeamBadge name={t.name} size={18} />
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold">{t.name}</span>
            <span className="font-mono text-[9px] text-muted">
              {t.uses} pick{t.uses === 1 ? '' : 's'}
            </span>
            <button className={btn} style={{ color: 'var(--color-accent)' }} onClick={() => find(t.name)}>
              FIND
            </button>
            <button
              className={`${btn} text-muted`}
              onClick={() => {
                setPasting({ team: t.name, url: '' })
                setPicking(null)
              }}
            >
              URL
            </button>
            <button
              className={`${btn} text-muted`}
              title="Not a club — stop listing it"
              onClick={() => save.mutate({ team: t.name, url: null })}
            >
              SKIP
            </button>
          </div>

          {picking === t.name && (
            <Candidates
              results={results}
              pending={search.isPending}
              error={searchErr}
              onPick={(url) => save.mutate({ team: t.name, url })}
            />
          )}

          {pasting?.team === t.name && (
            <div className="mt-2 flex gap-2">
              <input
                autoFocus
                value={pasting.url}
                onChange={(e) => setPasting({ team: t.name, url: e.target.value })}
                placeholder="https://… image URL"
                className="flex-1 rounded-[8px] border bg-surface-2 px-2 py-1 text-[11px]"
                style={lineStrong}
              />
              <button
                disabled={!pasting.url.trim().startsWith('https://') || save.isPending}
                onClick={() => save.mutate({ team: t.name, url: pasting.url.trim() })}
                className="rounded-[8px] px-3 text-[11px] font-bold disabled:opacity-40"
                style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
              >
                Save
              </button>
            </div>
          )}
        </div>
      ))}

      {(save.isError || remove.isError) && (
        <p className="mt-1 text-[11px]" style={{ color: 'var(--color-loss)' }}>
          {((save.error ?? remove.error) as Error).message}
        </p>
      )}

      {setHere.length > 0 && (
        <div className="mt-4">
          <div className="overline mb-1">Set here ({setHere.length})</div>
          {setHere.map((r) => (
            <div key={r.team}>
              <div className="flex items-center gap-2 border-b py-1.5" style={{ borderColor: 'var(--color-line)' }}>
                <TeamBadge name={r.team} size={16} />
                <span className="min-w-0 flex-1 truncate text-[11.5px]">{r.team}</span>
                {!r.badge_url && <span className="font-mono text-[9px] text-muted">SKIPPED</span>}
                <button className={btn} style={{ color: 'var(--color-accent)' }} onClick={() => find(r.team)}>
                  CHANGE
                </button>
                <button
                  className={btn}
                  style={{ color: 'var(--color-loss)' }}
                  onClick={() => remove.mutate(r.team)}
                  title="Forget this override (back to the built-in crest or initials)"
                >
                  ✕
                </button>
              </div>
              {picking === r.team && (
                <Candidates
                  results={results}
                  pending={search.isPending}
                  error={searchErr}
                  onPick={(url) => save.mutate({ team: r.team, url })}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[10.5px] leading-snug text-muted">
        FIND searches TheSportsDB by name · URL accepts any https image link · SKIP marks a
        selection as never needing a logo. Whatever you set shows up for everyone straight away.
      </p>
    </div>
  )
}
