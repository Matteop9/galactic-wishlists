import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Strip, { EmptyFrames } from './Strip';

/**
 * Empty states are the same box a game would fill, with dashes in the frames
 * and the actions inside it. Never a floating headline (DESIGN.md).
 *
 * Three tones: a screen with nothing on it gets `page` (a full strip with a
 * faded header, ten dashed frames and the actions in a footer row), a section
 * inside a busy screen gets `inline` (a soft strip, one dashed row, the copy
 * and actions inside), and a one-line aside stays `quiet`.
 */
export type EmptyTone = 'page' | 'inline' | 'quiet';

export type EmptyAction =
  | { label: string; to: string; onPress?: never }
  | { label: string; onPress: () => void; to?: never };

export default function EmptyState({
  title,
  body,
  action,
  secondary,
  tone = 'page',
  children,
}: {
  title?: string;
  body: ReactNode;
  action?: EmptyAction;
  secondary?: EmptyAction;
  tone?: EmptyTone;
  children?: ReactNode;
}) {
  if (tone === 'quiet') {
    return <p className="text-[13px] text-ink-faded">{body}</p>;
  }

  if (tone === 'inline') {
    return (
      <Strip soft>
        <EmptyFrames />
        <div className="flex flex-col gap-3 p-3.5">
          {title && <p className="label">{title}</p>}
          <p className="text-[13px] text-ink-faded">{body}</p>
          {children}
          {(action || secondary) && (
            <div className="flex flex-wrap gap-2">
              {action && <ActionButton action={action} primary small />}
              {secondary && <ActionButton action={secondary} small />}
            </div>
          )}
        </div>
      </Strip>
    );
  }

  return (
    <div className="flex flex-col gap-3 py-6">
      <Strip>
        <div className="flex items-baseline gap-2.5 px-3.5 py-2.5">
          <span className="num text-[15px] font-semibold text-ink-faded">{title ?? 'No games yet'}</span>
          <span className="num ml-auto text-[22px] font-semibold leading-none text-ink-faded">···</span>
        </div>
        <EmptyFrames />
        {children && <div className="p-3.5">{children}</div>}
        {(action || secondary) && (
          <div className="flex gap-2.5 p-3.5">
            {action && <ActionButton action={action} primary />}
            {secondary && <ActionButton action={secondary} />}
          </div>
        )}
      </Strip>
      <p className="text-center text-[13px] text-ink-faded">{body}</p>
    </div>
  );
}

function ActionButton({
  action,
  primary = false,
  small = false,
}: {
  action: EmptyAction;
  primary?: boolean;
  small?: boolean;
}) {
  const className = small
    ? primary
      ? 'btn-primary-sm'
      : 'btn-secondary-sm'
    : primary
      ? 'btn-primary flex-1 px-2 py-3 text-[14px]'
      : 'btn-secondary flex-1 px-2 py-3 text-[14px]';

  return action.to ? (
    <Link to={action.to} className={className}>
      {action.label}
    </Link>
  ) : (
    <button type="button" onClick={action.onPress} className={className}>
      {action.label}
    </button>
  );
}
