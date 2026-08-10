import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/* Magic-link landing: once the session materialises, resume a pending claim
   or head home. */

export default function AuthCallback() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (session) {
      const pending = localStorage.getItem('acca_claim_token')
      navigate(pending ? `/claim/${pending}` : '/', { replace: true })
    } else {
      // token exchange can lag a beat; if still nothing after 4s, bail to login
      const t = setTimeout(() => navigate('/login', { replace: true }), 4000)
      return () => clearTimeout(t)
    }
  }, [session, loading, navigate])

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <span className="overline">Signing you in…</span>
    </div>
  )
}
