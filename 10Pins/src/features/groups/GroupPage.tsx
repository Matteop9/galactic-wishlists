import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchGroup, fetchLeaderboard, type LeaderboardRow } from '../../lib/groups';
import {
  availablePeriods,
  defaultPeriod,
  periodLabel,
  sortRows,
  type LeaderboardMetric,
  type LeaderboardPeriod,
} from '../../lib/leaderboard';
import { createGuestClaim, fetchGroupClaims, fetchGroupGuests } from '../../lib/friends';
import { fetchGroupMatchDays } from '../../lib/matchday';
import { Bar, LeaderboardSkeleton, Panel, SkeletonScreen } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import JoinQr from '../../components/JoinQr';
import ChipRow from '../../components/ChipRow';
import Avatar from '../../components/Avatar';
import PlayerLink from '../../components/PlayerLink';
import { useSkeleton } from '../../lib/useSkeleton';
import type { Profile } from '../../lib/auth';

const METRIC_OPTIONS = [
  { value: 'average', label: 'Average' },
  { value: 'high', label: 'High game' },
];

/** Period-aware empty copy — '30d' gets its own line, 'season' and 'all' share the original. */
function leaderboardEmptyBody(period: LeaderboardPeriod): string {
  if (period === '30d') return 'No games in the last 30 days — the table starts with the first one.';
  if (period === 'all') return 'No games yet — the table starts with the first one.';
  return 'No games this season yet — the table starts with the first game.';
}

export default function GroupPage({ profile }: { profile: Profile }) {
  const { id } = useParams<{ id: string }>();
  const group = useQuery({ queryKey: ['group', id], queryFn: () => fetchGroup(id!), enabled: !!id });

  // Lazily initialised from the group's own dates once it loads — the group
  // query can resolve after first render, so this can't just be useState(defaultPeriod(g)).
  // (Reads group.data directly, not the narrowed `g` below, so it works before the query settles.)
  const [periodChoice, setPeriodChoice] = useState<LeaderboardPeriod | null>(null);
  const [metric, setMetric] = useState<LeaderboardMetric>('average');
  const period = periodChoice ?? (group.data ? defaultPeriod(group.data) : 'season');

  const leaderboard = useQuery({
    queryKey: ['leaderboard', id, period],
    queryFn: () => fetchLeaderboard(id!, period),
    enabled: !!id,
    placeholderData: keepPreviousData,
  });
  const showPage = useSkeleton(group.isPending);
  const showBoard = useSkeleton(leaderboard.isPending);

  if (showPage) {
    return (
      <div className="flex flex-col gap-5 px-4 py-6">
        <SkeletonScreen label="Loading the group" className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Bar w={168} h={22} />
            <Bar w={120} h={11} />
          </div>
          <Bar w={84} h={10} />
          <LeaderboardSkeleton bare />
          <Panel className="flex flex-col gap-2">
            <Bar w={92} h={10} />
            <Bar h={40} className="rounded-control" />
          </Panel>
        </SkeletonScreen>
      </div>
    );
  }
  if (group.isPending) return <div className="px-4 py-6" />;
  if (group.isError || !group.data) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
        <h1 className="font-display text-[20px] font-bold">Group not found</h1>
        <Link to="/groups" className="text-[13.5px] text-phosphor">
          Back to groups
        </Link>
      </div>
    );
  }

  const g = group.data;
  const members = [...(g.group_members ?? [])].sort((a, b) =>
    (a.joined_at ?? '').localeCompare(b.joined_at ?? ''),
  );
  const myRole = members.find((m) => m.profile_id === profile.id)?.role;

  const justCreated =
    members.length <= 1 && !showBoard && (leaderboard.data?.length ?? 0) === 0;

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate font-display text-[20px] font-bold">{g.name}</h1>
          <p className="text-[12px] text-faint">
            {periodLabel(period, g)}
            {g.verified_only_leaderboard ? ' · verified games only' : ''}
          </p>
        </div>
        {myRole === 'admin' && (
          <Link
            to={`/groups/${g.id}/settings`}
            className="shrink-0 rounded-control border border-line bg-panel px-3 py-2 text-[13px] font-bold text-text"
          >
            Settings
          </Link>
        )}
      </header>

      {/* A group of one with no games isn’t a leaderboard, it’s an invitation
          (design §5.6: "Empty (just created) — QR + Share invite link"). Show
          that instead of an empty table. */}
      {justCreated ? (
        <EmptyState
          title="Just you so far"
          body="Anyone who joins gets on the leaderboard from their first game."
        >
          <div className="w-full pt-1">
            <InviteCard code={g.invite_code} />
          </div>
        </EmptyState>
      ) : (
      <section className="flex flex-col gap-2">
        <span className="label-caps">
          Leaderboard · {metric === 'average' ? 'average' : 'high game'}
        </span>
        <ChipRow
          fill
          label="Period"
          options={availablePeriods(g)}
          value={period}
          onChange={(v) => setPeriodChoice(v as LeaderboardPeriod)}
        />
        <ChipRow
          fill
          label="Rank by"
          options={METRIC_OPTIONS}
          value={metric}
          onChange={(v) => setMetric(v as LeaderboardMetric)}
        />
        {showBoard && <LeaderboardSkeleton />}
        {!showBoard && leaderboard.data && leaderboard.data.length === 0 && (
          <EmptyState tone="inline" body={leaderboardEmptyBody(period)} />
        )}
        {sortRows(leaderboard.data ?? [], metric).map((row, i) => (
          <div
            key={row.profile_id}
            className="rise-in"
            style={{ animationDelay: `${Math.min(i, 5) * 40}ms` }}
          >
            <LeaderboardLine row={row} you={row.profile_id === profile.id} metric={metric} myId={profile.id} />
          </div>
        ))}
      </section>
      )}

      <MatchDaysSection groupId={g.id} />

      {!justCreated && <InviteCard code={g.invite_code} />}

      <GuestsSection groupId={g.id} />

      <section className="flex flex-col gap-2">
        <span className="label-caps">Members · {members.length}</span>
        {members.map((m) => (
          <PlayerLink
            key={m.profile_id}
            profileId={m.profile_id}
            myId={profile.id}
            className="press flex items-center justify-between gap-3 rounded-card border border-line bg-panel px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <Avatar name={m.profiles?.display_name ?? '?'} url={m.profiles?.avatar_url} size={32} />
              <div>
                <p className="text-[14px] text-text">
                  {m.profiles?.display_name}
                  {m.profile_id === profile.id ? ' (you)' : ''}
                </p>
                <p className="text-[11px] text-faint">@{m.profiles?.username}</p>
              </div>
            </div>
            {m.role === 'admin' && <span className="label-caps text-phosphor">Admin</span>}
          </PlayerLink>
        ))}
      </section>
    </div>
  );
}

