import { SectionLoading, Skeleton } from "@/components/Loading";

export default function ReviewLoading() {
  return (
    <SectionLoading
      title="Community review"
      subtitle="Help keep the feed honest — check other spotters' photos really show an aircraft. Photos are anonymous and picked at random; two net no-votes send a photo to the admins for a final decision, and two net yes-votes approve it."
    >
      <Skeleton className="aspect-[4/3] w-full rounded-lg" />
      <div className="mt-4 flex gap-3">
        <Skeleton className="h-12 w-40" />
        <Skeleton className="h-12 w-40" />
      </div>
    </SectionLoading>
  );
}
