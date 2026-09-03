import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Strip from '../../components/Strip';
import { claimGuestGames } from '../../lib/friends';

function gameDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/**
 * /claim/:code: a guest claims their games. The claim RPC does everything in
 * one transaction and returns the games list for the confirmation view, so the
 * guest name and group are only known once the claim has gone through.
 */
export default function GuestClaim() {
  const { code } = useParams<{ code: string }>();
  const queryClient = useQueryClient();

  const claim = useMutation({
    mutationFn: () => claimGuestGames(code!),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  if (claim.isSuccess) {
    const r = claim.data;
    const n = r.games.length;
    return (
      <div className="mx-auto flex min-h-[70dvh] w-full max-w-[390px] flex-col justify-center gap-4 px-4 py-10">
        <Strip>
          <div className="flex flex-col gap-0.5 px-3.5 py-3">
            <p className="num text-[22px] font-semibold leading-tight">{r.guest_name}</p>
            <p className="text-[14px] text-ink-faded">
              <span className="num">{n}</span> {n === 1 ? 'game' : 'games'} as a guest in {r.group_name}, now yours
            </p>
          </div>
          {r.games.map((g) => (
            <Link
              key={g.game_id}
              to={`/games/${g.game_id}`}
              className="press flex items-baseline justify-between gap-3 px-3.5 py-3 text-[14px]"
            >
              <span className="min-w-0 truncate text-ink-faded">
                <span className="num">{gameDate(g.played_at)}</span>
                {g.venue_name ? ` · ${g.venue_name}` : ''}
              </span>
              <span className="num shrink-0 text-[18px] font-semibold">{g.final_score ?? '–'}</span>
            </Link>
          ))}
          <div className="p-3.5">
            <Link to="/stats" className="btn-primary w-full">
              See your stats
            </Link>
          </div>
        </Strip>
        <p className="text-center text-[13px] text-ink-faded">
          These games now count in your stats and on the group leaderboard.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70dvh] w-full max-w-[390px] flex-col justify-center gap-4 px-4 py-10">
      <Strip>
        <div className="flex flex-col gap-0.5 px-3.5 py-3">
          <h1 className="num text-[22px] font-semibold leading-tight">Claim your guest games</h1>
          <p className="text-[14px] text-ink-faded">Games recorded under a guest name in a group</p>
        </div>
        <div className="p-3.5">
          <button
            type="button"
            onClick={() => claim.mutate()}
            disabled={claim.isPending}
            className="btn-primary w-full"
          >
            {claim.isPending ? 'Claiming…' : 'Claim these games'}
          </button>
        </div>
      </Strip>
      <p className="text-center text-[13px] text-ink-faded">
        This link works once. It moves every game under that guest name to your account and adds you
        to the group.
      </p>
      {claim.isError && (
        <p className="text-center text-[13px] text-red" role="alert">
          That claim link doesn’t work. It may already have been used.
        </p>
      )}
    </div>
  );
}
