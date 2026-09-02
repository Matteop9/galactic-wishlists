/**
 * Rasterising and sharing the card (spec §10: "render the branded 1080×1350
 * card client-side from the game data + design tokens; share via Web Share API
 * with file fallback to download").
 *
 * `html-to-image` is imported dynamically, so ~40KB of rasteriser only loads
 * for someone who actually taps Share — it never touches the initial bundle.
 * The alternative, hand-drawing the scorecard grid on a canvas, would fork the
 * one component every other screen renders, and the fork would drift.
 */

/** The four faces the card draws in. */
const CARD_FONTS = [
  '800 56px Oxanium',
  '800 17px Oxanium',
  '700 64px "Martian Mono"',
  '600 13px "Martian Mono"',
  '400 14px "Atkinson Hyperlegible"',
];

/**
 * `document.fonts.ready` is NOT enough: it only resolves for faces already
 * requested, and the card uses weights and sizes that may never have been
 * painted on screen. Without this the first card of a session silently
 * renders in a fallback face.
 */
async function ensureFonts(): Promise<void> {
  if (!document.fonts) return;
  await Promise.all(
    CARD_FONTS.map((font) => document.fonts.load(font).catch(() => undefined)),
  );
  await document.fonts.ready;
}

/** Inlining three font families is expensive; do it once per session — but only cache a success. */
let fontEmbedCache: Promise<string> | null = null;

/**
 * html-to-image waits on `requestAnimationFrame` and `img.decode()`, and
 * neither fires while a page isn’t painting — so if you tap Share and switch
 * apps, the render hangs forever with no error. Fail loudly instead: the sheet
 * can then offer a retry, which works the moment you come back.
 */
const RENDER_TIMEOUT_MS = 20_000;

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    work,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('render timed out')), ms),
    ),
  ]);
}

/**
 * Render a card node to a 1080×1350 PNG.
 *
 * Rendered twice on purpose: WebKit’s first `foreignObject` rasterisation of a
 * node comes back blank or half-painted, a long-standing Safari bug. The
 * second pass is the one that’s correct, and at ~1.5M pixels it costs little.
 */
export async function renderShareCard(node: HTMLElement): Promise<Blob> {
  const { toBlob, getFontEmbedCSS } = await import('html-to-image');
  await ensureFonts();

  if (!fontEmbedCache) {
    fontEmbedCache = getFontEmbedCSS(node).catch((err: unknown) => {
      fontEmbedCache = null; // a failure is retried on the next card, not remembered
      throw err;
    });
  }
  const fontEmbedCSS = await fontEmbedCache.catch(() => '');

  const options = {
    pixelRatio: 2, // 540×675 CSS px → 1080×1350
    backgroundColor: '#0A0E14',
    fontEmbedCSS,
    cacheBust: true,
  };

  await withTimeout(toBlob(node, options), RENDER_TIMEOUT_MS); // discarded: see the Safari note
  const blob = await withTimeout(toBlob(node, options), RENDER_TIMEOUT_MS);
  if (!blob) throw new Error("Couldn’t render the card");
  return blob;
}

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled';

/**
 * Hand the image to the OS share sheet, or save it.
 *
 * ⚠️ Safari drops the transient user activation across an `await`, so the
 * caller must render the blob BEFORE the tap that calls this — which is why
 * the share sheet renders on open and shares a cached blob.
 *
 * Note `files` is passed without `url`: iOS sometimes shares only the URL and
 * silently drops the image when both are present.
 */
export async function shareImage(blob: Blob, filename: string, text: string): Promise<ShareOutcome> {
  const file = new File([blob], filename, { type: 'image/png' });

  // Feature-test canShare, not share: `share` existing doesn’t imply files.
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return 'shared';
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return 'cancelled';
      // fall through to the download
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}

/** `10-pins-dave-k-213.png` — recognisable in a camera roll. */
export function shareFilename(winner: string, score: number): string {
  const slug = winner.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `10-pins-${slug || 'game'}-${score}.png`;
}
