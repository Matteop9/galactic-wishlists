import { NavLink, useLocation } from 'react-router-dom'

/* Design guide §3 tab bar: This Week · Table · Pick (raised 44px accent circle) · GWs · You */

function Icon({ d, active }: { d: string; active: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? 'var(--color-accent)' : 'var(--color-muted)'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  )
}

const tabs = [
  { to: '/', label: 'This Week', d: 'M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10' },
  { to: '/standings', label: 'Standings', d: 'M3 5h18M3 12h18M3 19h18' },
  null, // pick slot
  { to: '/gameweeks', label: 'GWs', d: 'M8 2v4M16 2v4M3 8h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z' },
  { to: '/players/me', label: 'You', d: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z' },
]

export default function TabBar() {
  const { pathname } = useLocation()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40">
      <div className="mx-auto max-w-[480px] border-t border-line bg-surface-2 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 items-end">
          {tabs.map((tab) =>
            tab ? (
              <NavLink
                key={tab.to}
                to={tab.to}
                className="flex min-h-14 flex-col items-center justify-center gap-1 py-2"
              >
                {({ isActive }) => {
                  const active = tab.to === '/' ? pathname === '/' : isActive
                  return (
                    <>
                      <Icon d={tab.d} active={active} />
                      <span
                        className="text-[9.5px] font-medium"
                        style={{ color: active ? 'var(--color-accent)' : 'var(--color-muted)' }}
                      >
                        {tab.label}
                      </span>
                    </>
                  )
                }}
              </NavLink>
            ) : (
              <div key="pick" className="relative flex justify-center">
                <NavLink
                  to="/pick"
                  className="absolute -top-[38px] flex h-11 w-11 items-center justify-center rounded-full bg-accent shadow-[0_4px_18px_rgba(116,192,232,0.35)]"
                  aria-label="Enter pick"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-on-accent)" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </NavLink>
                <span className="overline pb-2 pt-7 text-[9.5px]">Pick</span>
              </div>
            ),
          )}
        </div>
      </div>
    </nav>
  )
}
