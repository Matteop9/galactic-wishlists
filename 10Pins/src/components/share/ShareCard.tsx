import Scorecard from '../scorecard/Scorecard';
import type { FrameInput } from '../../engine';
import { shareCopy, type ShareCopyInput } from '../../lib/shareCopy';

/**
 * The share card (design §Share card): "free marketing — treat it as a
 * distinct branded asset". Exports at 1080 × 1350, drawn here at exactly half
 * that (540 × 675) so every value maps 1:1 to the hi-fi and the rasteriser
 * just doubles it.
 *
 * It reuses `Scorecard variant="share"` rather than redrawing the grid: one
 * scorecard component, so the card can never disagree with the app about what
 * a game looked like.
 *
 * This is sanctioned appearance #4 of the signature sweep — and the only one
 * that is *frozen*, which is precisely why it survives being rasterised.
 */
export interface ShareCardData extends ShareCopyInput {
  /** the winner’s frames, for the grid */
  frames: FrameInput[];
}

export default function ShareCard({ data }: { data: ShareCardData }) {
  const copy = shareCopy(data);
  if (!copy) return null;

  const verified = data.verification === 'verified';

  return (
    <div
      className="relative flex h-[675px] w-[540px] flex-col justify-between overflow-hidden bg-ink p-9"
      // A phosphor CRT texture, straight from the hi-fi.
      style={{
        backgroundImage:
          'repeating-linear-gradient(180deg, rgb(150 220 255 / .03) 0px, rgb(150 220 255 / .03) 1px, transparent 1px, transparent 5px)',
      }}
    >
      {/* the frozen sweep */}
      <div
        className="absolute inset-x-0 top-[57%] h-[2.5px] bg-phosphor opacity-80"
        style={{ boxShadow: '0 0 24px 6px rgb(255 174 43 / .4)' }}
        aria-hidden
      />

      <div className="relative flex items-center gap-2">
        <span
          className="score-text rounded-[5px] border-2 border-phosphor px-1.5 font-display text-[17px] font-extrabold leading-[1.35] text-phosphor"
          style={{ textShadow: '0 0 10px rgb(255 174 43 / .5)' }}
        >
          10
        </span>
        <span className="font-display text-[17px] font-extrabold tracking-[.14em] text-glass">PINS</span>
        {copy.meta && (
          <span className="ml-auto font-mono text-[11px] font-semibold tracking-[.08em] text-faint">
            {copy.meta}
          </span>
        )}
      </div>

      <div className="relative flex flex-col gap-5">
        <div className="flex flex-col gap-0.5">
          {data.groupName && (
            <span className="font-mono text-[13px] font-semibold tracking-[.14em] text-dim">
              {data.groupName.toUpperCase()}
            </span>
          )}
          <div className="flex items-baseline gap-4">
            <span className="font-display text-[56px] font-extrabold leading-[1.05] text-text">
              {copy.winner}
            </span>
            <span
              className="score-text text-[64px] font-bold leading-none text-phosphor"
              style={{ textShadow: '0 0 20px rgb(255 174 43 / .5)' }}
            >
              {copy.score}
            </span>
          </div>
          {(copy.pills.length > 0 || copy.statPill) && (
            <div className="flex gap-2 pt-2">
              {copy.pills.map((pill) => (
                <span
                  key={pill}
                  className="rounded-[5px] border-[1.5px] border-phosphor/50 px-2.5 py-1 font-display text-[12px] font-bold tracking-[.1em] text-phosphor"
                >
                  {pill}
                </span>
              ))}
              {copy.statPill && (
                <span className="rounded-[5px] border-[1.5px] border-mark/40 px-2.5 py-1 font-display text-[12px] font-bold tracking-[.1em] text-mark">
                  {copy.statPill}
                </span>
              )}
            </div>
          )}
        </div>

        <Scorecard players={[{ name: copy.winner.toUpperCase(), frames: data.frames }]} variant="share" />
      </div>

      <div className="relative flex items-center">
        <span className="text-[14px] text-dim">{copy.stinger}</span>
        <span
          className={`ml-auto -rotate-3 rounded-md px-4 py-2 font-display text-[13px] font-extrabold tracking-[.14em] ${
            verified ? 'bg-phosphor text-ink' : 'border border-line text-dim'
          }`}
          style={verified ? { boxShadow: '0 0 24px rgb(255 174 43 / .5)' } : undefined}
        >
          {verified ? '✓ VERIFIED' : data.verification === 'live' ? 'LIVE-SCORED' : 'UNVERIFIED'}
        </span>
      </div>
    </div>
  );
}
