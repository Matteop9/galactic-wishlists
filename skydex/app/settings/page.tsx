import { cookies } from "next/headers";
import SectionShell from "@/components/SectionShell";
import ProfileForm from "@/components/ProfileForm";
import DangerZone from "@/components/DangerZone";
import FeedbackForm from "@/components/FeedbackForm";
import DevModeToggle from "@/components/DevModeToggle";
import OpenGuideButton from "@/components/OpenGuideButton";
import AvatarEditor from "@/components/AvatarEditor";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings — SkyDex" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("handle, home_airport, is_admin, avatar_seed, avatar_updated_at")
    .eq("id", user!.id)
    .single();

  const devMode =
    Boolean(profile?.is_admin) && (await cookies()).get("skydex_dev")?.value === "1";

  const canEditAvatar =
    !profile?.avatar_updated_at ||
    // eslint-disable-next-line react-hooks/purity -- server component, evaluated per request
    Date.now() - new Date(profile.avatar_updated_at).getTime() >= 24 * 60 * 60 * 1000;

  return (
    <SectionShell title="Settings">
      {!profile?.handle && (
        <div className="mb-6 rounded-lg border border-sky bg-sky-tint/50 p-4 text-sm text-ink">
          Pick a username so other spotters can see who caught what on the feed.
        </div>
      )}

      <AvatarEditor
        initialSeed={profile?.avatar_seed ?? profile?.handle ?? user!.email ?? "skydex"}
        canEditNow={canEditAvatar}
        admin={Boolean(profile?.is_admin)}
      />

      <dl className="rounded-lg border border-paper-edge text-sm">
        <div className="flex justify-between px-4 py-3">
          <dt className="text-ink-soft">Email</dt>
          <dd className="font-mono">{user!.email}</dd>
        </div>
        <div className="flex justify-between border-t border-paper-edge px-4 py-3">
          <dt className="text-ink-soft">Username</dt>
          <dd className="font-mono">{profile?.handle ? `@${profile.handle}` : "— not set"}</dd>
        </div>
      </dl>

      <ProfileForm
        initialHandle={profile?.handle ?? ""}
        initialHome={profile?.home_airport ?? ""}
      />

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-paper-edge p-4">
        <div>
          <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-ink">
            How it works
          </h2>
          <p className="mt-1 text-sm text-ink-soft">A quick refresher on spotting.</p>
        </div>
        <OpenGuideButton />
      </div>

      {profile?.is_admin && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-paper-edge p-4">
          <div>
            <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-ink">
              Developer
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Show unverified sightings and moderation controls.
            </p>
          </div>
          <DevModeToggle enabled={devMode} />
        </div>
      )}

      <FeedbackForm userId={user!.id} />
      <DangerZone />

      <form action="/auth/signout" method="post" className="mt-6">
        <button className="sd-btn sd-btn--log w-full justify-center">Sign out</button>
      </form>
    </SectionShell>
  );
}
