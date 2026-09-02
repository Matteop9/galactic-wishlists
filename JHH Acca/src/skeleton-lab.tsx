/* Dev-only skeleton gallery (/skeleton-lab.html): every placeholder next to the
   real component it stands in for, so the heights and rhythm can be compared
   without signing in. Not part of the production build. */
import { createRoot } from 'react-dom/client'
import './index.css'
import { PageSkeleton, Skeleton, SkeletonAccaCard, SkeletonPanel } from './components/Skeleton'
import { LoadFailed, PageTitle } from './components/ui'

function Case({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div className="overline" style={{ marginBottom: 8 }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function Lab() {
  return (
    <div className="mx-auto max-w-[480px] px-4 py-6">
      <PageTitle>SKELETON LAB</PageTitle>
      <Case label="ACCA CARD — 6 LEGS (44px rows)">
        <SkeletonAccaCard rows={6} />
      </Case>
      <Case label="LEADERBOARD TABLE (38px rows, header)">
        <SkeletonPanel rows={6} rowHeight={38} header avatar={false} lines={1} />
      </Case>
      <Case label="GAMEWEEK LIST (48px rows)">
        <SkeletonPanel rows={4} rowHeight={48} avatar={false} />
      </Case>
      <Case label="BANNER SLOT / TUG BAR / STAT VALUE / GW TITLE">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Skeleton h={44} r={12} />
          <Skeleton h={8} r={99} />
          <Skeleton w={78} h={22} />
          <Skeleton w={118} h={20} />
        </div>
      </Case>
      <Case label="RULES PARAGRAPH">
        <div className="flex flex-col gap-2.5 rounded-[14px] bg-surface px-4 py-6">
          {[18, 96, 88, 92, 60, 18, 94, 86].map((w, i) => (
            <Skeleton key={i} w={`${w}%`} h={w === 18 ? 16 : 11} />
          ))}
        </div>
      </Case>
      <Case label="LOAD FAILED">
        <LoadFailed what="the standings" />
      </Case>
      <Case label="DEFAULT PAGE SKELETON (the auth gate)">
        <div style={{ marginLeft: -16, marginRight: -16 }}>
          <PageSkeleton />
        </div>
      </Case>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Lab />)
