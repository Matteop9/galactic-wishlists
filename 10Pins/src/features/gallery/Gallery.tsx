import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { nextRoll, score, type FrameInput, type Roll } from '../../engine';
import { HIFI_GAME } from '../../engine/fixtures';
import Avatar, { AvatarStack } from '../../components/Avatar';
import CelebrationHost from '../../components/Celebration';
import ChipRow, { type ChipOption } from '../../components/ChipRow';
import CountUp from '../../components/CountUp';
import EmptyState from '../../components/EmptyState';
import FrameEditor from '../../components/FrameEditor';
import Icon, { type IconName } from '../../components/Icon';
import JoinQr from '../../components/JoinQr';
import MobileTabBar from '../../components/MobileTabBar';
import PageHeader from '../../components/PageHeader';
import ReactionBar, { niceOnes } from '../../components/ReactionBar';
import Scorecard, { type ScorecardPlayer } from '../../components/scorecard/Scorecard';
import ShareCard, { type ShareCardData } from '../../components/share/ShareCard';
import Sheet from '../../components/Sheet';
import {
  Bar,
  Circle,
  FeedSkeleton,
  FormSkeleton,
  LaneSkeleton,
  LeaderboardSkeleton,
  ListSkeleton,
  Panel,
  PlayerSkeleton,
  PreviewSkeleton,
  RefetchLine,
  ScorecardSkeleton,
  StatsSkeleton,
} from '../../components/Skeleton';
import Strip, { StatCell, StatTile, StripHeader, StripRow, StripTitle } from '../../components/Strip';
import VerificationBadge from '../../components/VerificationBadge';
import WhatsNewCard from '../../components/WhatsNewCard';
import Wordmark from '../../components/Wordmark';
import { HeadToHeadPanel } from '../players/PlayerPage';
import { gameCelebration, rollCelebration } from '../../lib/celebrate';
import { celebrate } from '../../lib/celebrationStore';
import { RELEASES } from '../../lib/changelog';
import type { HeadToHead } from '../../lib/players';
import { renderShareCard } from '../../lib/shareCard';
import { normaliseTheme, THEME_OPTIONS, useTheme } from '../../lib/theme';

/**
 * The component gallery: every piece of The Scoresheet rendered from fixtures,
 * no auth, at /gallery. This is how a redesign is checked: at 390 and 1024
 * wide, light and dark, before anything ships.
 */

const g = (...frames: Roll[][]): FrameInput[] => frames.map((rolls) => ({ rolls }));

/** The hi-fi fixture names arrive in capitals; the sheet writes them as names. */
function properName(name: string): string {
  return name.charAt(0) + name.slice(1).toLowerCase();
}

const GAME_META = 'Jersey Bowl · Sat 30 Aug';

/** The verified four-player game, every total engine-derived. Dave's 213 is the high game. */
const FULL_PLAYERS: ScorecardPlayer[] = HIFI_GAME.map((p) => ({
  name: properName(p.name),
  frames: p.frames,
  meta: GAME_META,
  tone: p.total === Math.max(...HIFI_GAME.map((q) => q.total)) ? 'hot' : null,
}));

const COMPACT_PLAYERS: ScorecardPlayer[] = FULL_PLAYERS.slice(0, 2);

/**
 * Mid-game state adapted from the hi-fi live-session mock. The mock's frame 4
 * for Matt (7, 3 open) is illegal, so it becomes a legal 7, 2 here; the engine
 * recomputes all cumulatives from rolls anyway.
 */
const LIVE_PLAYERS: ScorecardPlayer[] = [
  { name: 'Matt', frames: g([8, '/'], [9, 0], ['X'], [7, 2], ['X'], ['X'], [9, '/']) },
  { name: 'Dave', frames: g(['X'], ['X'], [8, '/'], [9, 0], ['X'], [7, '/'], [8]), current: true, currentFrame: 6 },
  { name: 'Soph', frames: g([7, 2], [9, '/'], [8, 1], ['X'], [6, 2], [9, 0]) },
  { name: 'Jen', frames: g([8, 0], [7, '/'], [9, 0], ['X'], [7, 2], [8, '/']) },
];

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

