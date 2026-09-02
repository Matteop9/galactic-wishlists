import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { usePlayer } from '../hooks/usePlayer'
import { PageSkeleton } from './Skeleton'

/* Session + claimed-player guard. RLS is the real enforcement; this is UX.
   `skeleton` lets a page pass its own silhouette so the gate looks like the
   page that's coming, not like a blank screen. */

export default function RequireAuth({
  children,
  skeleton,
}: {
  children: ReactNode
  skeleton?: ReactNode
}) {
  const { session, me, loading, error, loaded } = usePlayer()

  if (loading) return <>{skeleton ?? <PageSkeleton />}</>

  if (!session) return <Navigate to="/login" replace />

  // A failed players fetch must NOT masquerade as "you have no player row" —
  // that would bounce a fully-linked user to /link ("every name is claimed").
  if (error)
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="overline">Couldn't reach Milky Bay</span>
        <p className="text-[13px] text-muted">Check your connection and try again.</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-[10px] px-4 py-2 text-[13px] font-bold"
          style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
        >
          Retry
        </button>
      </div>
    )

  // Signed in (possibly with an Acca account) but not yet linked to a Milky
  // Bay player — send them to the link screen to claim their name.
  if (loaded && !me) return <Navigate to="/link" replace />

  return <>{children}</>
}
