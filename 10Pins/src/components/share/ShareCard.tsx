import type { CSSProperties } from 'react';
import Scorecard from '../scorecard/Scorecard';
import Wordmark from '../Wordmark';
import { VERIFICATION_LABEL } from '../VerificationBadge';
import type { FrameInput } from '../../engine';
import { highlightLabel } from '../../lib/highlights';
import { shareCopy, type ShareCopyInput } from '../../lib/shareCopy';

/**
 * The share card: a scoresheet strip on light paper. Exports at 1080 x 1350,
 * drawn here at exactly half that (540 x 675) so the rasteriser just doubles it.
 *
 * It reuses `Scorecard variant="share"` rather than redrawing the grid: one
 * scorecard component, so the card can never disagree with the app about what
 * a game looked like.
 *
 * The card is an image, so it is always light whatever theme the page is in:
 * the light tokens are pinned inline on the root, and every token class inside
 * resolves against them.
 */
export interface ShareCardData extends ShareCopyInput {
  /** the winner's frames, for the grid */
  frames: FrameInput[];
}

const LIGHT_TOKENS = {
  colorScheme: 'light',
  '--paper': '#f7f3ea',
  '--sheet': '#fbf8f1',
  '--card': '#efeadd',
  '--ink': '#201e1a',
  '--ink-faded': '#5c574c',
  '--hairline': 'rgba(32,30,26,0.18)',
  '--rule': 'rgba(32,30,26,0.38)',
  '--strip': '#201e1a',
  '--red': '#b3372b',
  '--blue': '#2c4e9e',
} as CSSProperties;

/**
 * Sentence case for a label that arrives in capitals ("PERFECT GAME"), keeping
 * "PB" as the initialism it is. Anything already mixed-case passes through.
 */
function sentence(text: string): string {
  if (text !== text.toUpperCase() || !/[A-Z]/.test(text)) return text;
  const lower = text.toLowerCase().replace(/\bpb\b/g, 'PB');
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** "Sat 30 Aug · Jersey Bowl", in the register the rest of the app uses. */
function metaLine(playedAt?: string, venueName?: string | null): string {
  const date = playedAt
    ? new Date(playedAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    : null;
  return [date, venueName ?? null].filter(Boolean).join(' · ');
}

export default function ShareCard({ data }: { data: ShareCardData }) {
  const copy = shareCopy(data);
  if (!copy) return null;

  const meta = metaLine(data.playedAt, data.venueName);
  const highlights = data.highlights.map((code) => sentence(highlightLabel(code)));
  const strikes =
    typeof data.strikes === 'number' && data.strikes > 0
      ? `${data.strikes} ${data.strikes === 1 ? 'strike' : 'strikes'}`
      : null;

  return (
    <div
      className="flex h-[675px] w-[540px] flex-col justify-between border-[1.5px] border-ink bg-sheet p-9 text-ink"
      style={LIGHT_TOKENS}
    >
      <div className="flex items-baseline">
        <Wordmark size="sm" />
        {meta && <span className="ml-auto text-[13px] text-ink-faded">{meta}</span>}
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          {data.groupName && <span className="text-[13px] text-ink-faded">{data.groupName}</span>}
          <div className="flex items-baseline gap-4">
            <span className="num min-w-0 truncate text-[56px] font-semibold leading-none">{copy.winner}</span>
            <span className="num shrink-0 text-[64px] font-semibold leading-none text-red">{copy.score}</span>
          </div>
          {(highlights.length > 0 || strikes) && (
            <p className="flex flex-wrap gap-x-2 pt-1 text-[14px]">
              {highlights.map((label, i) => (
                <span key={label} className="flex gap-x-2">
                  {i > 0 && <span className="text-ink-faded">·</span>}
                  <span className="font-semibold text-red">{label}</span>
                </span>
              ))}
              {strikes && (
                <span className="flex gap-x-2">
                  {highlights.length > 0 && <span className="text-ink-faded">·</span>}
                  <span className="num font-semibold text-blue">{strikes}</span>
                </span>
              )}
            </p>
          )}
        </div>

        <Scorecard
          players={[{ name: copy.winner, frames: data.frames, meta, total: copy.score, tone: 'hot' }]}
          variant="share"
        />
      </div>

      <div className="flex items-baseline gap-4">
        <span className="min-w-0 text-[14px] text-ink-faded">{copy.stinger}</span>
        <span className="ml-auto shrink-0 text-[13px] text-ink-faded">{VERIFICATION_LABEL[data.verification]}</span>
      </div>
    </div>
  );
}
