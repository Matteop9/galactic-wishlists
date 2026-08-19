import { Outlet } from 'react-router-dom'
import TabBar from './TabBar'
import RequireAuth from './RequireAuth'

export default function Shell() {
  return (
    <RequireAuth>
      <div className="mx-auto min-h-dvh max-w-[480px] pb-24">
        <Outlet />
        <TabBar />
      </div>
    </RequireAuth>
  )
}
