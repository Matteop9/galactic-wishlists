import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const ICONS = {
  home: 'M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5',
  groups: 'M7 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm10 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2.5 19c.5-3 2.5-4.5 4.5-4.5S11 16 11.5 19m1-.5c.4-2.4 2-4 4.5-4s4 1.5 4.5 4',
  stats: 'M4 20V10m5.5 10V4m5.5 16v-7m5.5 7V7',
  profile: 'M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-7 9c.8-3.5 3.5-5.5 7-5.5s6.2 2 7 5.5',
} as const;

function TabIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function Tab({ to, label, icon }: { to: string; label: string; icon: keyof typeof ICONS }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-1 flex-col items-center justify-center gap-1 font-display text-[10px] font-semibold tracking-[.08em] ${
          isActive ? 'text-phosphor' : 'text-faint'
        }`
      }
    >
      <TabIcon d={ICONS[icon]} />
      {label}
    </NavLink>
  );
}

/** Bottom tab bar: Home · Groups · ＋Add (elevated phosphor FAB) · Stats · Profile. */
export default function MobileTabBar() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const navigate = useNavigate();
  const go = (to: string) => {
    setSheetOpen(false);
    navigate(to);
  };

  return (
    <>
      {sheetOpen && (
        <div
          className="fade-in fixed inset-0 z-40 bg-black/60"
          onClick={() => setSheetOpen(false)}
          aria-hidden
        >
          <div
            className="sheet-up absolute inset-x-0 bottom-0 mx-auto w-full max-w-[390px] rounded-t-3xl border border-b-0 border-line bg-panel p-4 pb-8 shadow-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-label="Add a game"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => go('/add/scan')}
                className="press flex items-center justify-between rounded-xl border border-phosphor/40 bg-well px-4 py-4 text-left shadow-glow-amber"
              >
                <div>
                  <p className="font-display text-[15px] font-bold text-text">Scan scoreboard</p>
                  <p className="text-[12px] text-dim">Photograph the lane monitor</p>
                </div>
                <span className="label-caps text-phosphor">Fastest</span>
              </button>
              <button
                type="button"
                onClick={() => go('/live/new')}
                className="rounded-xl border border-line bg-well px-4 py-4 text-left"
              >
                <p className="font-display text-[15px] font-bold text-text">Score live</p>
                <p className="text-[12px] text-dim">Frame by frame at the lane</p>
              </button>
              <button
                type="button"
                onClick={() => go('/add/quick')}
                className="rounded-xl border border-line bg-well px-4 py-4 text-left"
              >
                <p className="font-display text-[15px] font-bold text-text">Quick add</p>
                <p className="text-[12px] text-dim">Just the totals — ten seconds</p>
              </button>
              <button
                type="button"
                onClick={() => go('/add/manual')}
                className="rounded-xl border border-line bg-well px-4 py-4 text-left"
              >
                <p className="font-display text-[15px] font-bold text-text">Enter frames manually</p>
                <p className="text-[12px] text-dim">Full scorecard, roll by roll</p>
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-panel/95 backdrop-blur">
        <div className="mx-auto flex h-[78px] w-full max-w-[390px] items-stretch px-2">
          <Tab to="/" label="Home" icon="home" />
          <Tab to="/groups" label="Groups" icon="groups" />
          <div className="flex flex-1 items-center justify-center">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              aria-label="Add a game"
              className="-mt-6 flex size-14 items-center justify-center rounded-2xl bg-phosphor font-display text-[28px] font-bold text-ink shadow-glow-amber"
            >
              +
            </button>
          </div>
          <Tab to="/stats" label="Stats" icon="stats" />
          <Tab to="/profile" label="Profile" icon="profile" />
        </div>
      </nav>
    </>
  );
}
