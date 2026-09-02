import { useEffect, useRef, useState } from 'react';
import ShareCard, { type ShareCardData } from './ShareCard';
import { renderShareCard, shareFilename, shareImage } from '../../lib/shareCard';
import { shareCopy } from '../../lib/shareCopy';

/**
 * Share sheet: renders the card, shows you the **actual raster**, then shares
 * it. Two reasons it works this way rather than sharing straight from a tap:
 *
 *  1. Safari loses the user activation across an await, so the PNG has to
 *     exist before the tap that calls `navigator.share`.
 *  2. You should see what you’re about to send. If a font failed to load, the
 *     preview shows it — sharing blind would send the broken one.
 */
export default function ShareSheet({ data, onClose }: { data: ShareCardData; onClose: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [png, setPng] = useState<{ blob: Blob; url: string } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const copy = shareCopy(data);

  // Render as soon as the card is mounted, and again if the first attempt
  // failed (a render that ran while the app was in the background can’t
  // finish — coming back and tapping retry does).
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const node = cardRef.current;
    if (!node) return;
    setError('');
    renderShareCard(node)
      .then((blob) => {
        if (cancelled) return;
        setPng({ blob, url: URL.createObjectURL(blob) });
      })
      .catch(() => !cancelled && setError("That didn’t finish — tap to try again."));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => () => {
    if (png) URL.revokeObjectURL(png.url);
  }, [png]);

  async function send() {
    if (!png || !copy) return;
    setBusy(true);
    const outcome = await shareImage(png.blob, shareFilename(copy.winner, copy.score), copy.text);
    setBusy(false);
    if (outcome !== 'cancelled') onClose();
  }

  return (
    <div className="fade-in fixed inset-0 z-40 flex items-end bg-black/60" onClick={onClose}>
      {/* Off-screen, but laid out and painted — display:none or visibility:hidden
          both rasterise blank. */}
      <div className="pointer-events-none fixed left-[-10000px] top-0" aria-hidden>
        <div ref={cardRef}>
          <ShareCard data={data} />
        </div>
      </div>

      <div
        className="sheet-up mx-auto flex w-full max-w-[390px] flex-col gap-3 rounded-t-sheet border border-b-0 border-line bg-panel p-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] shadow-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label="Share this game"
      >
        <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-line" />

        <div className="overflow-hidden rounded-card border border-line bg-ink">
          {png ? (
            <img src={png.url} alt="The card that will be shared" className="w-full" />
          ) : (
            <div className="skeleton aspect-[4/5] w-full" role="status" aria-label="Building your card" />
          )}
        </div>

        <button
          type="button"
          onClick={error ? () => setAttempt((n) => n + 1) : send}
          disabled={!png && !error}
          className="press rounded-control bg-phosphor py-3.5 font-display text-[15px] font-bold text-ink shadow-glow-amber disabled:bg-disabled disabled:text-faint disabled:shadow-none"
        >
          {error ? 'Try again' : busy ? 'Sharing…' : png ? 'Share the card' : 'Building your card…'}
        </button>
        <button type="button" onClick={onClose} className="py-2 text-[13px] font-bold text-dim">
          Not now
        </button>
        {error && (
          <p className="text-center text-[13px] text-signal" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
