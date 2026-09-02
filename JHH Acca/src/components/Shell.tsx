import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TabBar from './TabBar'

export default function Shell() {
  const { pathname } = useLocation()
  /* React Router keeps the scroll position across navigations, so tapping a
     gameweek from the bottom of a long list landed on the detail page already
     scrolled — which reads as "loaded broken". */
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="mx-auto min-h-dvh max-w-[480px] pb-24">
      <Outlet />
      <TabBar />
    </div>
  )
}
