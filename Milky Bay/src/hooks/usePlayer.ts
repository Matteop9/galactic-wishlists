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
  })
  const players: Player[] = query.data ?? []
  const me = session ? players.find((p) => p.auth_user_id === session.user.id) ?? null : null
  return {
    session,
    players,
    me,
    isAdmin: me?.is_admin ?? false,
    loading: loading || (!!session && query.isLoading),
    error: (query.error as Error | null) ?? null,
    loaded: query.isSuccess,
  }
}
