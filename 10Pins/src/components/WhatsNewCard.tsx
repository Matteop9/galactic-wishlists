import { Link } from 'react-router-dom';
import Icon from './Icon';
import type { Release } from '../lib/changelog';

/**
 * "What’s new" on the feed — the first thing you see after an update, once.
 *
 * Presentational on purpose: the caller owns the seen/unseen decision and the
 * storage write, so the gallery can render it from a fixture without touching
 * localStorage. Amber budget (index.css): no glow here — the release note is
 * information, not a celebration, so it gets the plain panel treatment and a
 * single amber text link.
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
    <section
      aria-labelledby="whats-new-title"
      className="sheet-up flex flex-col gap-2.5 rounded-card border border-line bg-panel p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label-caps">What’s new · v{release.version}</p>
          <h2 id="whats-new-title" className="mt-1 font-display text-[15px] font-bold text-text">
            {release.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss what’s new"
          className="press -mr-1 -mt-1 shrink-0 p-1 text-faint"
        >
          <Icon name="x" className="size-4" />
        </button>
      </div>

      <ul className="flex flex-col gap-1.5">
        {release.items.slice(0, 3).map((item) => (
          <li key={item} className="flex gap-2 text-[13px] leading-relaxed text-dim">
            <span aria-hidden className="mt-[7px] size-1 shrink-0 rounded-full bg-faint" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between">
        <Link to="/whats-new" className="press text-[12.5px] font-bold text-phosphor">
          {release.items.length > 3 || older > 0 ? 'See everything that changed' : 'All releases'}
        </Link>
        {older > 0 && (
          <span className="text-[11.5px] text-faint">
            {older === 1 ? '1 earlier release' : `${older} earlier releases`}
          </span>
        )}
      </div>
    </section>
  );
}
