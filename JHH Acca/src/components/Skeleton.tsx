/* Loading placeholders (v0.10.0).

   Geometry mirrors the real components so the swap never shifts layout:
   acca pick row 44px, leaderboard row 38px, gameweek row 48px, banner 44px.
   Deliberately three primitives and no more — pages compose them at the call
   site, which keeps this file a straight copy into Milky Bay. */

export function Skeleton({
  w = '100%',
  h = 12,
  r,
  className = '',
}: {
  w?: number | string
  h?: number
  r?: number
  className?: string
}) {
  return (
    <span
      className={`skel block ${className}`}
      style={{ width: w, height: h, borderRadius: r }}
      aria-hidden
    />
  )
}

/** A `rounded-[14px] bg-surface` card of n hairline-separated placeholder rows. */
export function SkeletonPanel({
  rows = 6,
  rowHeight = 44,
  header = false,
  /** acca/history rows lead with an avatar; leaderboard and gameweek rows lead
      with a rank number or a date, so they get a short bar instead. */
  avatar = true,
  lines = 2,
  className = '',
}: {
  rows?: number
  rowHeight?: number
  header?: boolean
  avatar?: boolean
  lines?: 1 | 2
  className?: string
}) {
  return (
    <div className={`rounded-[14px] bg-surface ${className}`} role="status" aria-label="Loading">
      {header && (
        <div className="border-b px-3.5 py-2" style={{ borderColor: 'var(--color-line)' }}>
          <Skeleton w={90} h={8} />
        </div>
      )}
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-2.5 border-b px-3.5 last:border-b-0"
          style={{ borderColor: 'var(--color-line)', height: rowHeight }}
        >
          {avatar ? (
            <Skeleton w={rowHeight >= 44 ? 30 : 26} h={rowHeight >= 44 ? 30 : 26} r={999} />
          ) : (
            <Skeleton w={18} h={10} />
          )}
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            {/* pseudo-random widths so the rows don't read as a barcode */}
            <Skeleton w={`${52 + ((i * 13) % 26)}%`} h={11} />
            {lines === 2 && <Skeleton w={`${30 + ((i * 17) % 22)}%`} h={9} />}
          </span>
          <Skeleton w={34} h={12} />
        </div>
      ))}
    </div>
  )
}

/** AccaCard silhouette: 3px team bar, header block, pick rows, surface-2 footer. */
export function SkeletonAccaCard({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-[14px] bg-surface" role="status" aria-label="Loading">
      <div className="h-[3px]" style={{ background: 'var(--color-line-strong)' }} />
      <div className="flex items-end justify-between px-3.5 pb-2 pt-3">
        <span className="flex flex-col gap-1.5">
          <Skeleton w={44} h={8} />
          <Skeleton w={72} h={20} />
        </span>
        <span className="flex flex-col items-end gap-1.5">
          <Skeleton w={52} h={8} />
          <Skeleton w={58} h={18} />
        </span>
      </div>
      <SkeletonPanel rows={rows} className="rounded-none bg-transparent" />
      <div
        className="flex items-center justify-between px-3.5 py-2.5"
        style={{ background: 'var(--color-surface-2)' }}
      >
        <Skeleton w={130} h={11} />
        <Skeleton w={80} h={9} />
      </div>
    </div>
  )
}

/** Default page placeholder — title bar + two cards, top-anchored like the real page. */
export function PageSkeleton() {
  return (
    <div className="page-in px-4">
      <div className="flex items-center justify-between pb-3 pt-5">
        <Skeleton w={150} h={24} />
        <Skeleton w={64} h={16} />
      </div>
      <div className="flex flex-col gap-4">
        <SkeletonPanel rows={5} />
        <SkeletonPanel rows={3} />
      </div>
    </div>
  )
}
