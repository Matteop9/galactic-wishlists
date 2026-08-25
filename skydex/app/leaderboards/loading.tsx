import SectionShell from "@/components/SectionShell";
import { Skeleton } from "@/components/Loading";

// Instant skeleton for the leaderboards — board tabs, then ranked rows.
export default function LeaderboardsLoading() {
  return (
    <SectionShell
      title="Leaderboards"
      subtitle="The top spotters in the world — by spots, types, carriers, airports and rarity."
    >
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="mt-5 overflow-hidden rounded-lg border border-paper-edge">
        <ul className="divide-y divide-paper-edge">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-2.5">
              <Skeleton className="h-4 w-6" />
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="ml-auto h-4 w-10" />
            </li>
          ))}
        </ul>
      </div>
    </SectionShell>
  );
}
