import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { usePlayer } from '../hooks/usePlayer'
import { fetchUnclaimedPlayers, linkPlayer } from '../lib/queries'
import { Avatar } from '../components/ui'

/* Shown when someone is signed in (e.g. with their Acca account) but not yet
   linked to a Milky Bay player: pick your name + group code, one time only. */

export default function Link() {
  const { session, me, loading } = usePlayer()
  const qc = useQueryClient()
  const [picked, setPicked] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const { data: unclaimed } = useQuery({
    queryKey: ['unclaimedPlayers'],
    queryFn: fetchUnclaimedPlayers,
    enabled: !!session && !me,
  })

  if (loading)
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <span className="overline">Loading…</span>
      </div>
    )
  if (!session) return <Navigate to="/login" replace />
  if (me) return <Navigate to="/" replace />

  const link = async () => {
    if (!picked) return
    setBusy(true)
    setError(null)
    try {
      await linkPlayer(picked, code)
      await qc.invalidateQueries({ queryKey: ['players'] })
      await qc.invalidateQueries({ queryKey: ['unclaimedPlayers'] })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center px-6 py-8">
      <div className="mb-7 text-center">
        <div className="display text-4xl">MILKY BAY</div>
        <div className="font-mono text-[12px] font-bold" style={{ color: 'var(--color-accent)' }}>
          LINK YOUR NAME
        </div>
      </div>

      <div className="rounded-[14px] bg-surface p-5">
        <p className="mb-4 text-[13px] text-muted">
          You're signed in, but this login isn't linked to a Milky Bay player yet. Pick your
          name and enter the group code — one time only.
        </p>

        <label className="overline mb-1.5 block">WHO ARE YOU?</label>
        <div className="mb-4 flex flex-wrap gap-2">
          {(unclaimed ?? []).map((p) => (
            <button
              key={p.id}
              onClick={() => setPicked(p.id)}
              className="flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3"
              style={
                picked === p.id
                  ? { borderColor: 'var(--color-accent)', background: 'rgba(116,192,232,0.1)' }
                  : { borderColor: 'var(--color-line-strong)' }
              }
            >
              <Avatar name={p.name} size={22} />
              <span
                className="text-[12px] font-semibold"
                style={{ color: picked === p.id ? 'var(--color-accent-bright)' : undefined }}
              >
                {p.name}
              </span>
            </button>
          ))}
          {unclaimed?.length === 0 && (
            <p className="text-[12px] text-muted">
              Every name is claimed. If one of them is yours, ask an admin to unlink it first.
            </p>
          )}
        </div>

        <label className="overline mb-1.5 block">GROUP CODE</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoCapitalize="characters"
          placeholder="From the group chat"
          className="mb-3 w-full rounded-[10px] border bg-surface-2 px-3.5 py-3 text-[15px]"
          style={{ borderColor: 'var(--color-line-strong)' }}
        />

        {error && (
          <p className="mb-2 text-[11.5px]" style={{ color: 'var(--color-loss)' }}>{error}</p>
        )}

        <button
          onClick={link}
          disabled={busy || !picked || !code}
          className="w-full rounded-[12px] py-3.5 text-[15px] font-bold disabled:opacity-40"
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-on-accent)',
            boxShadow: '0 4px 24px rgba(116,192,232,0.25)',
          }}
        >
          {busy ? 'One sec…' : 'Link my name'}
        </button>

        <button
          onClick={() => supabase.auth.signOut()}
          className="mt-3 w-full text-center text-[11.5px] text-muted underline"
        >
          Not you? Sign out
        </button>
      </div>
    </div>
  )
}
