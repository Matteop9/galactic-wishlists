import SectionShell from "@/components/SectionShell";
import LeaderboardBoard from "@/components/LeaderboardBoard";
import { getViewer } from "@/lib/auth";

export const metadata = { title: "Leaderboards — SkyDex" };

export default async function LeaderboardsPage() {
  const { user } = await getViewer();

  return (
    <SectionShell
      title="Leaderboards"
      subtitle="The top spotters in the world — by spots, types, carriers, airports and rarity."
    >
      <LeaderboardBoard currentUserId={user?.id ?? null} />
    </SectionShell>
  );
}
