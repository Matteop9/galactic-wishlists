import { Skeleton } from "@/components/Loading";

// Instant skeleton for a spotter profile — cover band with the overlapping
// avatar, stat tiles, then sighting cards.
export default function ProfileLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8">
      <Skeleton className="h-32 w-full rounded-lg sm:h-40" />
      <div className="-mt-9 flex items-end gap-4 px-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="flex flex-col gap-2 pb-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-paper-edge">
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
