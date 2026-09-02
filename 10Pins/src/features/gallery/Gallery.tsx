import { useEffect, useRef, useState, type ReactNode } from 'react';
import { nextRoll, score, type FrameInput, type Roll } from '../../engine';
import { HIFI_GAME } from '../../engine/fixtures';
import FrameEditor from '../../components/FrameEditor';
import Scorecard, { type ScorecardPlayer } from '../../components/scorecard/Scorecard';
import VerificationBadge from '../../components/VerificationBadge';
import Icon, { type IconName } from '../../components/Icon';
import Wordmark from '../../components/Wordmark';
import CelebrationHost from '../../components/Celebration';
import ShareCard, { type ShareCardData } from '../../components/share/ShareCard';
import EmptyState from '../../components/EmptyState';
import JoinQr from '../../components/JoinQr';
import ChipRow, { type ChipOption } from '../../components/ChipRow';
import Avatar from '../../components/Avatar';
import WhatsNewCard from '../../components/WhatsNewCard';
import { HeadToHeadPanel } from '../players/PlayerPage';
import type { HeadToHead } from '../../lib/players';
import { renderShareCard } from '../../lib/shareCard';
import { RELEASES } from '../../lib/changelog';
import { gameCelebration, rollCelebration } from '../../lib/celebrate';
import { celebrate } from '../../lib/celebrationStore';
import {
  FeedSkeleton,
  LaneSkeleton,
  LeaderboardSkeleton,
  ListSkeleton,
  PlayerSkeleton,
  PreviewSkeleton,
  RefetchLine,
  ScorecardSkeleton,
  StatsSkeleton,
} from '../../components/Skeleton';

const g = (...frames: Roll[][]): FrameInput[] => frames.map((rolls) => ({ rolls }));

/**
 * Mid-game state adapted from the hi-fi live-session mock. The mock’s
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

/** A tiny inline "photo" so the Avatar cases don't depend on the network. */
const DEMO_AVATAR_URL =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#d98b3f"/><circle cx="32" cy="26" r="14" fill="#fff4e6"/><rect x="12" y="44" width="40" height="20" rx="10" fill="#fff4e6"/></svg>',
  );