function LeaderboardLine({
  row,
  you,
  metric,
  myId,
}: {
  row: LeaderboardRow;
  you: boolean;
  metric: LeaderboardMetric;
  myId: string;
}) {
  const big = metric === 'average' ? row.average.toFixed(1) : row.high_game;
  const subLabel =
    metric === 'average' ? `high ${row.high_game}` : `avg ${row.average.toFixed(1)}`;
  return (
    <PlayerLink
      profileId={row.profile_id}
      myId={myId}
      className={`press flex items-center gap-3 rounded-card border px-4 py-3 ${
        you ? 'border-phosphor/40 bg-phosphor/5' : 'border-line bg-panel'
      }`}
    >
      <span className="score-text w-6 text-[15px] font-bold text-dim">{row.rank}</span>
      <Avatar name={row.display_name} url={row.avatar_url} size={32} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] text-text">{row.display_name}</p>
        <p className="text-[11px] text-faint">
          {row.games} {row.games === 1 ? 'game' : 'games'} · {subLabel}
        </p>
      </div>
      <Movement rank={row.rank} prev={row.prev_rank} />
      <span className="score-text text-[17px] font-bold text-text">{big}</span>
    </PlayerLink>
  );
}

/** ▲ climbed, ▼ dropped, — held; · for a new entry this week. */
function Movement({ rank, prev }: { rank: number; prev: number | null }) {
  if (prev == null) return <span className="w-4 text-center text-[12px] text-faint">·</span>;
  if (prev > rank) return <span className="w-4 text-center text-[12px] text-success">▲</span>;
  if (prev < rank) return <span className="w-4 text-center text-[12px] text-signal">▼</span>;
  return <span className="w-4 text-center text-[12px] text-faint">—</span>;
}

