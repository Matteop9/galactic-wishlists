import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { claimPlayer } from '../lib/queries'
import { useAuth } from '../hooks/useAuth'

/* Claim link flow: stash the token, make sure the user is signed in, then
   link the login to the player row. */

export default function Claim() {
  const { token } = useParams<{ token: string }>()
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (token) localStorage.setItem('acca_claim_token', token)
  }, [token])

  useEffect(() => {
    if (loading || !session || !token || done) return
    claimPlayer(token)
      .then(() => {
        localStorage.removeItem('acca_claim_token')
        setDone(true)
        qc.invalidateQueries({ queryKey: ['players'] })
        setTimeout(() => navigate('/', { replace: true }), 1200)
      })
      .catch((e: Error) => setError(e.message))
  }, [loading, session, token, done, navigate, qc])

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center px-6 text-center">
      <div className="display mb-2 text-2xl">CLAIM YOUR SPOT</div>
      {!session && !loading && (
        <>
          <p className="mb-4 text-sm text-muted">
            Sign in first, then come back to this link — it'll finish automatically.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="rounded-[12px] px-6 py-3 text-[15px] font-bold"
            style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
          >
            Sign in
          </button>
        </>
      )}
      {session && !done && !error && <p className="text-sm text-muted">Linking your account…</p>}
      {done && (
        <p className="text-sm" style={{ color: 'var(--color-accent-bright)' }}>
          You're in. Loading the app…
        </p>
      )}
      {error && (
        <p className="text-sm" style={{ color: 'var(--color-loss)' }}>{error}</p>
      )}
    </div>
  )
}
