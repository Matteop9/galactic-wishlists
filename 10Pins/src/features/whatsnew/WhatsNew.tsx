import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import Strip from '../../components/Strip';
import { APP_VERSION, RELEASES, markSeen, type Release } from '../../lib/changelog';

/** localStorage can throw in private mode, so never let that crash the page. */
function localStorageOrNull(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** "Tue 2 Sep 2026": the date a release went live, read as a date. */
function releaseDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * The full release history. Reaching this page counts as reading the notes,
 * so it marks the current version seen and the feed card stops appearing,
 * the same write the card's dismiss does.
 */
export default function WhatsNew() {
  const location = useLocation();

  useEffect(() => {
    markSeen(localStorageOrNull());
  }, []);

  // `key === 'default'` means this was the first entry in the history stack
  // (a deep link, or a fresh PWA launch), so there is nothing to go back to.
  const back = location.key === 'default' ? '/' : true;

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      <PageHeader back={back} title="What's new" sub={<span className="num">v{APP_VERSION}</span>} />

      <div className="flex flex-col gap-3">
        {RELEASES.map((release, i) => (
          <div key={release.version} className="rise-in" style={{ animationDelay: `${Math.min(i, 5) * 40}ms` }}>
            <ReleaseNote release={release} current={i === 0} />
          </div>
        ))}
      </div>

      <p className="text-[12px] leading-relaxed text-ink-faded">
        Every release is listed here. The technical write-up for each one lives in the repo's changelog.
      </p>
    </div>
  );
}

/** One release: a strip with the title row, then each change as its own ruled line. */
function ReleaseNote({ release, current }: { release: Release; current: boolean }) {
  return (
    <Strip as="section">
      <div className="flex items-baseline gap-2 px-3.5 py-2.5">
        <h2 className="num min-w-0 truncate text-[15px] font-semibold">{release.title}</h2>
        <span className="num shrink-0 text-[12px] text-ink-faded">{releaseDate(release.date)}</span>
        <span className="num ml-auto shrink-0 text-[12px] text-ink-faded">
          v{release.version}
          {current ? ', this version' : ''}
        </span>
      </div>
      {release.items.map((item) => (
        <p key={item} className="px-3.5 py-2.5 text-[14px] leading-relaxed">
          {item}
        </p>
      ))}
    </Strip>
  );
}
