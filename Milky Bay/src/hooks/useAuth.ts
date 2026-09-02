import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

/* getSession() sits behind a Web Lock and can stall forever if a suspended tab
   still holds it, so the gate never waits on it alone: INITIAL_SESSION can
   settle us first, and a timeout guarantees we stop rendering Loading… */
const AUTH_TIMEOUT_MS = 8000

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // subscribe first — INITIAL_SESSION fires on load and can resolve the gate
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      setLoading(false)
    })

    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    // last resort: fall through to the login redirect rather than hang
    const timer = setTimeout(() => setLoading(false), AUTH_TIMEOUT_MS)

    return () => {
      clearTimeout(timer)
      sub.subscription.unsubscribe()
    }
  }, [])

  return { session, loading }
}
