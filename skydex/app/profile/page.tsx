import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";

export const dynamic = "force-dynamic";

// /profile is kept for backwards-compatible links. Your public profile now lives
// at /u/[handle]; account management moved to /settings.
export default async function ProfileRedirect() {
  const { handle } = await getViewer();
  redirect(handle ? `/u/${handle}` : "/settings");
}
