import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { fetchUnclaimedPlayers, registerPlayer, usernameToEmail } from '../lib/queries'
import { Avatar } from '../components/ui'
import { PageSkeleton } from '../components/Skeleton'

/* Username + password auth for a fixed group: sign in, or - first time -
   pick your name, choose a username/password, enter the group code. */

export default function Login() {
  const { session, loading } = useAuth()
  const qc = useQueryClient()
  const [mode, setMode] = useState<'signin' | 'join'>('signin')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [pickedPlayer, setPickedPlayer] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const { data: unclaimed } = useQuery({
    queryKey: ['unclaimedPlayers'],
    queryFn: fetchUnclaimedPlayers,
    enabled: mode === 'join',
  })

  /* hold a placeholder rather than flashing the whole sign-in form at someone
     who is already signed in and about to be redirected */
  if (loading) return <PageSkeleton />
  if (session) return <Navigate to="/" replace />

  const signIn = async () => {
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    })
    setBusy(false)
    if (error)
      setError(error.message === 'Invalid login credentials' ? 'Wrong username or password' : error.message)
    else qc.invalidateQueries({ queryKey: ['players'] })
  }

  const join = async () => {
    if (!pickedPlayer) return
    setBusy(true)
    setError(null)
    try {
      const email = await registerPlayer(pickedPlayer, username, password, code)
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message)
      qc.invalidateQueries({ queryKey: ['players'] })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const input =
    'w-full rounded-[10px] border bg-surface-2 px-3.5 py-3 text-[15px] mb-3'
  const inputStyle = { borderColor: 'var(--color-line-strong)' }

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center px-6 py-8">
      <div className="mb-7 text-center">
        <div className="display text-4xl">THE ACCA</div>
        <div className="font-mono text-[12px] font-bold" style={{ color: 'var(--color-accent)' }}>
          26/27 · VDL v JHP
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        {(['signin', 'join'] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m)
              setError(null)
            }}
            className="flex-1 rounded-[10px] border px-3 py-2.5 text-[13px] font-semibold"
            style={
              mode === m
                ? { background: 'rgba(180,227,61,0.1)', border: '1.5px solid var(--color-accent)', color: 'var(--color-accent-bright)' }
                : { borderColor: 'var(--color-line-strong)', color: 'var(--color-muted)' }
            }
          >
            {m === 'signin' ? 'Sign in' : 'First time here'}
          </button>
        ))}
      </div>

      <div className="rounded-[14px] bg-surface p-5">
        {mode === 'join' && (
          <>
            <label className="overline mb-1.5 block">WHO ARE YOU?</label>
            <div className="mb-4 flex flex-wrap gap-2">
              {(unclaimed ?? []).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPickedPlayer(p.id)}
                  className="flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3"
                  style={
                    pickedPlayer === p.id
                      ? { borderColor: 'var(--color-accent)', background: 'rgba(180,227,61,0.1)' }
                      : { borderColor: 'var(--color-line-strong)' }
                  }
                >
                  <Avatar name={p.name} team={p.acca_team} size={22} />
                  <span
                    className="text-[12px] font-semibold"
                    style={{ color: pickedPlayer === p.id ? 'var(--color-accent-bright)' : undefined }}
                  >
                    {p.name}
                  </span>
                </button>
              ))}
              {unclaimed?.length === 0 && (
                <p className="text-[12px] text-muted">Everyone's already registered — use Sign in.</p>
              )}
            </div>
          </>
        )}

        <label className="overline mb-1.5 block">USERNAME</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="e.g. matteo"
          className={input}
          style={inputStyle}
        />
        <label className="overline mb-1.5 block">PASSWORD</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && mode === 'signin' && username && password && signIn()}
          placeholder={mode === 'join' ? 'At least 8 characters' : '••••••••'}
          className={input}
          style={inputStyle}
        />
        {mode === 'join' && (
          <>
            <label className="overline mb-1.5 block">GROUP CODE</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoCapitalize="characters"
              placeholder="From the group chat"
              className={input}
              style={inputStyle}
            />
          </>
        )}

        {error && (
          <p className="mb-2 text-[11.5px]" style={{ color: 'var(--color-loss)' }}>{error}</p>
        )}

        <button
          onClick={mode === 'signin' ? signIn : join}
          disabled={busy || !username || !password || (mode === 'join' && (!pickedPlayer || !code))}
          className="cta w-full rounded-[12px] py-3.5 text-[15px] font-bold disabled:opacity-40"
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-on-accent)',
            boxShadow: '0 4px 24px rgba(180,227,61,0.25)',
          }}
        >
          {busy ? 'One sec…' : mode === 'signin' ? 'Sign in' : 'Create my account'}
        </button>
        {mode === 'join' && (
          <p className="mt-3 text-center text-[11px] text-muted">
            One account per player. Forgot your password later? Matteo can reset it.
          </p>
        )}
      </div>
    </div>
  )
}
