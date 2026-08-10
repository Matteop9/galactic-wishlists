import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { usePlayer } from '../hooks/usePlayer'

/* Session + claimed-player guard. RLS is the real enforcement; this is UX. */

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { session, me, loading } = usePlayer()

  if (loading)
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <span className="overline">Loading…</span>
      </div>
    )

  if (!session) return <Navigate to="/login" replace />

  if (!me)
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-3 px-8 text-center">
        <div className="display text-xl">Account not linked</div>
        <p className="text-sm text-muted">
          You're signed in, but this login isn't linked to a player yet. Ask Matteo for your claim
          link, then open it on this device.
        </p>
      </div>
    )

  return <>{children}</>
}
