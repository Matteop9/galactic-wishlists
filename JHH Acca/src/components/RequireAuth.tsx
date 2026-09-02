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
  const { session, me, loading } = usePlayer()

  if (loading) return <>{skeleton ?? <PageSkeleton />}</>

  if (!session) return <Navigate to="/login" replace />

  if (!me)
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-3 px-8 text-center">
        <div className="display text-xl">Account not linked</div>
        <p className="text-sm text-muted">
          You're signed in, but this login isn't linked to a player. Ask Matteo to sort your
          account on the admin page.
        </p>
      </div>
    )

  return <>{children}</>
}