const LEADERBOARD: { name: string; games: number; average: number; high: number; you?: boolean }[] = [
  { name: 'Dave', games: 18, average: 176.4, high: 213 },
  { name: 'Matt', games: 22, average: 171.3, high: 203, you: true },
  { name: 'Jen', games: 15, average: 152.9, high: 188 },
  { name: 'Soph', games: 20, average: 139.1, high: 174 },
  { name: 'Dan', games: 9, average: 128.6, high: 158 },
];

export default function Gallery() {
  const [theme, setTheme] = useTheme();

  return (
    <div className="lg:pl-[220px]">
    <div className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col gap-8 px-4 py-6 pb-[110px] lg:max-w-[760px] lg:pb-10">
      <header className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <Wordmark size="sm" />
          <span className="text-[13px] text-ink-faded">Component gallery</span>
        </div>
        <ChipRow
          fill
          size="sm"
          label="Theme"
          options={THEME_OPTIONS}
          value={theme}
          onChange={(v) => setTheme(normaliseTheme(v))}
        />
      </header>

      <Section n="01" title="Scoresheet strip, full" note="The verified four-player game, every total engine-derived. The high game is hot.">
        <Scorecard players={FULL_PLAYERS} variant="full" />
      </Section>

      <Section n="02" title="Feed post, compact" note="Two players at feed size, with the footer line under the strip.">
        <div className="flex flex-col gap-2">
          <Scorecard players={COMPACT_PLAYERS} variant="compact" />
          <div className="flex gap-3.5 px-0.5 text-[13px] text-ink-faded">
            <span className="font-semibold text-red">New high game</span>
            <span>
              <Num text="3 nice ones" />
            </span>
            <span>
              <Num text="2 comments" />
            </span>
          </div>
        </div>
      </Section>

      <Section n="03" title="Totals-only game" note="A quick-added game renders the header row only.">
        <Strip>
          <StripHeader title="Dan" meta="Quick add, totals only · Sat 30 Aug" right={158} />
        </Strip>
      </Section>

      <Section
        n="04"
        title="Live sheet"
        note="The frame being bowled is filled with card and ruled in ink; frames not yet bowled are blank. Play a game below: illegal keys disable before the tap, and Undo is always there."
      >
        <div className="flex flex-col gap-6">
          <Scorecard players={LIVE_PLAYERS} variant="live" />
          <EditorDemo />
        </div>
      </Section>

      <Section
        n="05"
        title="Editing sheet"
        note="Frame 6 fails to reconcile against the photo, so it is filled with card. Every cell is tappable."
      >
        <EditingDemo />
      </Section>

      <Section
        n="06"
        title="Empty states"
        note="The same box a game would fill, with dashes in the frames and the actions inside it. Page, inline and quiet."
      >
        <div className="flex flex-col gap-6">
          <Case label="Page">
            <EmptyState
              title="No games yet"
              body="Scan the scoreboard from your last game, or add the totals by hand."
              action={{ label: 'Scan a scoreboard', to: '/add/scan' }}
              secondary={{ label: 'Quick add', to: '/add/quick' }}
            />
          </Case>
          <Case label="Inline">
            <EmptyState
              tone="inline"
              body="No frame-scored games yet. Strike and spare rates need the frames, not just the total."
              action={{ label: 'Scan a scoreboard', to: '/add/scan' }}
            />
          </Case>
          <Case label="Quiet">
            <EmptyState tone="quiet" body="No comments yet" />
          </Case>
          <Case label="Join QR, ink on light sheet whatever the theme">
            <JoinQr url="https://10pins.vercel.app/join/abc123" label="Scan to join" />
          </Case>
        </div>
      </Section>

      <Section n="07" title="Stat tiles" note="Boxed numerals that count up once. Blue is steady, red is hot, the rest is ink.">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2.5">
            <StatTile value={<CountUp value={171.3} />} label="Season average" tone="steady" />
            <StatTile value={<CountUp value={213} />} label="High game" tone="hot" />
            <StatTile value={<CountUp value={64} />} label="Games played" />
          </div>
          <Strip>
            <div className="flex items-center gap-3 p-3.5">
              <AvatarStack people={[{ name: 'Matt' }, { name: 'Dave' }, { name: 'Soph' }, { name: 'Jen' }]} size={30} />
              <div className="min-w-0 flex-1">
                <p className="num truncate text-[17px] font-semibold">Thursday Pin Club</p>
                <p className="text-[12px] text-ink-faded">
                  <Num text="4 players · Jersey Bowl" />
                </p>
              </div>
              <Icon name="chevron-right" className="size-5 text-ink-faded" />
            </div>
            <div className="grid grid-cols-3 divide-x divide-hairline">
              <StatCell value={64} label="Games" />
              <StatCell value={144} label="Group average" tone="steady" />
              <StatCell value={214} label="High game" tone="hot" />
            </div>
          </Strip>
          <div className="grid grid-cols-3 gap-2.5">
            <StatTile soft value="––" label="Season average" tone="faded" />
          </div>
        </div>
      </Section>

      <Section
        n="08"
        title="Leaderboard table"
        note="Ranked by average. Your own row is the one sanctioned ink border: card fill and a 3px ink left edge."
      >
        <Strip>
          <div className="grid grid-cols-[34px_1fr_52px_56px_52px] px-3.5 py-[9px] text-[12px] text-ink-faded">
            <span />
            <span>Player</span>
            <span className="text-right">Games</span>
            <span className="text-right">Average</span>
            <span className="text-right">High</span>
          </div>
          {LEADERBOARD.map((row, i) => (
            <div
              key={row.name}
              className={`grid grid-cols-[34px_1fr_52px_56px_52px] items-baseline px-3.5 py-[13px] text-[14px] ${
                row.you ? 'bg-card border-l-[3px] border-l-ink' : ''
              }`}
            >
              <span className="num text-[16px] font-semibold">{i + 1}</span>
              <span className="min-w-0 truncate font-semibold">
                {row.name}
                {row.you && <span className="font-normal text-ink-faded"> you</span>}
              </span>
              <span className="num text-right text-ink-faded">{row.games}</span>
              <span className="num text-right text-[17px] font-semibold text-blue">{row.average.toFixed(1)}</span>
              <span className="num text-right">{row.high}</span>
            </div>
          ))}
        </Strip>
      </Section>

      <Section
        n="09"
        title="Chips and segmented controls"
        note="Chips are r2 with an ink fill when active. The segmented control is r1, one ink outline; sm is the secondary picker under a primary one."
      >
        <ChipRowDemo />
      </Section>

      <Section n="10" title="Buttons and fields" note="Buttons are r2, fields r1 with the label above. Disabled uses the token pair, never opacity.">
        <ButtonsAndFields />
      </Section>

      <Section n="11" title="Avatars" note="Initials on a stable fill per name, or the photo. Stacks overlap with a sheet ring.">
        <AvatarSheet />
      </Section>

      <Section n="12" title="Icons" note="One stroke set, 1.75px, 24 viewBox, round caps and joins.">
        <IconSheet />
      </Section>

      <Section
        n="13"
        title="Verification text and reactions"
        note="Provenance is a note in the margin, not a badge. One reaction, a nice one; tap it to toggle yours."
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline gap-4">
            <VerificationBadge status="verified" />
            <VerificationBadge status="live" />
            <VerificationBadge status="unverified" />
          </div>
          <div className="flex items-center gap-4">
            <ReactionBar feedEventId="demo-feed-event" profileId="demo-profile" reactions={[]} />
            <span className="text-[13px] text-ink-faded">
              <Num text={niceOnes(3) ?? ''} />
            </span>
          </div>
        </div>
      </Section>

      <Section n="14" title="Head to head" note="The same component the player page renders, from a static fixture.">
        <HeadToHeadPanel h2h={DEMO_H2H} myName="Matt" theirName="Dave K" myUrl={null} theirUrl={null} />
      </Section>

      <Section
        n="15"
        title="Celebrations"
        note="Fire one and watch it. Tiers 1 and 2 are a small ink toast at the top of the screen and never block a tap; tier 3 is a paper card over a scrim, and only fires at the end of a game."
      >
        <CelebrationDemo />
      </Section>

      <Section
        n="16"
        title="Share card"
        note="The real component at its true size, shown scaled to fit, and the PNG the rasteriser produces from it. Any drift between the two shows up here rather than in a group chat."
      >
        <ShareCardDemo />
      </Section>

      <Section
        n="17"
        title="Skeletons"
        note="Static card-toned blocks in the same strips the real content uses, so nothing jumps when the data lands. No shimmer."
      >
        <div className="flex flex-col gap-6">
          <Case label="Bar, Circle and Panel">
            <Panel className="flex items-center gap-3">
              <Circle size={36} />
              <div className="flex flex-1 flex-col gap-1.5">
                <Bar w="60%" h={13} />
                <Bar w="35%" h={10} />
              </div>
              <Bar w={40} h={20} />
            </Panel>
          </Case>
          <Case label="Refetch line, content already on screen">
            <RefetchLine active />
          </Case>
          <Case label="Feed">
            <FeedSkeleton cards={2} />
          </Case>
          <Case label="Stats">
            <StatsSkeleton />
          </Case>
          <Case label="Leaderboard">
            <LeaderboardSkeleton rows={4} />
          </Case>
          <Case label="List rows">
            <ListSkeleton rows={2} label="Loading" />
          </Case>
          <Case label="Scorecard">
            <ScorecardSkeleton players={1} />
          </Case>
          <Case label="Lane">
            <LaneSkeleton />
          </Case>
          <Case label="Join preview">
            <PreviewSkeleton label="Loading" />
          </Case>
          <Case label="Form">
            <FormSkeleton fields={2} label="Loading" />
          </Case>
          <Case label="Player page">
            <PlayerSkeleton />
          </Case>
        </div>
      </Section>

      <Section n="18" title="What's new card" note="The release note on the feed, shown once per release and dismissible. Rendered from the live release list.">
        <WhatsNewCard release={RELEASES[0]!} older={RELEASES.length - 1} onDismiss={() => {}} />
      </Section>

      <Section n="19" title="Sheet" note="Bottom sheet with r3 top corners and a grab handle. Tap the scrim or press Escape to close.">
        <SheetDemo />
      </Section>

      <Section n="20" title="Page header" note="A sub-screen with back and a line under the title, and a top-level screen with a right action.">
        <div className="flex flex-col gap-6">
          <PageHeader back title="Thursday Pin Club" sub={<Num text="4 players · Jersey Bowl" />} />
          <PageHeader
            title="Groups"
            right={
              <button type="button" className="btn-primary-sm">
                New group
              </button>
            }
          />
        </div>
      </Section>

      <Section
        n="21"
        title="Navigation"
        note="The five-slot tab bar with the ink add disc, fixed to the bottom of this page; from 1024px it becomes the left rail. Both open the add sheet."
      >
        <p className="text-[13px] text-ink-faded">Look at the bottom of the screen, or the left edge on a tablet.</p>
      </Section>

      {/* The gallery renders outside Shell, so it needs its own host and its own tab bar. */}
      <CelebrationHost />
      <MobileTabBar />
    </div>
    </div>
  );
}

