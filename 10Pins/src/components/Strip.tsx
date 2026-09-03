import type { ReactNode } from 'react';

/**
 * The scoresheet strip, the one box the whole app is built from (DESIGN.md
 * "The frame-grid primitive"): 1.5px ink border, sheet fill, radius 0,
 * hairline rules inside. Feed posts, leaderboards, stat tiles, settings
 * lists, empty states and forms all sit in one of these.
 *
 * Rows are separated by hairlines via `divide-y`, so a Strip's direct children
 * should be the rows themselves (StripHeader, StripRow, a grid, a form).
 */
export default function Strip({
  children,
  className = '',
  soft = false,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  /** rule-weight border instead of ink: empty states and quiet asides */
  soft?: boolean;
  as?: 'div' | 'section' | 'form' | 'ul';
}) {
  return (
    <Tag className={`${soft ? 'strip-soft' : 'strip'} flex flex-col divide-y divide-hairline ${className}`}>
      {children}
    </Tag>
  );
}

/**
 * The header row: name (Oswald 600), meta (faded), total right-aligned
 * (Oswald 600, large). `tone` colours the total: red is hot (a high game),
 * blue is steady (an average). Everything else is ink.
 */
export function StripHeader({
  title,
  meta,
  right,
  tone,
  size = 'md',
  className = '',
}: {
  title: ReactNode;
  meta?: ReactNode;
  right?: ReactNode;
  tone?: 'hot' | 'steady' | 'faded' | null;
  /** md = feed card (24px total), lg = detail (30px total) */
  size?: 'md' | 'lg';
  className?: string;
}) {
  const totalColour =
    tone === 'hot' ? 'text-red' : tone === 'steady' ? 'text-blue' : tone === 'faded' ? 'text-ink-faded' : 'text-ink';
  return (
    <div className={`flex items-baseline gap-2 px-3 ${size === 'lg' ? 'py-2.5' : 'py-[9px]'} ${className}`}>
      <span className="num shrink-0 truncate text-[15px] font-semibold">{title}</span>
      {meta && <span className="min-w-0 truncate text-[12px] text-ink-faded">{meta}</span>}
      {right !== undefined && (
        <span
          className={`num ml-auto shrink-0 font-semibold leading-none ${
            size === 'lg' ? 'text-[30px]' : 'text-[24px]'
          } ${totalColour}`}
        >
          {right}
        </span>
      )}
    </div>
  );
}

/** A plain row inside a strip: left content, right content, baseline-aligned. */
export function StripRow({
  children,
  right,
  className = '',
  onClick,
  to,
}: {
  children: ReactNode;
  right?: ReactNode;
  className?: string;
  onClick?: () => void;
  /** rendered as an anchor-like button row when set (use PlayerLink/Link for real routes) */
  to?: never;
}) {
  const base = `flex items-center justify-between gap-3 px-3.5 py-[11px] text-[14px] ${className}`;
  void to;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`press w-full text-left ${base}`}>
        <span className="min-w-0 flex-1">{children}</span>
        {right !== undefined && <span className="shrink-0">{right}</span>}
      </button>
    );
  }
  return (
    <div className={base}>
      <span className="min-w-0 flex-1">{children}</span>
      {right !== undefined && <span className="shrink-0">{right}</span>}
    </div>
  );
}

/** A small section title inside a strip (13px semibold). */
export function StripTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between px-3.5 py-2.5">
      <span className="label">{children}</span>
      {right && <span className="text-[12px] text-ink-faded">{right}</span>}
    </div>
  );
}

/**
 * A stat tile: boxed numeral (r0, 1.5px border) with a caption under it.
 * `tone` follows the colour rule: hot = red, steady = blue.
 */
export function StatTile({
  value,
  label,
  tone,
  soft = false,
  size = 'md',
}: {
  value: ReactNode;
  label: string;
  tone?: 'hot' | 'steady' | 'faded' | null;
  soft?: boolean;
  /** md = 30px numeral (stats page), sm = 20-22px (inside a strip grid) */
  size?: 'md' | 'sm';
}) {
  const colour =
    tone === 'hot' ? 'text-red' : tone === 'steady' ? 'text-blue' : tone === 'faded' ? 'text-ink-faded' : 'text-ink';
  return (
    <div className={`${soft ? 'strip-soft' : 'strip'} flex flex-col gap-0.5 px-3 pb-2.5 pt-3`}>
      <span className={`num font-semibold leading-none ${size === 'md' ? 'text-[30px]' : 'text-[22px]'} ${colour}`}>
        {value}
      </span>
      <span className="text-[12px] text-ink-faded">{label}</span>
    </div>
  );
}

/**
 * A cell in a stat grid inside a strip (no own border; the grid draws
 * hairlines between cells). Numeral 20px.
 */
export function StatCell({
  value,
  label,
  tone,
}: {
  value: ReactNode;
  label: string;
  tone?: 'hot' | 'steady' | 'faded' | null;
}) {
  const colour =
    tone === 'hot' ? 'text-red' : tone === 'steady' ? 'text-blue' : tone === 'faded' ? 'text-ink-faded' : 'text-ink';
  return (
    <div className="flex flex-col px-3.5 py-2.5">
      <span className={`num text-[20px] font-semibold leading-tight ${colour}`}>{value}</span>
      <span className="text-[12px] text-ink-faded">{label}</span>
    </div>
  );
}

/**
 * Ten empty frames with dashes, for empty states: the same box a game would
 * fill, so the emptiness reads as "no games yet" rather than a missing card.
 */
export function EmptyFrames({ rows = 1 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid grid-cols-10">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className={`flex flex-col ${i < 9 ? 'border-r border-hairline' : ''}`}>
              <div className="flex justify-end border-b border-hairline">
                <span className="h-[18px] w-[15px]" />
                <span className="h-[18px] w-[15px] border-l border-hairline" />
              </div>
              <span className="num py-[5px] text-center text-[14px] leading-none text-ink-faded">–</span>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