function MatchDaysSection({ groupId }: { groupId: string }) {
  const matchDays = useQuery({
    queryKey: ['group-match-days', groupId],
    queryFn: () => fetchGroupMatchDays(groupId),
  });

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="label-caps">Match days</span>
        <Link
          to={`/groups/${groupId}/matchday/new`}
          className="rounded-control bg-phosphor px-3 py-1.5 font-display text-[12px] font-bold text-ink"
        >
          New match day
        </Link>
      </div>
      {(matchDays.data ?? []).length === 0 && (
        <p className="rounded-card border border-dashed border-line bg-well/50 p-4 text-[13.5px] text-dim">
          Split into teams, set handicaps, bowl a series — start your first match day.
        </p>
      )}
      {(matchDays.data ?? []).map((mdRow) => (
        <Link
          key={mdRow.id}
          to={`/matchday/${mdRow.id}`}
          className="flex items-center justify-between rounded-card border border-line bg-panel px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-[14px] text-text">
              {mdRow.match_day_teams.map((t) => t.name).join(' v ') || 'Match day'}
            </p>
            <p className="text-[11px] text-faint">
              {new Date(mdRow.created_at ?? '').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ·{' '}
              {mdRow.best_of === 1 ? 'single game' : `best of ${mdRow.best_of}`} ·{' '}
              {mdRow.scoring_mode === 'points' ? 'points' : 'total pins'}
            </p>
          </div>
          <span className={`label-caps ${mdRow.status === 'active' ? 'text-phosphor' : 'text-faint'}`}>
            {mdRow.status === 'active' ? 'Live' : mdRow.status}
          </span>
        </Link>
      ))}
    </section>
  );
}

/**
 * Guests with games in this group: create a one-use claim link so the person
 * behind the guest name can take their games (and join the group).
 */
function GuestsSection({ groupId }: { groupId: string }) {
  const queryClient = useQueryClient();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const guests = useQuery({ queryKey: ['group-guests', groupId], queryFn: () => fetchGroupGuests(groupId) });
  const claims = useQuery({ queryKey: ['group-claims', groupId], queryFn: () => fetchGroupClaims(groupId) });

  const create = useMutation({
    mutationFn: (guestName: string) => createGuestClaim(groupId, guestName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['group-claims', groupId] }),
  });

  async function copyClaimLink(code: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/claim/${code}`);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // Clipboard unavailable — nothing to do, the button stays.
    }
  }

  const list = guests.data ?? [];
  if (list.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <span className="label-caps">Guests</span>
      <p className="text-[11px] text-faint">
        Games entered for a guest can be claimed later — send them a claim link.
      </p>
      {list.map((guest) => {
        const open = (claims.data ?? []).find(
          (c) => c.guest_name.toLowerCase() === guest.name.toLowerCase() && !c.claimed_by,
        );
        return (
          <div
            key={guest.name.toLowerCase()}
            className="flex items-center justify-between gap-3 rounded-card border border-line bg-panel px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-[14px] text-text">{guest.name}</p>
              <p className="text-[11px] text-faint">
                {guest.games} {guest.games === 1 ? 'game' : 'games'} as a guest
              </p>
            </div>
            {open ? (
              <button
                type="button"
                onClick={() => copyClaimLink(open.claim_code!)}
                className="rounded-control border border-line bg-well px-3 py-1.5 text-[12px] font-bold text-text"
              >
                {copiedCode === open.claim_code ? 'Link copied' : 'Copy claim link'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => create.mutate(guest.name)}
                disabled={create.isPending}
                className="rounded-control bg-phosphor px-3 py-1.5 font-display text-[12px] font-bold text-ink"
              >
                Create claim link
              </button>
            )}
          </div>
        );
      })}
    </section>
  );
}

function InviteCard({ code }: { code: string | null }) {
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);
  if (!code) return null;
  const link = `${window.location.origin}/join/${code}`;

  async function copy(text: string, kind: 'link' | 'code') {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard unavailable (permissions) — the code is visible to copy by hand.
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: '10 Pins', text: 'Join our bowling group', url: link });
        return;
      } catch {
        // cancelled, or unsupported — fall back to the clipboard
      }
    }
    await copy(link, 'link');
  }

  return (
    <section className="flex flex-col gap-3 rounded-card border border-line bg-panel p-4">
      <span className="label-caps">Invite your crew</span>
      <JoinQr url={link} label="Scan to join" />
      <p className="text-center font-mono text-[15px] tracking-wider text-text">{code}</p>
      <button type="button" onClick={share} className="btn-primary">
        Share invite link
      </button>
      <div className="flex gap-2">
        <button type="button" onClick={() => copy(link, 'link')} className="flex-1 btn-secondary">
          {copied === 'link' ? 'Link copied' : 'Copy link'}
        </button>
        <button type="button" onClick={() => copy(code, 'code')} className="flex-1 btn-secondary">
          {copied === 'code' ? 'Code copied' : 'Copy code'}
        </button>
      </div>
    </section>
  );
}
