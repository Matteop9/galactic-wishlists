import { SectionLoading, Skeleton } from "@/components/Loading";

export default function TicketsLoading() {
  return (
    <SectionLoading title="Tickets">
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
      <Skeleton className="mt-4 h-44 w-full rounded-lg" />
    </SectionLoading>
  );
}
