/**
 * Skeleton states: static card-toned blocks in the same strips the real
 * content uses, so nothing jumps when the data lands. No shimmer: motion is
 * functional only (DESIGN.md), and a loop while waiting is decoration.
 */

/** One card-toned bar. Width/height in px unless a % string is given. */
export function Bar({
  w = '100%',
  h = 12,
  className = '',
}: {
  w?: number | string;
  h?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`skeleton block ${className}`}
      style={{ width: typeof w === 'number' ? `${w}px` : w, height: `${h}px` }}
    />
  );
}

export function Circle({ size = 36 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="skeleton block shrink-0 rounded-full"
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
}

/** The strip every box on the app uses. */
export function Panel({
  children,
  className = '',
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return <div className={`strip p-3.5 ${className}`}>{children}</div>;
}

/**
 * Wrapper for a whole loading screen: announces itself once to a screen reader
 * and hides the furniture from it.
 */
export function SkeletonScreen({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Shown instead of a skeleton when content is already on screen and refetching. */
export function RefetchLine({ active }: { active: boolean }) {
  if (!active) return null;
  return <span aria-hidden className="progress-line block" />;
}

/** A strip-shaped skeleton: header row + ten frame boxes. */
function StripSkeleton({ header = true }: { header?: boolean }) {
  return (
    <div className="strip">
      {header && (
        <div className="flex items-center justify-between px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Bar w={64} h={14} />
            <Bar w={96} h={10} />
          </div>
          <Bar w={40} h={20} />
        </div>
      )}
      <div className="grid grid-cols-10 border-t border-hairline">
        {Array.from({ length: 10 }).map((_, f) => (
          <div key={f} className={`h-[44px] ${f < 9 ? 'border-r border-hairline' : ''}`} />
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- screens -- */

/** Home feed: strips with a footer line. */
export function FeedSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <SkeletonScreen label="Loading the feed" className="flex flex-col gap-4">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <StripSkeleton />
          <div className="flex gap-3.5 px-0.5">
            <Bar w={72} h={11} />
            <Bar w={56} h={11} />
          </div>
        </div>
      ))}
    </SkeletonScreen>
  );
}

/** Stats: three tiles, the graph strip, recent games. */
export function StatsSkeleton() {
  return (
    <SkeletonScreen label="Loading your stats" className="flex flex-col gap-3.5">
      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="strip flex flex-col gap-1.5 px-3 pb-2.5 pt-3">
            <Bar w={52} h={26} />
            <Bar w={72} h={10} />
          </div>
        ))}
      </div>
      <Panel className="flex flex-col gap-3">
        <Bar w={110} h={12} />
        <Bar h={120} />
      </Panel>
      <div className="strip">
        <div className="px-3.5 py-2.5">
          <Bar w={88} h={12} />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between border-t border-hairline px-3.5 py-3">
            <Bar w={150 - i * 12} h={12} />
            <Bar w={32} h={16} />
          </div>
        ))}
      </div>
    </SkeletonScreen>
  );
}

/** Leaderboard rows on their own, for composing inside a bigger skeleton. */
function LeaderboardRows({ rows }: { rows: number }) {
  return (
    <div className="strip">
      <div className="flex justify-between px-3.5 py-2.5">
        <Bar w={20} h={10} />
        <Bar w={120} h={10} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-t border-hairline px-3.5 py-3.5">
          <Bar w={14} h={14} />
          <Bar w={`${40 - i * 4}%`} h={13} />
          <div className="ml-auto flex items-center gap-4">
            <Bar w={22} h={12} />
            <Bar w={30} h={15} />
            <Bar w={26} h={12} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Group leaderboard: the table strip. `bare` drops the live region so it can
 * nest inside another SkeletonScreen.
 */
export function LeaderboardSkeleton({ rows = 5, bare = false }: { rows?: number; bare?: boolean }) {
  if (bare) return <LeaderboardRows rows={rows} />;
  return (
    <SkeletonScreen label="Loading the leaderboard">
      <LeaderboardRows rows={rows} />
    </SkeletonScreen>
  );
}

/**
 * Generic person/notification/game rows inside one strip. `bare` drops the
 * live region for nesting inside another SkeletonScreen.
 */
export function ListSkeleton({
  rows = 4,
  label,
  avatar = true,
  trailing = true,
  bare = false,
}: {
  rows?: number;
  label: string;
  avatar?: boolean;
  trailing?: boolean;
  bare?: boolean;
}) {
  const body = (
    <div className="strip">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`flex items-center gap-3 px-3.5 py-3.5 ${i > 0 ? 'border-t border-hairline' : ''}`}>
          {avatar && <Circle size={34} />}
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Bar w={`${70 - i * 6}%`} h={13} />
            <Bar w={`${42 - i * 4}%`} h={10} />
          </div>
          {trailing && <Bar w={54} h={22} />}
        </div>
      ))}
    </div>
  );

  if (bare) return body;
  return <SkeletonScreen label={label}>{body}</SkeletonScreen>;
}

