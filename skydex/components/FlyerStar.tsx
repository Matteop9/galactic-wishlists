/**
 * The Frequent Flyer star — rendered immediately after a handle wherever handles
 * appear (feed cards, comments, leaderboard, profiles), sourced from the
 * frequent_flyer flag the feed views / leaderboard RPC carry. Sits INSIDE the
 * handle's <Link> per the AGENTS.md handle convention (one tap target).
 */
export default function FlyerStar({ show }: { show?: boolean | null }) {
  if (!show) return null;
  return (
    <span
      title="Frequent Flyer"
      aria-label="Frequent Flyer"
      className="ml-0.5 align-baseline text-[0.85em] leading-none text-brass"
    >
      ✦
    </span>
  );
}
