import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TabBar from './TabBar'
import RequireAuth from './RequireAuth'

export default function Shell() {
  const { pathname } = useLocation()
  /* React Router keeps the scroll position across navigations, so tapping a
     row at the bottom of a long list landed on the next page already scrolled. */
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="mx-auto min-h-dvh max-w-[480px] pb-24">
      {/* the tab bar sits OUTSIDE the gate so the chrome never blanks while
          the identity resolves */}
      <RequireAuth>
        <Outlet />
      </RequireAuth>
      <TabBar />
    </div>
  )
}
