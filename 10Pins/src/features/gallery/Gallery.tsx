import { useEffect, useRef, useState, type ReactNode } from 'react';
import { nextRoll, score, type FrameInput, type Roll } from '../../engine';
import { HIFI_GAME } from '../../engine/fixtures';
import FrameEditor from '../../components/FrameEditor';
import Scorecard, { type ScorecardPlayer } from '../../components/scorecard/Scorecard';
import VerificationBadge from '../../components/VerificationBadge';
import Wordmark from '../../components/Wordmark';
import CelebrationHost from '../../components/Celebration';
import { gameCelebration, rollCelebration } from '../../lib/celebrate';
import { celebrate } from '../../lib/celebrationStore';
import {
  FeedSkeleton,
  LaneSkeleton,
  LeaderboardSkeleton,
  ListSkeleton,
  PreviewSkeleton,
  RefetchLine,
  ScorecardSkeleton,
  StatsSkeleton,
} from '../../components/Skeleton';

const g = (...frames: Roll[][]): FrameInput[] => frames.map((rolls) => ({ rolls }));

/**
 * Mid-game state adapted from the hi-fi live-session mock. The mock's
 * MATT frame 4 (`7,3` open) is illegal, so it becomes a legal 7,2 here —
 * the engine recomputes all cumulatives from rolls anyway.
 */
const LIVE_PLAYERS: ScorecardPlayer[] = [
  {
    name: 'MATT',
    frames: g([8, '/'], [9, 0], ['X'], [7, 2], ['X'], ['X'], [9, '/']),
  },
  {
    name: 'DAVE',
    frames: g(['X'], ['X'], [8, '/'], [9, 0], ['X'], [7, '/'], [8]),
    current: true,
    currentFrame: 6,
  },
  {
    name: 'SOPH',
    frames: g([7, 2], [9, '/'], [8, 1], ['X'], [6, 2], [9, 0]),
  },
  {
    name: 'JEN',
    frames: g([8, 0], [7, '/'], [9, 0], ['X'], [7, 2], [8, '/']),
  },
];

const FOUR_PLAYERS: ScorecardPlayer[] = HIFI_GAME.map((p) => ({ name: p.name, frames: p.frames }));

export default function Gallery() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col gap-8 px-4 py-8">
      <header className="flex items-center justify-between">
        <Wordmark size="sm" />
        <span className="label-caps">Component gallery</span>
      </header>

      <Section n="01" title="Scorecard · full" note="The verified four-player hi-fi game — every total engine-derived.">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-display text-[15px] font-bold">Thursday Pin Club</span>
          <VerificationBadge status="verified" />
        </div>
        <Scorecard players={FOUR_PLAYERS} variant="full" />
      </Section>

      <Section n="02" title="Scorecard · compact" note="Feed-card mini strips: one glyph per frame, right-aligned total.">
        <Scorecard players={FOUR_PLAYERS} variant="compact" />
      </Section>

      <Section n="03" title="Scorecard · live" note="Current frame outlined amber; pending frames dim; blank totals while bonuses are pending.">
        <Scorecard players={LIVE_PLAYERS} variant="live" />
      </Section>

      <Section n="04" title="Scorecard · editing" note="Frame 6 fails to recompute against the photo — amber mismatch fill on the failing frame only.">
        <Scorecard
          players={[{ name: 'MATT', frames: HIFI_GAME[0].frames, amberFrames: [5] }]}
          variant="editing"
        />
      </Section>

      <Section n="05" title="Scorecard · share render" note="Larger cells for the 1080×1350 share card — shown scaled to fit.">
        <div className="w-[520px] rounded-xl border border-line bg-ink p-4" style={{ zoom: 0.65 }}>
          <div className="mb-3 flex items-center justify-between">
            <Wordmark size="sm" />
            <VerificationBadge status="verified" />
          </div>
          <Scorecard players={[{ name: 'DAVE', frames: HIFI_GAME[1].frames }]} variant="share" />
          <p className="mt-3 text-right font-display text-[26px] font-extrabold text-phosphor [text-shadow:0_0_12px_rgba(255,174,43,.4)]">
            213
          </p>
        </div>
      </Section>

      <Section n="06" title="Verification badges">
        <div className="flex items-center gap-3">
          <VerificationBadge status="verified" />
          <VerificationBadge status="live" />
          <VerificationBadge status="unverified" />
        </div>
      </Section>

      <Section
        n="07"
        title="Frame editor + keypad"
        note="Full manual mode: play a game. Illegal keys disable before the tap; edits ripple with the settle flash; Undo always available."
      >
        <EditorDemo />
      </Section>

      <Section
        n="08"
        title="Skeletons"
        note="Every loading state, side by side — greys and a glass sweep only, never amber (§12). Each mirrors its real layout box-for-box so nothing jumps when data lands."
      >
        <div className="flex flex-col gap-6">
          <SkeletonCase label="Feed">
            <FeedSkeleton cards={2} />
          </SkeletonCase>
          <SkeletonCase label="Stats">
            <StatsSkeleton />
          </SkeletonCase>
          <SkeletonCase label="Leaderboard">
            <LeaderboardSkeleton rows={4} />
          </SkeletonCase>
          <SkeletonCase label="Rows (friends · groups · notifications)">
            <ListSkeleton rows={2} label="Loading" />
          </SkeletonCase>
          <SkeletonCase label="Game / leg">
            <ScorecardSkeleton players={1} />
          </SkeletonCase>
          <SkeletonCase label="Live lane">
            <LaneSkeleton />
          </SkeletonCase>
          <SkeletonCase label="Join preview">
            <PreviewSkeleton label="Loading" />
          </SkeletonCase>
          <SkeletonCase label="Refetch hairline (content already on screen)">
            <RefetchLine active />
          </SkeletonCase>
        </div>
      </Section>

      <Section
        n="09"
        title="Celebrations"
        note="The ladder, live — fire one and watch it. ≤1200ms, always skippable, and tiers 1–2 are pointer-events-none at the TOP of the screen so they can never sit on the keypad. Tier 3 only ever fires at the end of a game, where the keypad is already gone."
      >
        <CelebrationDemo />
      </Section>

      {/* The gallery renders outside Shell, so it needs its own host. */}
      <CelebrationHost />
    </div>
  );
}

