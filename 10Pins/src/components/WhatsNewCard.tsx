import { Link } from 'react-router-dom';
import Icon from './Icon';
import Strip from './Strip';
import type { Release } from '../lib/changelog';

/**
 * "What's new" on the feed: the first thing you see after an update, once.
 *
 * Presentational on purpose: the caller owns the seen/unseen decision and the
 * storage write, so the gallery can render it from a fixture without touching
 * localStorage. A release note is information, so it sits in a plain strip.
 */
export default function WhatsNewCard({
  release,
  older = 0,
  onDismiss,
}: {
  release: Release;
  /** How many further unseen releases sit behind this one. */
  older?: number;
  onDismiss: () => void;
}) {
  return (
    <Strip as="section" className="sheet-up">
      <div className="flex items-baseline gap-2 px-3.5 py-2.5">
        <span className="num text-[15px] font-semibold">What's new</span>
        <span className="num text-[12px] text-ink-faded">v{release.version}</span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss what's new"
          className="press -my-1 -mr-1.5 ml-auto flex size-8 items-center justify-center self-center text-ink-faded"
        >
          <Icon name="x" className="size-[18px]" />
        </button>
      </div>
      <div className="flex flex-col gap-2 px-3.5 py-3">
        <h2 id="whats-new-title" className="text-[15px] font-semibold">
          {release.title}
        </h2>
        <ul className="flex flex-col gap-1.5">
          {release.items.slice(0, 3).map((item) => (
            <li key={item} className="text-[14px] leading-relaxed text-ink-faded">
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-center justify-between px-3.5 py-2.5">
        <Link to="/whats-new" className="press text-[13px] font-semibold text-blue">
          {release.items.length > 3 || older > 0 ? 'See everything that changed' : 'All releases'}
        </Link>
        {older > 0 && (
          <span className="text-[12px] text-ink-faded">
            {older === 1 ? '1 earlier release' : `${older} earlier releases`}
          </span>
        )}
      </div>
    </Strip>
  );
}
