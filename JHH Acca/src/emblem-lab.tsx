/* Dev-only emblem gallery (/emblem-lab.html): every champion-star tier in
   gold and silver, rendered through the real Emblem component at several
   sizes. Not part of the production build. */
import { createRoot } from 'react-dom/client'
import './index.css'
import { Emblem } from './components/ChampStars'

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
      <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>Dev-only. Champion star lineage, tiers 1–10, gold and silver — the real component.</p>
      {[36, 12, 10, 8].map((size) => (
        <Row key={`g${size}`} label={`gold @ ${size}px`}>
          {TIERS.map((t) => <Emblem key={t} tier={t} color="var(--color-gold)" size={size} />)}
        </Row>
      ))}
      <Row label="silver @ 10px">
        {TIERS.map((t) => <Emblem key={t} tier={t} color="var(--color-silver)" size={10} />)}
      </Row>
      <Row label="sample run @ 10px (T6 gold + T2 silver)">
        <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 3 }}>
          <Emblem tier={6} color="var(--color-gold)" size={10} />
          <Emblem tier={2} color="var(--color-silver)" size={10} />
        </span>
      </Row>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Lab />)