/* ------------------------------------------------------------- pieces -- */

function Section({ n, title, note, children }: { n: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <p className="num text-[13px] font-semibold text-ink-faded">
          {n} · {title}
        </p>
        {note && <p className="text-[13px] text-ink-faded">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Case({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="label">{label}</span>
      {children}
    </div>
  );
}

/** The scorer, live: the sheet fills in as you tap the keypad. */
function EditorDemo() {
  const [history, setHistory] = useState<FrameInput[][]>([[]]);
  const frames = history[history.length - 1];
  const scored = score(frames);
  const pos = nextRoll(frames);

  // Settle: flag every frame whose cumulative changed since the last render.
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
        players={[{ name: 'You', frames, current: true, currentFrame: pos?.frame, settleFrames, meta: 'at the line' }]}
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
        <Strip>
          <StripHeader title="Final score" right={scored.total} tone="hot" />
          <div className="p-3.5">
            <button type="button" onClick={() => setHistory([[]])} className="btn-secondary-sm">
              Start again
            </button>
          </div>
        </Strip>
      )}
    </div>
  );
}

/** The editing sheet: tap any frame and the tap is reported below. */
function EditingDemo() {
  const [tapped, setTapped] = useState<number | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <Scorecard
        players={[{ name: 'Matt', frames: HIFI_GAME[0].frames, meta: GAME_META, amberFrames: [5] }]}
        variant="editing"
        onFrameTap={(_player, frame) => setTapped(frame)}
      />
      <p className="text-[13px] text-ink-faded">
        {tapped === null ? 'Tap a frame' : <Num text={`Tapped frame ${tapped + 1}`} />}
      </p>
    </div>
  );
}

