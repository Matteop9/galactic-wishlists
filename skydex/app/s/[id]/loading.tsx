import { Skeleton } from "@/components/Loading";

// Instant skeleton for a shared sighting — the standalone card silhouette.
export default function SightingLoading() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 py-12">
      <div className="mx-auto max-w-xs overflow-hidden rounded-lg border border-paper-edge">
        <Skeleton className="aspect-[4/3] w-full rounded-none" />
        <div className="flex flex-col gap-2 p-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
    </main>
  );
}
