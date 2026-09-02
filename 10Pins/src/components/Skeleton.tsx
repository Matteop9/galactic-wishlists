/**
 * Skeleton states (spec §8: feed, stats and leaderboards get them; capture gets
 * its own sweep). Two rules hold everywhere in here:
 *
 * 1. Never amber — amber is earned (§12). Skeletons are well/hairline greys
 *    with the faint glass sweep defined in index.css.
 * 2. Mirror the real layout box-for-box — same rounding, padding, heights and
 *    mono score widths — so nothing jumps when the data lands.
 */

/** One grey bar. Width/height in px unless a % string is given. */
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

/** The bordered panel every card on the app uses. */
export function Panel({
  children,
  className = '',
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-line bg-panel p-4 ${className}`}>{children}</div>
  );
}

/**
 * Wrapper for a whole loading screen: announces itself once to a screen reader
 * and hides the grey furniture from it.
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
  return <span aria-hidden className="refetch-line block" />;
}

/* ---------------------------------------------------------------- screens -- */

/** Home feed: date row, player lines with mono score blocks, reaction row. */
export function FeedSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <SkeletonScreen label="Loading the feed" className="flex flex-col gap-3">
      {Array.from({ length: cards }).map((_, i) => (
        <Panel key={i} className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Bar w={116} h={10} />
            <Bar w={68} h={16} className="rounded-[4px]" />
          </div>
          <div className="flex flex-col gap-1">
            {Array.from({ length: i === 0 ? 3 : 2 }).map((_, row) => (
              <div key={row} className="flex items-center justify-between py-0.5">
                <Bar w={92 - row * 8} h={13} />
                <Bar w={34} h={15} />
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            {Array.from({ length: 4 }).map((_, chip) => (
              <Bar key={chip} w={44} h={26} className="rounded-[10px]" />
            ))}
          </div>
        </Panel>
      ))}
    </SkeletonScreen>
  );
}

/** Stats: four tiles, form graph, the dashed frame-level well, venue rows. */
export function StatsSkeleton() {
  return (
    <SkeletonScreen label="Loading your stats" className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Panel key={i} className="flex flex-col gap-2">
            <Bar w={62} h={10} />
            <Bar w={72} h={26} />
          </Panel>
        ))}
      </div>

      <Panel className="flex flex-col gap-3">
        <Bar w={96} h={10} />
        <Bar h={64} className="rounded-[10px]" />
      </Panel>

      <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-line bg-well/50 p-4">
        <Bar w={84} h={10} />
        <div className="flex justify-between">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Bar w={54} h={10} />
              <Bar w={44} h={20} />
            </div>
          ))}
        </div>
        <Bar w="70%" h={9} />
      </div>

      <div className="flex flex-col gap-2">
        <Bar w={70} h={10} />
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl border border-line bg-panel px-4 py-3"
          >
            <Bar w={128} h={13} />
            <Bar w={40} h={15} />
          </div>
        ))}
      </div>
    </SkeletonScreen>
  );
}

/** Leaderboard rows on their own, for composing inside a bigger skeleton. */
function LeaderboardRows({ rows }: { rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3"
        >
          <Bar w={16} h={15} />
          <Circle size={32} />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Bar w={`${64 - i * 5}%`} h={14} />
            <Bar w={`${44 - i * 4}%`} h={11} />
          </div>
          <div className="flex items-center gap-4">
            <Bar w={30} h={15} />
            <Bar w={22} h={15} />
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * Group leaderboard: rank, avatar, name + games line, then the mono numbers.
 * `bare` drops the live region so it can nest inside another SkeletonScreen
 * without a screen reader announcing two loading messages.
 */
export function LeaderboardSkeleton({ rows = 5, bare = false }: { rows?: number; bare?: boolean }) {
  if (bare) {
    return (
      <div className="flex flex-col gap-2">
        <LeaderboardRows rows={rows} />
      </div>
    );
  }
  return (
    <SkeletonScreen label="Loading the leaderboard" className="flex flex-col gap-2">
      <LeaderboardRows rows={rows} />
    </SkeletonScreen>
  );
}

/**
 * Generic person/notification/game rows — avatar, two lines, trailing chip.
 * `bare` drops the live region for nesting inside another SkeletonScreen.
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
  const body = Array.from({ length: rows }).map((_, i) => (
    <div
      key={i}
      className="flex items-center gap-3 rounded-2xl border border-line bg-panel px-4 py-3.5"
    >
      {avatar && <Circle size={36} />}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Bar w={`${70 - i * 6}%`} h={13} />
        <Bar w={`${42 - i * 4}%`} h={10} />
      </div>
      {trailing && <Bar w={54} h={22} className="rounded-[10px]" />}
    </div>
  ));

  if (bare) return <div className="flex flex-col gap-2">{body}</div>;
  return (
    <SkeletonScreen label={label} className="flex flex-col gap-2">
      {body}
    </SkeletonScreen>
  );
}

/** Player cards with ten frame boxes each — no screen wrapper, so it composes. */
function ScorecardPanels({ players }: { players: number }) {
  return (
    <>
      {Array.from({ length: players }).map((_, p) => (
        <Panel key={p} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Bar w={104} h={13} />
            <Bar w={38} h={18} />
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 10 }).map((_, f) => (
              <Bar key={f} h={38} className="flex-1 rounded-[4px]" />
            ))}
          </div>
        </Panel>
      ))}
    </>
  );
}

/** A scorecard: ten frame boxes per player row, plus the running total column. */
export function ScorecardSkeleton({
  players = 2,
  label = 'Loading the game',
}: {
  players?: number;
  label?: string;
}) {
  return (
    <SkeletonScreen label={label} className="flex flex-col gap-3">
      <ScorecardPanels players={players} />
    </SkeletonScreen>
  );
}

/** The pre-join preview cards (/join/:code, /live/join/:code). */
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
      <Bar h={48} className="rounded-[10px]" />
    </SkeletonScreen>
  );
}

/** Form-shaped screens (entry flows, settings) — label + field pairs. */
export function FormSkeleton({ fields = 3, label }: { fields?: number; label: string }) {
  return (
    <SkeletonScreen label={label} className="flex flex-col gap-5">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Bar w={78} h={10} />
          <Bar h={46} className="rounded-[10px]" />
        </div>
      ))}
      <Bar h={48} className="rounded-[10px]" />
    </SkeletonScreen>
  );
}

/** Live scorer / spectator: NOW BOWLING panel over the card. */
export function LaneSkeleton({ label = 'Loading the lane' }: { label?: string }) {
  return (
    <SkeletonScreen label={label} className="flex flex-col gap-3">
      <Panel className="flex flex-col items-center gap-3 py-6">
        <Bar w={92} h={10} />
        <Bar w={140} h={22} />
        <Bar w={64} h={34} />
      </Panel>
      <ScorecardPanels players={2} />
    </SkeletonScreen>
  );
}