const CHIP_OPTIONS: ChipOption[] = [
  { value: 'all', label: 'All' },
  { value: 'thursday', label: 'Thursday Pin Club' },
  { value: 'friday', label: 'Friday Strikes' },
  { value: 'sunday', label: 'Sunday League' },
];
const FILL_MD_OPTIONS: ChipOption[] = [
  { value: 'average', label: 'Average' },
  { value: 'high', label: 'High game' },
];
const FILL_SM_OPTIONS: ChipOption[] = [
  { value: 'season', label: 'Season' },
  { value: '30d', label: '30 days' },
  { value: 'all', label: 'All time' },
];

function ChipRowDemo() {
  const [chip, setChip] = useState('all');
  const [fillMd, setFillMd] = useState('average');
  const [fillSm, setFillSm] = useState('season');
  return (
    <div className="flex flex-col gap-4">
      <Case label="Chips">
        <ChipRow label="Feed filter" options={CHIP_OPTIONS} value={chip} onChange={setChip} />
      </Case>
      <Case label="Segmented, md">
        <ChipRow fill label="Rank by" options={FILL_MD_OPTIONS} value={fillMd} onChange={setFillMd} />
      </Case>
      <Case label="Segmented, sm">
        <ChipRow fill size="sm" label="Period" options={FILL_SM_OPTIONS} value={fillSm} onChange={setFillSm} />
      </Case>
    </div>
  );
}