/** A scorecard: one strip per player. */
export function ScorecardSkeleton({
  players = 2,
  label = 'Loading the game',
}: {
  players?: number;
  label?: string;
}) {
  return (
    <SkeletonScreen label={label} className="flex flex-col gap-2">
      {Array.from({ length: players }).map((_, p) => (
        <StripSkeleton key={p} />
      ))}
    </SkeletonScreen>
  );
}

/** The pre-join preview (/join/:code, /live/join/:code). */
export function PreviewSkeleton({ label }: { label: string }) {
  return (
    <SkeletonScreen label={label} className="flex flex-col gap-4">
      <Panel className="flex flex-col items-center gap-3 py-8">
        <Circle size={56} />
        <Bar w={148} h={18} />
        <Bar w={104} h={11} />
        <div className="flex gap-2 pt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Circle key={i} size={28} />
          ))}
        </div>
      </Panel>
      <Bar h={48} />
    </SkeletonScreen>
  );
}

/** Form-shaped screens (entry flows, settings): label + field pairs. */
export function FormSkeleton({ fields = 3, label }: { fields?: number; label: string }) {
  return (
    <SkeletonScreen label={label} className="flex flex-col gap-5">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Bar w={78} h={12} />
          <Bar h={44} />
        </div>
      ))}
      <Bar h={48} />
    </SkeletonScreen>
  );
}

/**
 * Player page: avatar + name header, the head-to-head strip (two big
 * numerals, a two-cell stat row), then recent meetings.
 */
export function PlayerSkeleton() {
  return (
    <SkeletonScreen label="Loading their profile" className="flex flex-col gap-3.5">
      <div className="flex items-center gap-3">
        <Circle size={44} />
        <div className="flex flex-col gap-2">
          <Bar w={120} h={18} />
          <Bar w={160} h={11} />
        </div>
      </div>
      <div className="strip">
        <div className="px-3.5 py-2.5">
          <Bar w={140} h={12} />
        </div>
        <div className="flex items-center justify-around border-t border-hairline px-3.5 py-4">
          <Bar w={36} h={44} />
          <Bar w={30} h={11} />
          <Bar w={36} h={44} />
        </div>
        <div className="grid grid-cols-2 border-t border-hairline">
          <div className="flex flex-col gap-1.5 border-r border-hairline px-3.5 py-2.5">
            <Bar w={72} h={18} />
            <Bar w={90} h={10} />
          </div>
          <div className="flex flex-col gap-1.5 px-3.5 py-2.5">
            <Bar w={72} h={18} />
            <Bar w={70} h={10} />
          </div>
        </div>
      </div>
      <ListSkeleton rows={2} label="" avatar={false} bare />
    </SkeletonScreen>
  );
}

/** Live scorer / spectator: the at-the-line strip over the sheet. */
export function LaneSkeleton({ label = 'Loading the lane' }: { label?: string }) {
  return (
    <SkeletonScreen label={label} className="flex flex-col gap-2">
      <StripSkeleton />
      <StripSkeleton />
    </SkeletonScreen>
  );
}
