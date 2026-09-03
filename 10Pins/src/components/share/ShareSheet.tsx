import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ShareCard, { type ShareCardData } from './ShareCard';
import Sheet from '../Sheet';
import { renderShareCard, shareFilename, shareImage } from '../../lib/shareCard';
import { shareCopy } from '../../lib/shareCopy';

/** The card's CSS size; the PNG is twice this. */
const CARD_W = 540;
const CARD_H = 675;

/**
 * Share sheet: renders the card, shows you the actual raster, then shares it.
 * Two reasons it works this way rather than sharing straight from a tap:
 *
 *  1. Safari loses the user activation across an await, so the PNG has to
 *     exist before the tap that calls `navigator.share`.
 *  2. You should see what you're about to send. If a font failed to load, the
 *     preview shows it; sharing blind would send the broken one.
 *
 * While the PNG is being built, the live card is shown scaled down in its
 * place so the sheet never opens onto a blank box.
 */
export default function ShareSheet({ data, onClose }: { data: ShareCardData; onClose: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameWidth, setFrameWidth] = useState(0);
  const [png, setPng] = useState<{ blob: Blob; url: string } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const copy = shareCopy(data);

  // The preview scales the card to the sheet's width with a transform, so the
  // frame's width is measured once it is laid out.
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => setFrameWidth(frame.clientWidth);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Render as soon as the card is mounted, and again if the first attempt
  // failed (a render that ran while the app was in the background can't
  // finish; coming back and tapping Try again does).
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
      .catch(() => !cancelled && setError("That didn't finish. Check your connection and try again."));
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

  /** Straight to the camera roll or downloads folder, skipping the OS share sheet. */
  function save() {
    if (!png || !copy) return;
    const link = document.createElement('a');
    link.href = png.url;
    link.download = shareFilename(copy.winner, copy.score);
    link.click();
    onClose();
  }

  const scale = frameWidth > 0 ? frameWidth / CARD_W : 0;
  const rendering = !png && !error;

  return (
    <Sheet onClose={onClose} label="Share this game" title="Share the card" className="gap-3">
      {/* Off-screen, but laid out and painted at full size: display:none or
          visibility:hidden both rasterise blank, and a scaled ancestor would
          shrink what the rasteriser sees. */}
      <div className="pointer-events-none fixed left-[-10000px] top-0" aria-hidden>
        <div ref={cardRef}>
          <ShareCard data={data} />
        </div>
      </div>

      <div ref={frameRef} className="strip-soft overflow-hidden">
        {png ? (
          <img src={png.url} alt="The card that will be shared" className="block w-full" />
        ) : (
          <div
            className="relative w-full"
            style={{ height: scale ? CARD_H * scale : undefined, aspectRatio: scale ? undefined : '4 / 5' }}
            role="status"
            aria-label="Building the card"
          >
            {scale > 0 && (
              <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${scale})` }}>
                <ShareCard data={data} />
              </div>
            )}
          </div>
        )}
      </div>

      {rendering && (
        <div className="flex flex-col gap-1.5">
          <span aria-hidden className="progress-line block" />
          <p className="text-[13px] text-ink-faded">Building the card</p>
        </div>
      )}
      {busy && <p className="text-[13px] text-ink-faded">Sharing</p>}
      {error && (
        <p className="text-[13px] text-red" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2 pt-1">
        {error ? (
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="btn-primary">
            Try again
          </button>
        ) : (
          <>
            <button type="button" onClick={send} disabled={!png || busy} className="btn-primary">
              Share
            </button>
            <button type="button" onClick={save} disabled={!png || busy} className="btn-secondary">
              Save image
            </button>
          </>
        )}
        <button type="button" onClick={onClose} className="press py-2 text-center text-[13px] text-ink-faded">
          Not now
        </button>
      </div>
    </Sheet>
  );
}
