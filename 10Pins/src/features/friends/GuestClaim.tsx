import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { claimGuestGames } from '../../lib/friends';

/**
 * /claim/:code — a guest claims their games. The claim RPC does everything in
 * one transaction and returns the games list for the confirmation view.
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
    return (
      <div className="flex flex-col gap-6 px-4 py-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="label-caps">Welcome to {r.group_name}</span>
          <h1 className="font-display text-[24px] font-bold">
            {r.games.length} {r.games.length === 1 ? 'game' : 'games'} claimed
          </h1>
          <p className="max-w-[280px] text-[13.5px] text-dim">
            Every game recorded for “{r.guest_name}” is now yours — they count in your stats and on
            the group leaderboard.
          </p>
        </div>

        {r.games.length > 0 && (
          <div className="flex flex-col gap-2 rounded-2xl border border-line bg-panel p-4">
            {r.games.map((g) => (
              <Link key={g.game_id} to={`/games/${g.game_id}`} className="flex items-baseline justify-between">
                <span className="text-[13px] text-dim">
                  {new Date(g.played_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {g.venue_name ? ` · ${g.venue_name}` : ''}
                </span>
                <span className="score-text text-[15px] font-bold text-text">{g.final_score ?? '—'}</span>
              </Link>
            ))}
          </div>
        )}

        <Link
          to="/stats"
          className="rounded-[10px] bg-phosphor py-3.5 text-center font-display text-[15px] font-bold text-ink"
        >
          See your stats
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-10">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="label-caps">Claim your games</span>
        <h1 className="font-display text-[24px] font-bold">Were you the guest?</h1>
        <p className="max-w-[280px] text-[13.5px] text-dim">
          This link transfers every game recorded under a guest name in the group to your account,
          and adds you to the group. It can only be used once.
        </p>
      </div>

      <button
        type="button"
        onClick={() => claim.mutate()}
        disabled={claim.isPending}
        className="rounded-[10px] bg-phosphor py-3.5 font-display text-[15px] font-bold text-ink shadow-glow-amber disabled:opacity-60"
      >
        {claim.isPending ? 'Claiming…' : 'Yes — claim my games'}
      </button>
      {claim.isError && (
        <p className="text-center text-[13px] text-signal" role="alert">
          That claim link doesn't work — it may already have been used.
        </p>
      )}
    </div>
  );
}
