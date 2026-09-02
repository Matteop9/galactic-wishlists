import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import {
  APP_VERSION,
  RELEASES,
  formatReleaseDate,
  markSeen,
  type Release,
} from '../../lib/changelog';

/** localStorage can throw in private mode — never let that crash the page. */
function localStorageOrNull(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/**
 * The full release history. Reaching this page counts as reading the notes,
 * so it marks the current version seen and the feed card stops appearing —
 * the same write the card’s dismiss does.
 */
export default function WhatsNew() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    markSeen(localStorageOrNull());
  }, []);

  // `key === 'default'` means this was the first entry in the history stack
  // (a deep link, or a fresh PWA launch) — there is nothing to go back to.
  const goBack = () => {
    if (location.key === 'default') navigate('/');
    else navigate(-1);
  };

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <header className="flex items-center gap-3">
        <button type="button" onClick={goBack} aria-label="Back" className="press text-dim">
          <Icon name="chevron-left" className="size-6" />
        </button>
        <h1 className="font-display text-[20px] font-bold">What’s new</h1>
        <span className="score-text ml-auto text-[12px] text-faint">v{APP_VERSION}</span>
      </header>

      <div className="flex flex-col gap-3">
        {RELEASES.map((release, i) => (
          <div
            key={release.version}
            className="rise-in"
            style={{ animationDelay: `${Math.min(i, 5) * 40}ms` }}
          >
            <ReleaseNote release={release} current={i === 0} />
          </div>
        ))}
      </div>

      <p className="text-[11.5px] leading-relaxed text-faint">
        Every release is listed here. The technical write-up for each one lives in the repo’s
        changelog.
      </p>
    </div>
  );
}

function ReleaseNote({ release, current }: { release: Release; current: boolean }) {
  return (
    <article className="flex flex-col gap-2.5 rounded-card border border-line bg-panel p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="label-caps">
          v{release.version}
          {current ? ' · you are here' : ''}
        </p>
        <span className="text-[11.5px] text-faint">{formatReleaseDate(release.date)}</span>
      </div>

      <h2 className="font-display text-[15px] font-bold text-text">{release.title}</h2>

      <ul className="flex flex-col gap-1.5">
        {release.items.map((item) => (
          <li key={item} className="flex gap-2 text-[13px] leading-relaxed text-dim">
            <span aria-hidden className="mt-[7px] size-1 shrink-0 rounded-full bg-faint" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
