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

  // Signed in (possibly with an Acca account) but not yet linked to a Milky
  // Bay player — send them to the link screen to claim their name.
  if (!me) return <Navigate to="/link" replace />

  return <>{children}</>
}
