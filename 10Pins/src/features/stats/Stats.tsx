import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { StatsSkeleton } from '../../components/Skeleton';
import { useSkeleton } from '../../lib/useSkeleton';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import Strip, { StatCell, StatTile, StripTitle } from '../../components/Strip';
import CountUp from '../../components/CountUp';
import { fetchRecentScores, fetchStats, fetchVenueStats } from '../../lib/games';
import type { Profile } from '../../lib/auth';
import { EmptyGraph, FormGraph } from './StatBits';

const DASHES = '––';

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function monthDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function Stats({ profile }: { profile: Profile }) {
  const stats = useQuery({ queryKey: ['stats', profile.id], queryFn: () => fetchStats(profile.id) });
  const recent = useQuery({
    queryKey: ['recent-scores', profile.id],
    queryFn: () => fetchRecentScores(profile.id),
  });
  const venues = useQuery({
    queryKey: ['venue-stats', profile.id],
    queryFn: () => fetchVenueStats(profile.id),
  });
  const showSkeleton = useSkeleton(stats.isPending);

  if (showSkeleton) {
    return (
      <div className="flex flex-col gap-5 px-4 py-6">
        <div className="px-1">
          <PageHeader title="Your stats" />
        </div>
        <StatsSkeleton />
      </div>
    );
  }

  // Pending but past the skeleton window (a fast cache hit): render nothing
  // rather than the empty state, which would read as "no games yet".
  if (stats.isPending) return <div className="px-4 py-6" />;

  const s = stats.data;
  if (!s || !s.games) {
    return (
      <div className="flex flex-col gap-3.5 px-4 py-6">
        <div className="px-1">
          <PageHeader title="Your stats" />
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          <StatTile soft tone="faded" value={DASHES} label="Average" />
          <StatTile soft tone="faded" value={DASHES} label="High game" />
          <StatTile soft tone="faded" value={0} label="Games played" />
        </div>
        <Strip soft>
          <div className="flex flex-col gap-2 p-3.5">
            <span className="label">Average over time</span>
            <EmptyGraph />
            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-[13px] text-ink-faded">Your first game draws the line.</p>
              <Link to="/add/quick" className="btn-secondary-sm shrink-0">
                Add a game
              </Link>
            </div>
          </div>
        </Strip>
      </div>
    );
  }

  const scores = recent.data ?? [];
  const seriesScores = scores.map((r) => r.score);
  const seriesHigh = seriesScores.length > 0 ? Math.max(...seriesScores) : null;
  const latest = [...scores].reverse().slice(0, 5);
  const framedGames = s.frame_scored_games ?? 0;
  const framesFaced = framedGames * 10;
  const pct = (n: number | null) =>
    framesFaced > 0 ? `${Math.round(((n ?? 0) / framesFaced) * 100)}%` : DASHES;
  const venueRows = venues.data ?? [];

  return (
    <div className="flex flex-col gap-3.5 px-4 py-6">
      <div className="px-1">
        <PageHeader title="Your stats" />
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <StatTile tone="steady" value={s.average != null ? <CountUp value={s.average} /> : DASHES} label="Average" />
        <StatTile tone="hot" value={s.high_game != null ? <CountUp value={s.high_game} /> : DASHES} label="High game" />
        <StatTile value={<CountUp value={s.games} />} label="Games played" />
      </div>

      {scores.length >= 2 && (
        <Strip>
          <StripTitle
            right={
              <>
                Last <span className="num">{scores.length}</span> games
              </>
            }
          >
            Average over time
          </StripTitle>
          <div className="flex flex-col gap-1.5 px-3.5 pb-3 pt-3">
            <FormGraph scores={seriesScores} />
            <div className="flex justify-between text-[12px] text-ink-faded">
              <span className="num">{monthDay(scores[0]!.playedAt)}</span>
              <span className="num">{monthDay(scores[scores.length - 1]!.playedAt)}</span>
              {seriesHigh != null && (
                <span className="num font-semibold text-red">{seriesHigh} high</span>
              )}
            </div>
          </div>
        </Strip>
      )}

      {latest.length > 0 && (
        <Strip>
          <StripTitle>Recent games</StripTitle>
          {latest.map((r, i) => (
            <div
              key={`${r.playedAt}-${i}`}
              className="flex items-baseline justify-between gap-3 px-3.5 py-[11px] text-[14px]"
            >
              <span className="num min-w-0 truncate">{shortDate(r.playedAt)}</span>
              <span
                className={`num shrink-0 text-[18px] font-semibold ${
                  s.high_game != null && r.score === s.high_game ? 'text-red' : ''
                }`}
              >
                {r.score}
              </span>
            </div>
          ))}
        </Strip>
      )}

      {framedGames > 0 ? (
        <Strip>
          <StripTitle>Frame by frame</StripTitle>
          <div className="grid grid-cols-3 divide-x divide-hairline">
            <StatCell value={pct(s.strikes)} label="Strike rate" tone="hot" />
            <StatCell value={pct(s.spares)} label="Spare rate" tone="steady" />
            <StatCell value={pct(s.opens)} label="Open rate" />
          </div>
          <p className="px-3.5 py-2 text-[12px] text-ink-faded">
            Based on <span className="num">{framedGames}</span> frame-scored {framedGames === 1 ? 'game' : 'games'}.
            Quick adds don’t count here.
          </p>
        </Strip>
      ) : (
        <EmptyState
          tone="inline"
          title="Frame by frame"
          body="No frame-scored games yet. Strike and spare rates need the frames, not just the total."
          action={{ label: 'Scan a scoreboard', to: '/add/scan' }}
        />
      )}

      {venueRows.length > 0 && (
        <Strip>
          <StripTitle>By venue</StripTitle>
          {venueRows.map((v) => (
            <div
              key={v.venue_id}
              className="flex items-baseline justify-between gap-3 px-3.5 py-[11px] text-[14px]"
            >
              <div className="min-w-0">
                <p className="truncate">{v.venue_name}</p>
                <p className="text-[12px] text-ink-faded">
                  <span className="num">{v.games}</span> {v.games === 1 ? 'game' : 'games'}
                </p>
              </div>
              <span className="num shrink-0 text-[17px] font-semibold text-blue">{v.average}</span>
            </div>
          ))}
        </Strip>
      )}
    </div>
  );
}
