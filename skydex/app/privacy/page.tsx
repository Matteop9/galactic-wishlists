import SectionShell from "@/components/SectionShell";

export const metadata = { title: "Privacy — SkyDex" };

export default function PrivacyPage() {
  return (
    <SectionShell title="Privacy" subtitle="What SkyDex collects, why, and your rights.">
      <div className="prose-skydex flex flex-col gap-5 text-ink-soft">
        <section>
          <h2 className="font-display text-lg font-semibold text-ink">What we collect</h2>
          <ul className="mt-2 list-disc pl-5">
            <li>Your email address, from your Google or Apple account (to identify your sign-in).</li>
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
            scrapbook and — for verified sightings — on the public feed. Your username and
            sighting statistics (spot counts, aircraft types, carriers, airports and rarity
            scores derived from your verified sightings) appear on the public leaderboards,
            which every SkyDex user can see.
            <strong className="text-ink"> Your precise location is never shown publicly</strong>;
            the feed and leaderboards exclude exact coordinates.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-ink">Your consent, and your choice</h2>
          <p className="mt-2">
            Nothing is published until you agree to it. The first time you open SkyDex
            signed in, the app asks for your explicit agreement to your username, photos
            and sighting scores being uploaded and shown on the public feed and the global
            leaderboards — you can decline and sign out instead. Until you agree, you are
            not on the leaderboards at all.
          </p>
          <p className="mt-2">
            You can also leave the global leaderboards at any time from{" "}
            <a href="/settings" className="text-sky underline">Settings → Public sharing</a>;
            switching it off removes your scores from the public boards immediately.
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
        <section>
          <h2 className="font-display text-lg font-semibold text-ink">Questions</h2>
          <p className="mt-2">
            Anything unclear, or a request about your data? Write to the team from the{" "}
            <a href="/support" className="text-sky underline">support page</a> — messages go
            straight to the SkyDex support queue, and we reply to the email address you leave
            there (usually within two working days).
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
