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
import PageHeader from '../../components/PageHeader';
import Strip, { StripTitle } from '../../components/Strip';
import PlayerLink from '../../components/PlayerLink';
import { useSkeleton } from '../../lib/useSkeleton';
import type { Profile } from '../../lib/auth';

const METRIC_OPTIONS = [
  { value: 'average', label: 'By average' },
  { value: 'high', label: 'By high game' },
];

/** The leaderboard grid. Own row loses 3px of the rank column to its ink border so the names stay aligned. */
const GRID = 'grid-cols-[34px_1fr_52px_56px_52px]';
const GRID_OWN = 'grid-cols-[31px_1fr_52px_56px_52px]';

/** Period-aware empty copy: '30d' gets its own line, 'season' and 'all' share the original. */
function leaderboardEmptyBody(period: LeaderboardPeriod): string {
  if (period === '30d') return 'No games in the last 30 days. The table starts with the first one.';
  if (period === 'all') return 'No games yet. The table starts with the first one.';
  return 'No games this season yet. The table starts with the first game.';
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function GroupPage({ profile }: { profile: Profile }) {
  const { id } = useParams<{ id: string }>();
  const group = useQuery({ queryKey: ['group', id], queryFn: () => fetchGroup(id!), enabled: !!id });

  // Lazily initialised from the group's own dates once it loads: the group
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
            <Bar h={40} />
          </Panel>
        </SkeletonScreen>
      </div>
    );
  }
  if (group.isPending) return <div className="px-4 py-6" />;
  if (group.isError || !group.data) {
    return (
      <div className="px-4 py-6">
        <EmptyState
          tone="page"
          title="Group not found"
          body="It may have been deleted, or you may not be a member."
          action={{ label: 'Back to groups', to: '/groups' }}
        />
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

  const rows = sortRows(leaderboard.data ?? [], metric);
  const totalGames = leaderboard.data ? leaderboard.data.reduce((n, r) => n + r.games, 0) : null;

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <div className="px-1">
        <PageHeader
          back="/groups"
          title={g.name}
          sub={
            <>
              {periodLabel(period, g)} · <span className="num">{members.length}</span>{' '}
              {members.length === 1 ? 'player' : 'players'}
              {totalGames !== null && (
                <>
                  {' · '}
                  <span className="num">{totalGames}</span> {totalGames === 1 ? 'game' : 'games'}
                </>
              )}
            </>
          }
          right={
            myRole === 'admin' ? (
              <Link to={`/groups/${g.id}/settings`} className="btn-secondary-sm">
                Settings
              </Link>
            ) : undefined
          }
        />
      </div>

      {/* A group of one with no games isn't a leaderboard, it's an invitation.
          Show that instead of an empty table. */}
      {justCreated ? (
        <EmptyState
          title="Just you so far"
          body="Anyone who joins gets on the leaderboard from their first game."
        >
          <InviteCard code={g.invite_code} />
        </EmptyState>
      ) : (
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-2.5 px-1">
            <ChipRow
              fill
              label="Period"
              options={availablePeriods(g)}
              value={period}
              onChange={(v) => setPeriodChoice(v as LeaderboardPeriod)}
            />
            <ChipRow
              fill
              size="sm"
              label="Rank by"
              options={METRIC_OPTIONS}
              value={metric}
              onChange={(v) => setMetric(v as LeaderboardMetric)}
            />
          </div>

          {showBoard && <LeaderboardSkeleton />}

          {!showBoard && leaderboard.data && leaderboard.data.length === 0 && (
            <EmptyState tone="inline" body={leaderboardEmptyBody(period)} />
          )}

          {!showBoard && rows.length > 0 && (
            <Strip>
              <div className={`grid ${GRID} px-3.5 py-[9px] text-[12px] text-ink-faded`}>
                <span>#</span>
                <span>Player</span>
                <span className="text-right">Games</span>
                <span className="text-right">Average</span>
                <span className="text-right">High</span>
              </div>
              {rows.map((row, i) => (
                <LeaderboardLine
                  key={row.profile_id}
                  row={row}
                  you={row.profile_id === profile.id}
                  metric={metric}
                  myId={profile.id}
                  delay={Math.min(i, 5) * 40}
                />
              ))}
            </Strip>
          )}

          {g.verified_only_leaderboard && (
            <p className="px-1 text-[13px] text-ink-faded">Only photo-verified games count on this table.</p>
          )}
        </section>
      )}

      <MatchDaysSection groupId={g.id} />

      {!justCreated && <InviteCard code={g.invite_code} />}

      <GuestsSection groupId={g.id} />

      <Strip>
        <StripTitle right={<span className="num">{members.length}</span>}>Members</StripTitle>
        {members.map((m) => {
          const you = m.profile_id === profile.id;
          return (
            <PlayerLink
              key={m.profile_id}
              profileId={m.profile_id}
              myId={profile.id}
              className="press flex items-center gap-3 px-3.5 py-[11px]"
            >
              <Avatar name={m.profiles?.display_name ?? '?'} url={m.profiles?.avatar_url} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px]">
                  {m.profiles?.display_name}
                  {you && <span className="text-ink-faded"> you</span>}
                </p>
                <p className="truncate text-[12px] text-ink-faded">
                  @{m.profiles?.username}
                  {m.role === 'admin' ? ' · admin' : ''}
                </p>
              </div>
            </PlayerLink>
          );
        })}
      </Strip>
    </div>
  );
}

