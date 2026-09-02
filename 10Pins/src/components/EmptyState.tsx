import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * One shape for "there’s nothing here yet".
 *
 * Three tones rather than one, because the app has three registers and
 * flattening them would make quiet corners shout: a screen with nothing on it
 * gets a `page` state, a section inside a busy screen gets `inline`, and a
 * one-line aside (no comments yet, queue is empty) stays `quiet`.
 *
 * Where there’s an obvious next move, an empty state should offer the control
 * rather than describe it — telling someone to "tap ＋" without giving them
 * anything to press is a sign, not a door.
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
    return <p className="text-[12px] text-faint">{body}</p>;
  }

  const wrapper =
    tone === 'page'
      ? 'flex flex-col items-center gap-3 px-4 py-20 text-center'
      : 'flex flex-col items-center gap-2.5 rounded-2xl border border-dashed border-line bg-well/50 px-4 py-6 text-center';

  return (
    <div className={wrapper}>
      {title && (
        <p className={tone === 'page' ? 'font-display text-[20px] font-bold' : 'font-display text-[15px] font-bold'}>
          {title}
        </p>
      )}
      <p className="max-w-[260px] text-[13.5px] leading-relaxed text-dim">{body}</p>
      {children}
      {action && <ActionButton action={action} primary />}
      {secondary && <ActionButton action={secondary} />}
    </div>
  );
}

function ActionButton({ action, primary = false }: { action: EmptyAction; primary?: boolean }) {
  const className = primary
    ? 'press mt-1 rounded-[10px] bg-phosphor px-5 py-2.5 font-display text-[14px] font-bold text-ink shadow-glow-amber'
    : 'press rounded-[10px] px-5 py-2 text-[13px] font-bold text-dim';

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
