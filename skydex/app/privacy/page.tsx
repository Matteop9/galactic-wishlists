import SectionShell from "@/components/SectionShell";

export const metadata = { title: "Privacy — SkyDex" };

export default function PrivacyPage() {
  return (
    <SectionShell title="Privacy" subtitle="What SkyDex collects, why, and your rights.">
      <div className="prose-skydex flex flex-col gap-5 text-ink-soft">
        <section>
          <h2 className="font-display text-lg font-semibold text-ink">What we collect</h2>
          <ul className="mt-2 list-disc pl-5">
            <li>Your email address (to sign you in via a magic link).</li>
            <li>Your chosen username and optional home airport.</li>
            <li>
              For each capture: the photo you take, the time, your GPS location, and the
              compass heading and tilt at that moment — used to verify the sighting.
            </li>
            <li>Comments you post.</li>
          </ul>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-ink">How it&apos;s used</h2>
          <p className="mt-2">
            Location, time and camera direction are used only to confirm you could genuinely
            have seen the aircraft. Your photo, username and aircraft details appear on your
            scrapbook and — for verified sightings — on the public feed.
            <strong className="text-ink"> Your precise location is never shown publicly</strong>;
            the feed excludes exact coordinates.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-ink">Storage</h2>
          <p className="mt-2">
            Data is stored with Supabase in the EU (London region). Photos are kept in object
            storage; everything else in an EU Postgres database.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-ink">Your rights</h2>
          <p className="mt-2">
            From your <a href="/settings" className="text-sky underline">settings</a> you can
            export all of your data as a file, or permanently delete your account and every
            sighting, photo and comment tied to it.
          </p>
        </section>
        <p className="text-sm text-ink-faint">
          SkyDex is an early, non-commercial project. This notice will be expanded before any
          wider launch.
        </p>
      </div>
    </SectionShell>
  );
}
