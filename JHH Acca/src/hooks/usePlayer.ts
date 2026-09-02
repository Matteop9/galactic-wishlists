import { useQuery } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { fetchPlayers } from '../lib/queries'
import type { Player } from '../lib/types'

/** All players plus the claimed player row for the signed-in user. */
export function usePlayer() {
  const { session, loading } = useAuth()
  const query = useQuery({
    queryKey: ['players'],
    queryFn: fetchPlayers,
    enabled: !!session,
    // player rows change roughly never; without this any cache eviction
    // re-gates the whole app behind RequireAuth's placeholder
    staleTime: 5 * 60_000,
  })
  const players: Player[] = query.data ?? []
  const me = session ? players.find((p) => p.auth_user_id === session.user.id) ?? null : null
  const isLoading = loading || (!!session && query.isLoading)
  return {
    session,
    players,
    me,
    isAdmin: me?.is_admin ?? false,
    loading: isLoading,
    /** identity resolved — pages use this to avoid flashing "not found"/"admins only" */
    ready: !isLoading,
  }
}
