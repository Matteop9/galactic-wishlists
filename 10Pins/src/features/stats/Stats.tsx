import { useQuery } from '@tanstack/react-query';
import { StatsSkeleton } from '../../components/Skeleton';
import { useSkeleton } from '../../lib/useSkeleton';
import EmptyState from '../../components/EmptyState';
import { fetchRecentScores, fetchStats, fetchVenueStats } from '../../lib/games';
import type { Profile } from '../../lib/auth';
import { FormGraph, formArrow, Tile } from './StatBits';

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
      <div className="flex flex-col gap-6 px-4 py-6">
        <h1 className="font-display text-[20px] font-bold">Stats</h1>
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
      <div className="px-4 py-6">
        <h1 className="font-display text-[20px] font-bold">Stats</h1>
        <EmptyState
          title="No games yet"
          body="Add your first game and your averages start here."
          action={{ label: 'Add a game', to: '/add/quick' }}
        />
      </div>
    );
  }

  const scores = recent.data ?? [];
  const form = formArrow(scores.map((r) => r.score));
  const framedGames = s.frame_scored_games ?? 0;
  const framesFaced = framedGames * 10;
  const pct = (n: number | null) => (framesFaced > 0 ? `${Math.round(((n ?? 0) / framesFaced) * 100)}%` : '—');

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <h1 className="font-display text-[20px] font-bold">Stats</h1>

      <div className="grid grid-cols-2 gap-3">
        <Tile label="Average" value={s.average != null ? String(s.average) : '—'} />
        <Tile label="High game" value={s.high_game != null ? String(s.high_game) : '—'} />
        <Tile label="Games" value={String(s.games)} />
        <Tile
          label="Form"
          value={form.symbol}
          tone={form.tone}
        />
      </div>

      {scores.length >= 2 && (
        <div className="rounded-card border border-line bg-panel p-4">
          <span className="label-caps">Last {scores.length} games</span>
          <FormGraph scores={scores.map((r) => r.score)} />
        </div>
      )}

      <div className="rounded-card border border-dashed border-line bg-well/50 p-4">
        <span className="label-caps">Frame-level</span>
        {framedGames > 0 ? (
          <>
            <div className="mt-3 flex justify-between">
              <Tile label="Strike %" value={pct(s.strikes)} bare />
              <Tile label="Spare %" value={pct(s.spares)} bare />
              <Tile label="Open %" value={pct(s.opens)} bare />
            </div>
            <p className="mt-3 text-[11px] text-faint">
              Based on {framedGames} frame-scored {framedGames === 1 ? 'game' : 'games'} — quick adds
              don’t count here.
            </p>
          </>
        ) : (
          <div className="mt-3">
            <EmptyState
              tone="inline"
              body="No frame-scored games yet — strike and spare rates need the frames, not just the total."
              action={{ label: 'Scan a scoreboard', to: '/add/scan' }}
            />
          </div>
        )}
      </div>

      {(venues.data ?? []).length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="label-caps">By venue</span>
          {(venues.data ?? []).map((v) => (
            <div
              key={v.venue_id}
              className="flex items-center justify-between rounded-card border border-line bg-panel px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-[14px] text-text">{v.venue_name}</p>
                <p className="text-[11px] text-faint">
                  {v.games} {v.games === 1 ? 'game' : 'games'}
                </p>
              </div>
              <span className="score-text text-[17px] font-bold text-text">{v.average}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