function LeaderboardLine({
  row,
  you,
  metric,
  myId,
  delay,
}: {
  row: LeaderboardRow;
  you: boolean;
  metric: LeaderboardMetric;
  myId: string;
  delay: number;
}) {
  const byAverage = metric === 'average';
  return (
    <div
      className={`rise-in grid items-baseline px-3.5 py-[13px] text-[14px] ${
        you ? `${GRID_OWN} border-l-[3px] border-l-ink bg-card` : GRID
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="num text-[16px] font-semibold">{row.rank}</span>
      <PlayerLink profileId={row.profile_id} myId={myId} className="press min-w-0 truncate font-semibold">
        {row.display_name}
        {you && <span className="font-normal text-ink-faded"> you</span>}
      </PlayerLink>
      <span className="num text-right">{row.games}</span>
      <span className={`num text-right ${byAverage ? 'text-[17px] font-semibold text-blue' : ''}`}>
        {row.average.toFixed(1)}
      </span>
      <span className={`num text-right ${byAverage ? '' : 'text-[17px] font-semibold text-red'}`}>
        {row.high_game}
      </span>
    </div>
  );
}

function MatchDaysSection({ groupId }: { groupId: string }) {
  const matchDays = useQuery({
    queryKey: ['group-match-days', groupId],
    queryFn: () => fetchGroupMatchDays(groupId),
  });
  const list = matchDays.data ?? [];

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3 px-1">
        <span className="label">Match days</span>
        <Link to={`/groups/${groupId}/matchday/new`} className="btn-secondary-sm">
          New match day
        </Link>
      </div>
      {list.length === 0 && (
        <EmptyState tone="inline" body="Split into teams, set handicaps, bowl a series." />
      )}
      {list.length > 0 && (
        <Strip>
          {list.map((mdRow) => (
            <Link
              key={mdRow.id}
              to={`/matchday/${mdRow.id}`}
              className="press flex items-center justify-between gap-3 px-3.5 py-[11px] text-[14px]"
            >
              <div className="min-w-0">
                <p className="truncate">{mdRow.match_day_teams.map((t) => t.name).join(' v ') || 'Match day'}</p>
                <p className="truncate text-[12px] text-ink-faded">
                  <span className="num">{shortDate(mdRow.created_at ?? '')}</span>
                  {' · '}
                  {mdRow.best_of === 1 ? (
                    'single game'
                  ) : (
                    <>
                      best of <span className="num">{mdRow.best_of}</span>
                    </>
                  )}
                  {' · '}
                  {mdRow.scoring_mode === 'points' ? 'points' : 'total pins'}
                </p>
              </div>
              <span
                className={`shrink-0 text-[13px] ${
                  mdRow.status === 'active' ? 'font-semibold text-ink' : 'text-ink-faded'
                }`}
              >
                {mdRow.status === 'active' ? 'Live' : mdRow.status}
              </span>
            </Link>
          ))}
        </Strip>
      )}
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
      // Clipboard unavailable: nothing to do, the button stays.
    }
  }

  const list = guests.data ?? [];
  if (list.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5 px-1">
        <span className="label">Guests</span>
        <p className="text-[13px] text-ink-faded">
          Games entered for a guest can be claimed later. Send them a claim link.
        </p>
      </div>
      <Strip>
        {list.map((guest) => {
          const open = (claims.data ?? []).find(
            (c) => c.guest_name.toLowerCase() === guest.name.toLowerCase() && !c.claimed_by,
          );
          return (
            <div
              key={guest.name.toLowerCase()}
              className="flex items-center justify-between gap-3 px-3.5 py-[11px] text-[14px]"
            >
              <div className="min-w-0">
                <p className="truncate">{guest.name}</p>
                <p className="text-[12px] text-ink-faded">
                  <span className="num">{guest.games}</span> {guest.games === 1 ? 'game' : 'games'} as a guest
                </p>
              </div>
              {open ? (
                <button
                  type="button"
                  onClick={() => copyClaimLink(open.claim_code!)}
                  className="btn-secondary-sm shrink-0"
                >
                  {copiedCode === open.claim_code ? 'Link copied' : 'Copy claim link'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => create.mutate(guest.name)}
                  disabled={create.isPending}
                  className="btn-secondary-sm shrink-0"
                >
                  Create claim link
                </button>
              )}
            </div>
          );
        })}
      </Strip>
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
      // Clipboard unavailable (permissions): the code is visible to copy by hand.
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: '10 Pins', text: 'Join our bowling group', url: link });
        return;
      } catch {
        // cancelled, or unsupported: fall back to the clipboard
      }
    }
    await copy(link, 'link');
  }

  return (
    <Strip>
      <StripTitle>Invite people</StripTitle>
      <div className="flex flex-col gap-3 p-3.5">
        <JoinQr url={link} label="Scan to join" />
        <p className="num text-center text-[20px]">{code}</p>
        <button type="button" onClick={share} className="btn-primary">
          Share invite link
        </button>
        <div className="flex justify-center gap-2">
          <button type="button" onClick={() => copy(link, 'link')} className="btn-secondary-sm">
            {copied === 'link' ? 'Link copied' : 'Copy link'}
          </button>
          <button type="button" onClick={() => copy(code, 'code')} className="btn-secondary-sm">
            {copied === 'code' ? 'Code copied' : 'Copy code'}
          </button>
        </div>
      </div>
    </Strip>
  );
}
