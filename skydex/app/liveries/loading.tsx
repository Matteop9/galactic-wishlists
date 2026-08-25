import { Skeleton } from "@/components/Loading";

// Instant skeleton for the special-liveries checklist.
export default function LiveriesLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-paper-edge pb-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">Special Liveries</h1>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="mt-6 flex flex-col gap-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-10 w-full" />
      </div>
      <ul className="mt-6 divide-y divide-paper-edge rounded-lg border border-paper-edge">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="ml-auto h-3 w-16" />
          </li>
        ))}
      </ul>
    </main>
  );
}
