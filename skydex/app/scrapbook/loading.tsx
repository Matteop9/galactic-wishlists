import { Skeleton } from "@/components/Loading";

// Instant skeleton for the scrapbook — header, the completion hero
// (three wheels + rarity bar), then the book tabs.
export default function ScrapbookLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-paper-edge pb-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">Scrapbook</h1>
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="mt-6 rounded-lg border border-paper-edge p-5">
        <div className="flex flex-wrap items-center justify-evenly gap-x-6 gap-y-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <Skeleton className="h-[120px] w-[120px] rounded-full" />
              <Skeleton className="h-3 w-14" />
            </div>
          ))}
          <div className="flex flex-col items-center gap-1.5">
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-3 w-14" />
          </div>
        </div>
        <div className="mt-6 border-t border-paper-edge pt-4">
          <Skeleton className="h-3 w-full rounded-full" />
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-3 w-20" />
            ))}
          </div>
        </div>
      </div>

      <Skeleton className="mt-9 h-4 w-24" />
      <div className="mt-4 flex flex-wrap gap-2.5">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-11 w-28" />
        ))}
      </div>

      <div className="mt-9 grid gap-4 sm:grid-cols-2">
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
