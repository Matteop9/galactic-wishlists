import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Icon, { type IconName } from './Icon';
import { useAuth } from '../lib/auth';

function Tab({ to, label, icon }: { to: string; label: string; icon: IconName }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-1 flex-col items-center justify-center gap-1 font-display text-[10px] font-semibold tracking-[.08em] ${
          isActive ? 'text-phosphor' : 'text-faint'
        }`
      }
    >
      <Icon name={icon} />
      {label}
    </NavLink>
  );
}

/** Bottom tab bar: Home · Groups · ＋Add (elevated phosphor FAB) · Stats · Profile. */
export default function MobileTabBar() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const navigate = useNavigate();
  const { session } = useAuth();
  const isAnonymous = session?.user.is_anonymous === true;
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
            className="sheet-up absolute inset-x-0 bottom-0 mx-auto w-full max-w-[390px] rounded-t-sheet border border-b-0 border-line bg-panel p-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] shadow-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-label="Add a game"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => go('/add/scan')}
                className="press flex items-center justify-between rounded-card border border-line bg-well px-4 py-4 text-left"
              >
                <div>
                  <p className="font-display text-[15px] font-bold text-text">Scan scoreboard</p>
                  <p className="text-[12px] text-dim">Photograph the lane monitor</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => go('/live/new')}
                className="rounded-card border border-line bg-well px-4 py-4 text-left"
              >
                <p className="font-display text-[15px] font-bold text-text">Score live</p>
                <p className="text-[12px] text-dim">Frame by frame at the lane</p>
              </button>
              <button
                type="button"
                onClick={() => go('/add/quick')}
                className="rounded-card border border-line bg-well px-4 py-4 text-left"
              >
                <p className="font-display text-[15px] font-bold text-text">Quick add</p>
                <p className="text-[12px] text-dim">Just the totals — ten seconds</p>
              </button>
              <button
                type="button"
                onClick={() => go('/add/manual')}
                className="rounded-card border border-line bg-well px-4 py-4 text-left"
              >
                <p className="font-display text-[15px] font-bold text-text">Enter frames manually</p>
                <p className="text-[12px] text-dim">Full scorecard, roll by roll</p>
              </button>
              {!isAnonymous && (
                <button
                  type="button"
                  onClick={() => go('/matchday/new')}
                  className="rounded-card border border-line bg-well px-4 py-4 text-left"
                >
                  <p className="font-display text-[15px] font-bold text-text">Match day</p>
                  <p className="text-[12px] text-dim">Teams, handicaps, best-of series</p>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* index.html sets viewport-fit=cover, so without the inset the bar sits
          under the iPhone home indicator (COUNCIL_REVIEW_TODO item 24). */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex h-[78px] w-full max-w-[390px] items-stretch px-2">
          <Tab to="/" label="Home" icon="home" />
          <Tab to="/groups" label="Groups" icon="groups" />
          <div className="flex flex-1 items-center justify-center">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              aria-label="Add a game"
              className="-mt-6 flex size-14 items-center justify-center rounded-card bg-phosphor font-display text-[28px] font-bold text-ink shadow-glow-amber"
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
