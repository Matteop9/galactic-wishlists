import { score2 } from '../lib/format'

/* Team tug bar: two scores flanking an 8px two-segment bar, widths
   proportional, amber vs sky, 2px gap. */

export default function TugBar({ vdl, jhp }: { vdl: number; jhp: number }) {
  const total = vdl + jhp || 1
  const vdlPct = (vdl / total) * 100
  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <div className="overline" style={{ color: 'var(--color-vdl)' }}>VDL</div>
        <div className="font-mono text-[15px] font-bold">{score2(vdl)}</div>
      </div>
      <div className="flex h-2 flex-1 gap-[2px] overflow-hidden rounded-full">
        <div
          style={{
            width: `${vdlPct}%`,
            background: 'linear-gradient(90deg, var(--color-vdl), color-mix(in srgb, var(--color-vdl) 55%, transparent))',
          }}
        />
        <div
          className="flex-1"
          style={{
            background: 'linear-gradient(270deg, var(--color-jhp), color-mix(in srgb, var(--color-jhp) 55%, transparent))',
          }}
        />
      </div>
      <div>
        <div className="overline" style={{ color: 'var(--color-jhp)' }}>JHP</div>
        <div className="font-mono text-[15px] font-bold">{score2(jhp)}</div>
      </div>
    </div>
  )
}
