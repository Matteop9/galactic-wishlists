import SectionShell from "@/components/SectionShell";
import { Skeleton } from "@/components/Loading";

// Instant skeleton for the feed — mirrors the real page: scope chips, then a
// column of photo cards.
export default function FeedLoading() {
  return (
    <SectionShell
      title="Global feed"
      subtitle="Verified sightings from spotters around the world. Tap Comments to join in."
    >
      <div className="-mt-3 mb-6 flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-paper-edge">
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