/** Each button fires a real celebration through the real store. */
function CelebrationDemo() {
  const cases: { label: string; fire: () => void }[] = [
    { label: 'Strike (tier 1)', fire: () => celebrate(rollCelebration(g(), g(['X']))) },
    { label: 'Turkey (tier 2)', fire: () => celebrate(rollCelebration(g(['X'], ['X']), g(['X'], ['X'], ['X']), 'Dave')) },
    { label: 'First game (tier 2)', fire: () => celebrate(gameCelebration(['FIRST_GAME'])) },
    { label: 'New PB (tier 3)', fire: () => celebrate(gameCelebration(['PB'], 'demo-game')) },
    { label: 'PB + 200 club + turkey (tier 3)', fire: () => celebrate(gameCelebration(['PB', '200_CLUB', 'TURKEY'], 'demo-game')) },
    { label: 'Perfect game (tier 3)', fire: () => celebrate(gameCelebration(['300_CLUB', 'PB', 'TURKEY'], 'demo-game')) },
  ];

  return (
    <div className="flex flex-col gap-2">
      {cases.map((c) => (
        <button
          key={c.label}
          type="button"
          onClick={c.fire}
          className="press rounded-xl border border-line bg-well px-4 py-2.5 text-left text-[13.5px] text-text"
        >
          {c.label}
        </button>
      ))}
      <p className="text-[12px] text-faint">
        A quieter celebration can't interrupt a louder one — tap Perfect game then Strike and nothing happens.
      </p>
    </div>
  );
}

function SkeletonCase({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="label-caps">{label}</span>
      {children}
    </div>
  );
}

function Section({ n, title, note, children }: { n: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <p className="label-caps">
          {n} · {title}
        </p>
        {note && <p className="mt-1 text-[12px] text-faint">{note}</p>}
      </div>
      <div className="rounded-2xl border border-line bg-panel p-3">{children}</div>
    </section>
  );
}

function EditorDemo() {
  const [history, setHistory] = useState<FrameInput[][]>([[]]);
  const frames = history[history.length - 1];
  const scored = score(frames);
  const pos = nextRoll(frames);

  // Settle flash: flag every frame whose cumulative changed since the last render
  const cumulatives = scored.frames.map((f) => f.cumulative);
  const previous = useRef<(number | null)[]>([]);
  const settleFrames = cumulatives
    .map((c, i) => (c !== null && previous.current[i] !== c ? i : -1))
    .filter((i) => i >= 0);
  useEffect(() => {
    previous.current = cumulatives;
  });

  return (
    <div className="flex flex-col gap-4">
      <Scorecard
        players={[
          {
            name: 'YOU',
            frames,
            current: true,
            currentFrame: pos?.frame,
            settleFrames,
          },
        ]}
        variant="live"
      />
      <FrameEditor
        frames={frames}
        onChange={(next) => setHistory((h) => [...h, next])}
        onUndo={() => setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h))}
        canUndo={history.length > 1}
        playerName="You"
      />
      {scored.complete && (
        <div className="flex items-center justify-between rounded-xl border border-line bg-well px-4 py-3">
          <span className="font-display text-[15px] font-bold">
            Final score <span className="score-text text-phosphor">{scored.total}</span>
          </span>
          <button
            type="button"
            onClick={() => setHistory([[]])}
            className="rounded-lg border border-line px-3 py-1.5 text-[13.5px] text-dim"
          >
            Start again
          </button>
        </div>
      )}
    </div>
  );
}
