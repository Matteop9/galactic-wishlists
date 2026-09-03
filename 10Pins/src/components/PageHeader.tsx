import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';

/**
 * The screen header. Top-level screens (Groups, Your stats) get a 24px Oswald
 * title and an optional right action; sub-screens get a back chevron and an
 * 18–22px title with an optional line under it.
 */
export default function PageHeader({
  title,
  sub,
  back,
  right,
  size,
}: {
  title: ReactNode;
  sub?: ReactNode;
  /** show the back chevron; a string navigates there, `true` goes back */
  back?: boolean | string;
  right?: ReactNode;
  /** defaults: lg without back, md with back */
  size?: 'lg' | 'md';
}) {
  const navigate = useNavigate();
  const resolved = size ?? (back ? 'md' : 'lg');
  return (
    <header className="flex items-center gap-3">
      {back && (
        <button
          type="button"
          onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
          aria-label="Back"
          className="press -ml-1.5 flex size-9 shrink-0 items-center justify-center text-ink"
        >
          <Icon name="chevron-left" className="size-[22px]" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className={`num truncate font-semibold leading-tight ${resolved === 'lg' ? 'text-[24px]' : 'text-[22px]'}`}>
          {title}
        </h1>
        {sub && <p className="truncate text-[13px] text-ink-faded">{sub}</p>}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </header>
  );
}
