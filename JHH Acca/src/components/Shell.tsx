import { Outlet } from 'react-router-dom'
import TabBar from './TabBar'

export default function Shell() {
  return (
    <div className="mx-auto min-h-dvh max-w-[480px] pb-24">
      <Outlet />
      <TabBar />
    </div>
  )
}
