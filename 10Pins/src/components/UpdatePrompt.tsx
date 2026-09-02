import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * The "there’s a new version" prompt.
 *
 * Deliberately a prompt rather than an automatic reload: 10 Pins is used at
 * the lane with a game in progress, and the live scorer keeps its undo history
 * in memory. An update that reloaded the page on its own would throw that away
 * mid-frame. So the app asks, and waits.
 */
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="sheet-up fixed inset-x-0 bottom-[94px] z-40 mx-auto flex w-full max-w-[390px] items-center gap-3 rounded-card border border-line bg-panel px-4 py-3 shadow-sheet">
      <p className="min-w-0 flex-1 text-[13px] text-text">
        There’s a newer 10 Pins ready.
      </p>
      <button
        type="button"
        onClick={() => updateServiceWorker(true)}
        className="press shrink-0 rounded-chip bg-phosphor px-3 py-1.5 font-display text-[12.5px] font-bold text-ink"
      >
        Update
      </button>
      <button
        type="button"
        onClick={() => setNeedRefresh(false)}
        className="shrink-0 text-[12.5px] text-dim"
      >
        Later
      </button>
    </div>
  );
}
