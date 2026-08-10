import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!loading && session) return <Navigate to="/" replace />

  const send = async () => {
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setBusy(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <div className="display text-4xl">THE ACCA</div>
        <div className="font-mono text-[12px] font-bold" style={{ color: 'var(--color-accent)' }}>
          26/27 · VDL v JHP
        </div>
      </div>

      {sent ? (
        <div className="rounded-[14px] bg-surface p-6 text-center">
          <div className="display mb-1 text-lg">CHECK YOUR EMAIL</div>
          <p className="text-sm text-muted">
            Magic link sent to <span className="font-semibold text-text">{email}</span>. Open it on
            this device to sign in.
          </p>
        </div>
      ) : (
        <div className="rounded-[14px] bg-surface p-5">
          <label className="overline mb-1.5 block">EMAIL</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && email && send()}
            placeholder="you@example.com"
            className="mb-3 w-full rounded-[10px] border bg-surface-2 px-3.5 py-3 text-[15px]"
            style={{ borderColor: 'var(--color-line-strong)' }}
          />
          {error && (
            <p className="mb-2 text-[11.5px]" style={{ color: 'var(--color-loss)' }}>{error}</p>
          )}
          <button
            onClick={send}
            disabled={!email || busy}
            className="w-full rounded-[12px] py-3.5 text-[15px] font-bold disabled:opacity-40"
            style={{
              background: 'var(--color-accent)',
              color: 'var(--color-on-accent)',
              boxShadow: '0 4px 24px rgba(180,227,61,0.25)',
            }}
          >
            {busy ? 'Sending…' : 'Send magic link'}
          </button>
          <p className="mt-3 text-center text-[11px] text-muted">
            First time? Open your claim link from Matteo after signing in.
          </p>
        </div>
      )}
    </div>
  )
}