const DEMO_H2H: HeadToHead = {
  games: 11,
  wins: 7,
  losses: 3,
  ties: 1,
  my_avg: 171.3,
  their_avg: 165.0,
  meetings: [
    {
      game_id: 'demo-1',
      played_at: '2026-08-20T19:00:00.000Z',
      verification_status: 'verified',
      venue_name: 'Hollywood Bowl',
      my_score: 178,
      their_score: 171,
    },
    {
      game_id: 'demo-2',
      played_at: '2026-08-06T19:00:00.000Z',
      verification_status: 'live',
      venue_name: 'Lucky Strike',
      my_score: 152,
      their_score: 160,
    },
    {
      game_id: 'demo-3',
      played_at: '2026-07-23T19:00:00.000Z',
      verification_status: 'unverified',
      venue_name: null,
      my_score: 165,
      their_score: 165,
    },
  ],
};

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
        <div className="w-[520px] rounded-card border border-line bg-ink p-4" style={{ zoom: 0.65 }}>
          <div className="mb-3 flex items-center justify-between">
            <Wordmark size="sm" />
            <VerificationBadge status="verified" />
          </div>
          <Scorecard players={[{ name: 'DAVE', frames: HIFI_GAME[1].frames }]} variant="share" />
          <p className="mt-3 text-right font-display text-[26px] font-extrabold text-phosphor glow-amber-text">
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

      <Section
        n="10"
        title="Share card · 1080×1350"
        note="The real component at its true size (540×675, shown scaled) beside the actual PNG the rasteriser produces. Any drift between the two — a font that didn’t embed, a colour that didn’t survive — shows up here rather than in someone’s group chat."
      >
        <ShareCardDemo />
      </Section>

      <Section
        n="11"
        title="Empty states + join QR"
        note="Three tones, so a quiet corner stays quiet: a whole screen with nothing on it, a section inside a busy screen, and a one-line aside. Every state that has an obvious next move offers the control rather than describing it."
      >
        <div className="flex flex-col gap-6">
          <SkeletonCase label="Page — the solo empty (first screen a new player sees)">
            <EmptyState
              title="Nothing here yet"
              body="Scan the scoreboard from your last game and it lands here — or start with the totals, which takes ten seconds."
              action={{ label: 'Scan your first game', to: '/add/scan' }}
              secondary={{ label: 'Quick add the totals', to: '/add/quick' }}
            />
          </SkeletonCase>
          <SkeletonCase label="Inline — a section inside a screen that has content">
            <EmptyState
              tone="inline"
              body="No frame-scored games yet — strike and spare rates need the frames, not just the total."
              action={{ label: 'Scan a scoreboard', to: '/add/scan' }}
            />
          </SkeletonCase>
          <SkeletonCase label="Quiet — an aside, not an announcement">
            <EmptyState tone="quiet" body="No comments yet" />
          </SkeletonCase>
          <SkeletonCase label="Join QR — dark-on-light on purpose, so it actually scans">
            <JoinQr url="https://10pins.vercel.app/join/abc123" label="Scan to join" />
          </SkeletonCase>
        </div>
      </Section>

      <Section
        n="12"
        title="Icons"
        note="The whole set (B1): 24-viewBox, no fill, round caps/joins, 1.8 stroke — same weight as the tab bar's originals. No emoji or text-glyph icons anywhere else in the app."
      >
        <IconSheet />
      </Section>

      <Section
        n="13"
        title="Banners"
        note="Amber budget (B2): a live-session row and an offline-scan row, de-glowed to border-line — the signal dot and copy carry the meaning, not a glow. Static markup, so this is reviewable without signing in."
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 rounded-card border border-line bg-panel px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="size-2 shrink-0 live-dot rounded-full bg-signal" aria-hidden />
              <div className="min-w-0">
                <p className="truncate font-display text-[14px] font-bold text-text">Your game is still going</p>
                <p className="truncate text-[11.5px] text-faint">Hollywood Bowl · Thursday Pin Club</p>
              </div>
            </div>
            <span className="shrink-0 font-display text-[12.5px] font-bold text-phosphor">Resume</span>
          </div>
          <div className="flex items-center justify-between rounded-card border border-line bg-panel px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-display text-[14px] font-bold text-text">1 scan ready to review</p>
              <p className="truncate text-[11.5px] text-faint">Scanned while you were offline</p>
            </div>
            <span className="shrink-0 font-display text-[12.5px] font-bold text-phosphor">Review</span>
          </div>
        </div>
      </Section>

      <Section
        n="14"
        title="ChipRow"
        note="Radiogroup pills (feed filter, up to 4 options) and the fill segmented variant (leaderboard period + metric)."
      >
        <ChipRowDemo />
      </Section>

      <Section n="15" title="Avatar" note="Photo when a url is set, else initials on the well/border idiom — three sizes.">
        <AvatarSheet />
      </Section>

      <Section n="16" title="Player skeleton" note="The player page's own loading shape: header, head-to-head panel, stat tiles.">
        <SkeletonCase label="Player page">
          <PlayerSkeleton />
        </SkeletonCase>
      </Section>

      <Section
        n="17"
        title="Head-to-head"
        note="The same panel PlayerPage renders, from a static fixture — record in mono text, never amber."
      >
        <HeadToHeadPanel
          h2h={DEMO_H2H}
          myName="Matt"
          theirName="Dave K"
          myUrl={null}
          theirUrl={null}
        />
      </Section>

      <Section
        n="18"
        title="What’s new card"
        note="The release note on the feed — shown once per release, dismissible, no glow (a changelog is information, not a celebration). Rendered here from the live release list."
      >
        <WhatsNewCard release={RELEASES[0]!} older={RELEASES.length - 1} onDismiss={() => {}} />
      </Section>

      {/* The gallery renders outside Shell, so it needs its own host. */}
      <CelebrationHost />
    </div>
  );
}

const ICON_NAMES: IconName[] = [
  'home',
  'groups',
  'stats',
  'profile',
  'bell',
  'comment',
  'chevron-left',
  'chevron-right',
  'chevron-up',
  'chevron-down',
  'arrow-up',
  'arrow-down',
  'x',
  'plus',
  'image',
];

function IconSheet() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {ICON_NAMES.map((name) => (
        <div key={name} className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-3 text-text">
            <Icon name={name} className="size-5" />
            <Icon name={name} className="size-4" />
          </div>
          <span className="text-[10px] text-faint">{name}</span>
        </div>
      ))}
    </div>
  );
}

