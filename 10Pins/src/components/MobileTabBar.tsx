import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Icon, { type IconName } from './Icon';
import Sheet from './Sheet';
import Strip from './Strip';
import Wordmark from './Wordmark';
import { useAuth } from '../lib/auth';

const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Feed', icon: 'home' },
  { to: '/groups', label: 'Groups', icon: 'groups' },
  { to: '/stats', label: 'Stats', icon: 'stats' },
  { to: '/profile', label: 'Profile', icon: 'profile' },
];

function Tab({ to, label, icon }: { to: string; label: string; icon: IconName }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex min-h-[44px] flex-col items-center justify-center gap-[3px] py-1.5 text-[11px] ${
          isActive ? 'font-semibold text-ink' : 'text-ink-faded'
        }`
      }
    >
      <Icon name={icon} className="size-6" />
      {label}
    </NavLink>
  );
}

/** Hides the bar on scroll-down and restores it on scroll-up (DESIGN.md spacing). */
function useHideOnScroll(): boolean {
  const [hidden, setHidden] = useState(false);
  const last = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - last.current;
      if (y < 24) setHidden(false);
      else if (delta > 6) setHidden(true);
      else if (delta < -6) setHidden(false);
      last.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return hidden;
}

interface AddOption {
  to: string;
  icon: IconName;
  title: string;
  sub: string;
}

/**
 * Navigation: on phones a five-slot tab bar (Feed · Groups · add · Stats ·
 * Profile) with the add button as an ink disc in the centre; from 1024px a
 * left rail with the same four destinations and an "Add a game" button.
 * Both open the add sheet.
 */
export default function MobileTabBar() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const navigate = useNavigate();
  const { session } = useAuth();
  const hidden = useHideOnScroll();
  const isAnonymous = session?.user.is_anonymous === true;
  const go = (to: string) => {
    setSheetOpen(false);
    navigate(to);
  };

  const options: AddOption[] = [
    { to: '/add/scan', icon: 'camera', title: 'Scan a scoreboard', sub: 'Photograph the lane monitor, we read the frames' },
    { to: '/live/new', icon: 'bolt', title: 'Score live', sub: 'Frame by frame at the lane, friends can watch' },
    { to: '/add/quick', icon: 'pencil', title: 'Type the totals', sub: 'Just the final scores, no frames' },
    { to: '/add/manual', icon: 'stats', title: 'Enter the frames', sub: 'The full sheet, roll by roll' },
    ...(isAnonymous
      ? []
      : [{ to: '/matchday/new', icon: 'calendar' as IconName, title: 'Start a match day', sub: 'A session of games for the whole group' }]),
  ];

  return (
    <>
      {sheetOpen && (
        <Sheet onClose={() => setSheetOpen(false)} label="Add a game" title="Add a game">
          <Strip>
            {options.map((opt) => (
              <button
                key={opt.to}
                type="button"
                onClick={() => go(opt.to)}
                className="press flex w-full items-center gap-3.5 px-4 py-[15px] text-left"
              >
                <Icon name={opt.icon} className="size-6 shrink-0 text-ink" />
                <span className="flex min-w-0 flex-col gap-px">
                  <span className="text-[15px] font-semibold">{opt.title}</span>
                  <span className="text-[13px] text-ink-faded">{opt.sub}</span>
                </span>
              </button>
            ))}
          </Strip>
          <button
            type="button"
            onClick={() => setSheetOpen(false)}
            className="press mt-1 py-3.5 text-center text-[14px] font-semibold"
          >
            Cancel
          </button>
        </Sheet>
      )}

      {/* Phone: the tab bar. index.html sets viewport-fit=cover, so the inset
          keeps it off the iPhone home indicator. */}
      <nav
        aria-label="Main"
        className={`fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-paper pb-[env(safe-area-inset-bottom)] transition-transform duration-200 lg:hidden motion-reduce:transition-none ${
          hidden ? 'translate-y-full' : ''
        }`}
      >
        <div className="mx-auto grid w-full max-w-[390px] grid-cols-5 items-center px-2 pt-1.5">
          <Tab {...TABS[0]} />
          <Tab {...TABS[1]} />
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              aria-label="Add a game"
              className="press -mt-[18px] flex size-[52px] items-center justify-center rounded-full border-[3px] border-paper bg-ink text-paper"
            >
              <Icon name="plus" className="size-6" strokeWidth={2} />
            </button>
          </div>
          <Tab {...TABS[2]} />
          <Tab {...TABS[3]} />
        </div>
      </nav>

      {/* Tablet and up: the left rail. */}
      <nav
        aria-label="Main"
        className="fixed inset-y-0 left-0 z-30 hidden w-[220px] flex-col gap-1 border-r border-hairline bg-paper px-4 pb-6 pt-6 lg:flex"
      >
        <div className="px-3 pb-[18px]">
          <Wordmark size="sm" />
        </div>
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-r2 px-3 py-[11px] text-[14px] ${
                isActive ? 'bg-card font-semibold text-ink' : 'text-ink-faded'
              }`
            }
          >
            <Icon name={tab.icon} className="size-[22px]" />
            {tab.label}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="btn-primary mt-auto gap-2 px-0 py-3 text-[14px]"
        >
          <Icon name="plus" className="size-[18px]" strokeWidth={2} />
          Add a game
        </button>
      </nav>
    </>
  );
}
