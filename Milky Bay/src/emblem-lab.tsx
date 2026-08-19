/* Dev-only emblem gallery (/emblem-lab.html): every crown/spoon tier, the
   halves and the poo, rendered through the real components at several sizes.
   Not part of the production build. */
import { createRoot } from 'react-dom/client'
import './index.css'
import { crownTier, spoonTier, HALF_CROWN, HALF_SPOON, Mark, PooMark } from './components/Honours'

const TIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, padding: '14px 0', borderBottom: '1px solid var(--color-line)' }}>
      <div className="overline" style={{ width: 190, flexShrink: 0 }}>{label}</div>
      {children}
    </div>
  )
}

function Lab() {
  return (
    <div style={{ padding: '32px 28px', maxWidth: 1100, margin: '0 auto' }}>
      <h1 className="display" style={{ fontSize: 28, margin: 0 }}>Emblem Lab</h1>
      <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>Dev-only. Crown + spoon lineages, halves, the poo — real components, all tiers.</p>
      {[36, 10, 8].map((size) => (
        <Row key={`c${size}`} label={`crowns @ ${size}px`}>
          {TIERS.map((t) => <Mark key={t} spec={crownTier(t)} color="var(--color-gold)" size={size} />)}
          <Mark spec={HALF_CROWN} color="var(--color-gold)" size={size} />
        </Row>
      ))}
      {[36, 10, 8].map((size) => (
        <Row key={`s${size}`} label={`spoons @ ${size}px`}>
          {TIERS.map((t) => <Mark key={t} spec={spoonTier(t)} color="var(--color-spoon)" size={size} />)}
          <Mark spec={HALF_SPOON} color="var(--color-spoon)" size={size} />
        </Row>
      ))}
      <Row label="poo + pat @ 7px (hover size)">
        <PooMark />
        <PooMark half />
        <span style={{ position: 'relative', fontWeight: 700, fontSize: 13.5 }}>
          <span className="relative inline-block">
            <span aria-hidden="true" className="pointer-events-none absolute left-0 top-0 flex w-full justify-center"><PooMark /></span>
            F
          </span>
          itzy — in position
        </span>
      </Row>
      <Row label="sample runs @ 10px">
        <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 3 }}>
          <Mark spec={crownTier(2)} color="var(--color-gold)" size={10} />
          <Mark spec={HALF_CROWN} color="var(--color-gold)" size={10} />
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 3 }}>
          <Mark spec={crownTier(1)} color="var(--color-gold)" size={10} />
          <Mark spec={spoonTier(3)} color="var(--color-spoon)" size={10} />
          <Mark spec={HALF_SPOON} color="var(--color-spoon)" size={10} />
        </span>
      </Row>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Lab />)
