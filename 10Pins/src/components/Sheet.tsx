import { useEffect, type ReactNode } from 'react';

/**
 * The bottom sheet: r3 top corners, a grab handle, paper fill, rising on the
 * base curve over a scrim. Tap the scrim or press Escape to close.
 */
export default function Sheet({
  onClose,
  label,
  title,
  children,
  className = '',
}: {
  onClose: () => void;
  /** accessible name for the dialog */
  label: string;
  /** optional visible title (Oswald 600 18px) */
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fade-in fixed inset-0 z-40 bg-scrim" onClick={onClose} aria-hidden>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
        className={`sheet-up absolute inset-x-0 bottom-0 mx-auto flex w-full max-w-[390px] flex-col rounded-t-r3 bg-paper px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2 ${className}`}
      >
        <div className="flex justify-center pb-2.5 pt-1">
          <span className="h-1 w-10 rounded-full bg-rule" aria-hidden />
        </div>
        {title && <h2 className="num px-1 pb-2.5 text-[18px] font-semibold">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