/** The card, and the PNG of the card, side by side. */
function ShareCardDemo() {
  const node = useRef<HTMLDivElement>(null);
  const [png, setPng] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'rendering' | 'failed'>('idle');

  // Dave’s 213 — the hi-fi’s own example, so the render can be compared to it.
  const data: ShareCardData = {
    frames: HIFI_GAME[1].frames,
    players: [
      { name: 'Dave K', score: 213, isYou: true },
      { name: 'Matt', score: 169 },
    ],
    verification: 'verified',
    highlights: ['PB', '200_CLUB'],
    strikes: 7,
    groupName: 'Thursday Pin Club',
    venueName: 'Hollywood Bowl',
    playedAt: '2026-07-03T20:00:00.000Z',
  };

  async function render() {
    if (!node.current) return;
    setState('rendering');
    try {
      const blob = await renderShareCard(node.current);
      setPng(URL.createObjectURL(blob));
      setState('idle');
    } catch {
      setState('failed');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* The rasterised copy must be at its true 540px — `zoom` on an ancestor
          would shrink what the rasteriser sees — so the review copy is zoomed
          and the measured copy sits off-screen at full size. */}
      <div className="pointer-events-none fixed left-[-10000px] top-0" aria-hidden>
        <div ref={node}>
          <ShareCard data={data} />
        </div>
      </div>

      <span className="label-caps">Component</span>
      <div className="overflow-hidden rounded-chip border border-line">
        <div style={{ zoom: 0.62 }}>
          <ShareCard data={data} />
        </div>
      </div>

      <button
        type="button"
        onClick={render}
        disabled={state === 'rendering'}
        className="press rounded-card border border-line bg-well px-4 py-2.5 text-[13.5px] text-text disabled:text-faint"
      >
        {state === 'rendering' ? 'Rendering…' : 'Render the PNG'}
      </button>
      {state === 'failed' && <p className="text-[12px] text-signal">The render failed.</p>}

      {png && (
        <>
          <span className="label-caps">Rasterised · 1080×1350</span>
          <img src={png} alt="The rendered share card" className="rounded-chip border border-line" />
        </>
      )}
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
          className="press rounded-card border border-line bg-well px-4 py-2.5 text-left text-[13.5px] text-text"
        >
          {c.label}
        </button>
      ))}
      <p className="text-[12px] text-faint">
        A quieter celebration can’t interrupt a louder one — tap Perfect game then Strike and nothing happens.
      </p>
    </div>
  );
}

const PILL_OPTIONS: ChipOption[] = [
  { value: 'all', label: 'All' },
  { value: 'thursday', label: 'Thursday Pin Club' },
  { value: 'friday', label: 'Friday Strikes' },
  { value: 'sunday', label: 'Sunday League' },
];
const FILL_2_OPTIONS: ChipOption[] = [
  { value: 'average', label: 'Average' },
  { value: 'high', label: 'High game' },
];
const FILL_3_OPTIONS: ChipOption[] = [
  { value: 'season', label: 'Season' },
  { value: '30d', label: '30 days' },
  { value: 'all', label: 'All time' },
];

/** Both variants: the pill row (feed filter) and the fill segmented control (leaderboard period + metric). */
function ChipRowDemo() {
  const [pill, setPill] = useState('all');
  const [fill2, setFill2] = useState('average');
  const [fill3, setFill3] = useState('season');
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] text-faint">Pill row · 4 options</span>
        <ChipRow label="Feed filter" options={PILL_OPTIONS} value={pill} onChange={setPill} />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] text-faint">Fill segmented · 2 options</span>
        <ChipRow fill label="Rank by" options={FILL_2_OPTIONS} value={fill2} onChange={setFill2} />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] text-faint">Fill segmented · 3 options</span>
        <ChipRow fill label="Period" options={FILL_3_OPTIONS} value={fill3} onChange={setFill3} />
      </div>
    </div>
  );
}

function AvatarSheet() {
  return (
    <div className="flex flex-wrap items-end gap-6">
      <AvatarCase label="24 · initials" size={24} />
      <AvatarCase label="32 · initials" size={32} />
      <AvatarCase label="56 · initials" size={56} />
      <AvatarCase label="24 · photo" size={24} url={DEMO_AVATAR_URL} />
      <AvatarCase label="32 · photo" size={32} url={DEMO_AVATAR_URL} />
      <AvatarCase label="56 · photo" size={56} url={DEMO_AVATAR_URL} />
    </div>
  );
}

function AvatarCase({ label, size, url }: { label: string; size: number; url?: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <Avatar name="Dave K" url={url} size={size} />
      <span className="text-[10px] text-faint">{label}</span>
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
      <div className="rounded-card border border-line bg-panel p-3">{children}</div>
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
        <div className="flex items-center justify-between rounded-card border border-line bg-well px-4 py-3">
          <span className="font-display text-[15px] font-bold">
            Final score <span className="score-text text-phosphor">{scored.total}</span>
          </span>
          <button
            type="button"
            onClick={() => setHistory([[]])}
            className="rounded-chip border border-line px-3 py-1.5 text-[13.5px] text-dim"
          >
            Start again
          </button>
        </div>
      )}
    </div>
  );
}
