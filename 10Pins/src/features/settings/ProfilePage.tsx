import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Icon from '../../components/Icon';
import Avatar from '../../components/Avatar';
import Strip from '../../components/Strip';
import ChipRow from '../../components/ChipRow';
import FeedbackSection from './FeedbackSection';
import ScanQueueSection from './ScanQueueSection';
import type { Profile } from '../../lib/auth';
import { APP_VERSION } from '../../lib/changelog';
import { THEME_OPTIONS, useTheme, type ThemePreference } from '../../lib/theme';

const ROW = 'press flex w-full items-center justify-between px-4 py-3.5 text-left text-[15px]';
const ROW_RIGHT = 'flex items-center gap-2 text-[14px] text-ink-faded';

export default function ProfilePage({ profile }: { profile: Profile }) {
  const [theme, setTheme] = useTheme();
  const [themeOpen, setThemeOpen] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);

  const since = profile.created_at ? new Date(profile.created_at).getFullYear() : null;
  const themeLabel = THEME_OPTIONS.find((o) => o.value === theme)?.label ?? 'System';

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <header className="flex items-center gap-3.5 px-1 py-2">
        <Avatar name={profile.display_name} url={profile.avatar_url} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="num truncate text-[22px] font-semibold leading-tight">{profile.display_name}</h1>
          <p className="truncate text-[14px] text-ink-faded">
            @{profile.username}
            {since !== null && (
              <>
                {' · bowling since '}
                <span className="num">{since}</span>
              </>
            )}
          </p>
        </div>
      </header>

      <Strip>
        <Link to="/friends" className={ROW}>
          <span className="font-semibold">Friends</span>
          <span className={ROW_RIGHT}>
            <Icon name="chevron-right" className="size-[18px]" />
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setThemeOpen((open) => !open)}
          aria-expanded={themeOpen}
          aria-controls="theme-picker"
          className={ROW}
        >
          <span className="font-semibold">Theme</span>
          <span className={ROW_RIGHT}>
            {themeLabel}
            <Icon name={themeOpen ? 'chevron-down' : 'chevron-right'} className="size-[18px]" />
          </span>
        </button>
        {themeOpen && (
          <div id="theme-picker" className="flex flex-col gap-2 px-4 py-3.5">
            <ChipRow
              fill
              label="Theme"
              options={THEME_OPTIONS}
              value={theme}
              onChange={(v) => setTheme(v as ThemePreference)}
            />
            <p className="text-[13px] text-ink-faded">System follows your device setting.</p>
          </div>
        )}

        {/* The feed card is dismissible and shows once. This is the way back
            to the notes, and the only place the running version is stated. */}
        <Link to="/whats-new" className={ROW}>
          <span className="font-semibold">What’s new</span>
          <span className={ROW_RIGHT}>
            <span className="num">v{APP_VERSION}</span>
            <Icon name="chevron-right" className="size-[18px]" />
          </span>
        </Link>

        <button
          type="button"
          onClick={() => feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className={ROW}
        >
          <span className="font-semibold">Feedback</span>
          <span className={ROW_RIGHT}>
            <Icon name="chevron-down" className="size-[18px]" />
          </span>
        </button>
      </Strip>

      <ScanQueueSection profile={profile} />

      <div ref={feedbackRef} className="scroll-mt-4">
        <FeedbackSection profile={profile} />
      </div>

      <Strip soft>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="press flex w-full items-center justify-between px-4 py-3.5 text-left text-[15px] font-semibold text-red"
        >
          Sign out
        </button>
      </Strip>
    </div>
  );
}
