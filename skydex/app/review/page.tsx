import { redirect } from "next/navigation";
import SectionShell from "@/components/SectionShell";
import ReviewQueue from "@/components/ReviewQueue";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Community review — SkyDex" };

export default async function ReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/review");

  return (
    <SectionShell
      title="Community review"
      subtitle="Help keep the feed honest — check other spotters' photos really show an aircraft. Photos are anonymous and picked at random; two net no-votes send a photo to the admins for a final decision, and two net yes-votes approve it."
    >
      <ReviewQueue />
    </SectionShell>
  );
}
