import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * The "there is a new version" toast (r2, ink fill).
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
    <div
      role="status"
      className="sheet-up fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+88px)] z-40 mx-auto flex w-auto max-w-[358px] items-center gap-3 rounded-r2 bg-ink px-4 py-3 text-paper lg:bottom-6 lg:left-[236px]"
    >
      <p className="min-w-0 flex-1 text-[14px]">A newer 10 Pins is ready.</p>
      <button
        type="button"
        onClick={() => updateServiceWorker(true)}
        className="press shrink-0 rounded-r2 bg-paper px-3 py-1.5 text-[13px] font-semibold text-ink"
      >
        Update
      </button>
      <button type="button" onClick={() => setNeedRefresh(false)} className="press shrink-0 text-[13px] text-card">
        Later
      </button>
    </div>
  );
}