function ButtonsAndFields() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <button type="button" className="btn-primary">
          Save the game
        </button>
        <button type="button" className="btn-secondary">
          Not now
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-primary-sm">
            Add a player
          </button>
          <button type="button" className="btn-secondary-sm">
            Undo
          </button>
          <button type="button" className="btn-primary-sm" disabled>
            Saving
          </button>
          <button type="button" className="btn-secondary-sm" disabled>
            Undo
          </button>
          <button type="button" className="btn-danger-text">
            Delete the game
          </button>
        </div>
        <button type="button" className="btn-primary" disabled>
          Saving
        </button>
      </div>

      <Strip>
        <div className="flex flex-col gap-4 p-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="gallery-venue">
              Venue
            </label>
            <input id="gallery-venue" className="field" defaultValue="Jersey Bowl" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="gallery-lane">
              Lane <span className="optional">optional</span>
            </label>
            <input id="gallery-lane" className="field" placeholder="Lane number" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="gallery-date">
              Played on
            </label>
            <input id="gallery-date" type="date" className="field" defaultValue="2026-08-30" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="gallery-disabled">
              Group
            </label>
            <input id="gallery-disabled" className="field" value="Thursday Pin Club" disabled readOnly />
          </div>
        </div>
      </Strip>
    </div>
  );
}

const AVATAR_NAMES = ['Matt', 'Dave', 'Soph', 'Jen', 'Dan', 'Sam'];

function AvatarSheet() {
  return (
    <div className="flex flex-col gap-4">
      {[32, 44, 56].map((size) => (
        <Case key={size} label={`${size}px`}>
          <div className="flex flex-wrap items-center gap-3">
            {AVATAR_NAMES.map((name) => (
              <Avatar key={name} name={name} size={size} />
            ))}
            <Avatar name="Photo" url={DEMO_AVATAR_URL} size={size} />
          </div>
        </Case>
      ))}
      <Case label="Stack">
        <AvatarStack
          people={[{ name: 'Matt' }, { name: 'Dave', url: DEMO_AVATAR_URL }, { name: 'Soph' }, { name: 'Jen' }, { name: 'Dan' }]}
        />
      </Case>
    </div>
  );
}

/** Every name in Icon.tsx, in the same order. */
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
  'minus',
  'check',
  'image',
  'camera',
  'pencil',
  'calendar',
  'bolt',
  'share',
  'trash',
  'undo',
  'qr',
  'settings',
  'link',
  'copy',
  'sun',
  'moon',
  'monitor',
  'log-out',
  'user-plus',
  'eye',
  'flag',
  'clock',
  'play',
  'alert',
  'search',
  'refresh',
  'more',
  'flip',
  'inbox',
  'thumbs-up',
];

function IconSheet() {
  return (
    <div className="grid grid-cols-6 gap-y-4">
      {ICON_NAMES.map((name) => (
        <div key={name} className="flex flex-col items-center gap-1.5">
          <Icon name={name} className="size-6 text-ink" />
          <span className="text-center text-[12px] leading-tight text-ink-faded">{name}</span>
        </div>
      ))}
    </div>
  );
}

