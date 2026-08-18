import { fmtValue } from '../lib/format'
import type { ReviewedAsset, ReviewedTrade } from '../lib/engine/tradeHistory'
import { PlayerFace } from './PlayerFace'

function AssetChip({ asset }: { asset: ReviewedAsset }) {
  return (
    <span className="asset-chip" title={asset.note ?? undefined}>
      {asset.kind === 'player' && asset.playerId ? (
        <PlayerFace playerId={asset.playerId} name={asset.name} position={asset.position ?? 'UNK'} size={24} />
      ) : (
        <span className="face face-fallback" style={{ width: 24, height: 24 }}>
          {asset.name.split(' ')[1] ?? 'P'}
        </span>
      )}
      <span>
        {asset.name}{' '}
        <span className="dim">{asset.currentValue !== null ? fmtValue(asset.currentValue) : '–'}</span>
      </span>
    </span>
  )
}

function tradeDate(created: number): string {
  return new Date(created).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function TradeHistory({ trades }: { trades: ReviewedTrade[] | null }) {
  if (trades === null) {
    return <div className="card dim">Trade history needs a fresh snapshot — run npm run refresh.</div>
  }
  if (trades.length === 0) {
    return <div className="card dim">No completed trades found for my team in the scanned seasons.</div>
  }
  return (
    <div className="card">
      {trades.map((trade) => (
        <div className="trade-row" key={trade.id}>
          <div className="trade-row-head">
            <span className="dim small">
              {tradeDate(trade.created)} · with {trade.counterparties.join(', ')}
            </span>
            <span className={`net-badge net-${trade.outcome}`}>
              {trade.netValue >= 0 ? '+' : '−'}
              {fmtValue(Math.abs(trade.netValue))}
            </span>
          </div>
          <div className="trade-assets">
            <span className="pop-label">Gave</span>
            {trade.gave.length === 0 ? <span className="dim small">nothing</span> : trade.gave.map((a, i) => <AssetChip key={i} asset={a} />)}
          </div>
          <div className="trade-assets">
            <span className="pop-label">Got</span>
            {trade.got.length === 0 ? <span className="dim small">nothing</span> : trade.got.map((a, i) => <AssetChip key={i} asset={a} />)}
          </div>
          <div className="small dim">{trade.take}</div>
        </div>
      ))}
    </div>
  )
}