/** Each button fires a real celebration through the real store. */
function CelebrationDemo() {
  const cases: { label: string; fire: () => void }[] = [
    { label: 'Strike, tier 1', fire: () => celebrate(rollCelebration(g(), g(['X']))) },
    { label: 'Turkey, tier 2', fire: () => celebrate(rollCelebration(g(['X'], ['X']), g(['X'], ['X'], ['X']), 'Dave')) },
    { label: 'First game, tier 2', fire: () => celebrate(gameCelebration(['FIRST_GAME'])) },
    { label: 'New personal best, tier 3', fire: () => celebrate(gameCelebration(['PB'], 'demo-game')) },
    {
      label: 'Personal best, 200 club and turkey, tier 3',
      fire: () => celebrate(gameCelebration(['PB', '200_CLUB', 'TURKEY'], 'demo-game')),
    },
    { label: 'Perfect game, tier 3', fire: () => celebrate(gameCelebration(['300_CLUB', 'PB', 'TURKEY'], 'demo-game')) },
  ];

  return (
    <div className="flex flex-col gap-3">
      <Strip>
        {cases.map((c) => (
          <StripRow key={c.label} onClick={c.fire} right={<Icon name="play" className="size-4 text-ink-faded" />}>
            <Num text={c.label} />
          </StripRow>
        ))}
      </Strip>
      <p className="text-[13px] text-ink-faded">
        A quieter celebration cannot interrupt a louder one: fire Perfect game then Strike and nothing happens.
      </p>
    </div>
  );
}

/** Plain text with every run of digits set in the numeral face. */
function Num({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\d+(?:\.\d+)?)/).map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="num">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

/** The card, and the PNG of the card. */
function ShareCardDemo() {
  const node = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [png, setPng] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'rendering' | 'failed'>('idle');

  // The card is 540px wide by design; the preview scales it to the column.
  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / 540);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Dave's 213, the hi-fi's own example, so the render can be compared to it.
  const data: ShareCardData = {
    frames: HIFI_GAME[1].frames,
    players: [
      { name: 'Dave', score: 213, isYou: true },
      { name: 'Matt', score: 169 },
    ],
    verification: 'verified',
    highlights: ['PB', '200_CLUB'],
    strikes: 7,
    groupName: 'Thursday Pin Club',
    venueName: 'Jersey Bowl',
    playedAt: '2026-08-30T20:00:00.000Z',
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
      {/* The rasterised copy must be at its true 540px, so it sits off-screen
          at full size while the review copy is the one that is scaled. */}
      <div className="pointer-events-none fixed left-[-10000px] top-0" aria-hidden>
        <div ref={node}>
          <ShareCard data={data} />
        </div>
      </div>

      <Case label="Component">
        <div ref={frame} className="relative w-full overflow-hidden" style={{ height: scale ? 675 * scale : undefined }}>
          {scale > 0 && (
            <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${scale})` }}>
              <ShareCard data={data} />
            </div>
          )}
        </div>
      </Case>

      <button type="button" onClick={render} disabled={state === 'rendering'} className="btn-secondary">
        {state === 'rendering' ? 'Rendering' : 'Render the PNG'}
      </button>
      {state === 'rendering' && <span aria-hidden className="progress-line block" />}
      {state === 'failed' && <p className="text-[13px] text-red">The render failed.</p>}

      {png && (
        <Case label="Rasterised, 1080 by 1350">
          <img src={png} alt="The rendered share card" className="block w-full" />
        </Case>
      )}
    </div>
  );
}

function SheetDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary self-start">
        Open the sheet
      </button>
      {open && (
        <Sheet onClose={() => setOpen(false)} label="Add a game" title="Add a game" className="gap-3">
          <Strip>
            <StripTitle right="Three ways in">How do you want to add it</StripTitle>
            <StripRow onClick={() => setOpen(false)} right={<Icon name="chevron-right" className="size-5 text-ink-faded" />}>
              Scan the scoreboard
            </StripRow>
            <StripRow onClick={() => setOpen(false)} right={<Icon name="chevron-right" className="size-5 text-ink-faded" />}>
              Score it live
            </StripRow>
            <StripRow onClick={() => setOpen(false)} right={<Icon name="chevron-right" className="size-5 text-ink-faded" />}>
              Quick add the totals
            </StripRow>
          </Strip>
          <button type="button" onClick={() => setOpen(false)} className="press py-2 text-center text-[13px] text-ink-faded">
            Not now
          </button>
        </Sheet>
      )}
    </>
  );
}
