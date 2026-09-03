import Link from "next/link";
import SectionShell from "@/components/SectionShell";
import SupportForm from "@/components/SupportForm";

export const metadata = {
  title: "Support — SkyDex",
  description: "Get help with SkyDex: common questions and a direct line to the team.",
};

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "My capture wouldn't verify — why?",
    a: (
      <>
        SkyDex checks your GPS position, compass heading and phone tilt against live
        flight data at the moment you capture. Verification fails when the aircraft
        isn&apos;t where you&apos;re pointing (or isn&apos;t broadcasting its position),
        when your compass is uncalibrated (wave the phone in a figure-of-eight), or when
        GPS accuracy is poor. It works best outdoors with a clear view of the sky.
      </>
    ),
  },
  {
    q: "The camera is black or frozen.",
    a: (
      <>
        Make sure SkyDex has camera permission (iOS Settings → SkyDex → Camera). If the
        preview freezes after switching apps, leave the Spot screen and come back — the
        camera restarts automatically.
      </>
    ),
  },
  {
    q: "How do I report a photo or comment, or block someone?",
    a: (
      <>
        Every photo and comment has a Report option. You can block any spotter from
        their profile or one of their comments; manage your blocked list under
        Settings → Blocked spotters.
      </>
    ),
  },
  {
    q: "How do I export or delete my data?",
    a: (
      <>
        From <Link href="/settings" className="text-sky underline">Settings</Link>{" "}
        you can export everything you&apos;ve created as a file, or permanently delete your
        account with every sighting, photo and comment tied to it. Deletion is
        immediate and irreversible.
      </>
    ),
  },
  {
    q: "Can I keep my scores off the global leaderboards?",
    a: (
      <>
        Yes. SkyDex asks for your explicit agreement before anything of yours is
        published, and the leaderboards are optional: untick &ldquo;Include me on the
        global leaderboards&rdquo; when you first sign in, or switch it off later under{" "}
        <Link href="/settings" className="text-sky underline">Settings → Public sharing</Link>.
        Your scores then stop appearing on the public boards.
      </>
    ),
  },
  {
    q: "What does SkyDex do with my location?",
    a: (
      <>
        Location is used only to verify sightings and is never shown publicly — see the{" "}
        <Link href="/privacy" className="text-sky underline">privacy policy</Link> for
        the full picture.
      </>
    ),
  },
];

export default function SupportPage() {
  return (
    <SectionShell
      title="Support"
      subtitle="Stuck, curious, or found a bug? Answers below — or write to the team directly."
    >
      <div className="flex flex-col gap-8 text-ink-soft">
        <section>
          <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-ink">
            Common questions
          </h2>
          <dl className="mt-3 flex flex-col gap-4">
            {FAQS.map((f) => (
              <div key={f.q} className="rounded-lg border border-paper-edge p-4">
                <dt className="font-semibold text-ink">{f.q}</dt>
                <dd className="mt-1 text-sm">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-ink">
            Contact the team
          </h2>
          <p className="mt-1 text-sm">
            Send us a question, a problem, or an idea. Messages land in the SkyDex
            support queue, which the team that builds SkyDex reads directly — no
            account needed, and we reply to the email address you leave here, usually
            within two working days. Signed-in spotters can also use the feedback box
            in Settings.
          </p>
          <div className="mt-3">
            <SupportForm />
          </div>
        </section>

        <p className="text-sm text-ink-faint">
          See also the <Link href="/privacy" className="text-sky underline">privacy policy</Link>{" "}
          and <Link href="/terms" className="text-sky underline">terms</Link>.
        </p>
      </div>
    </SectionShell>
  );
}
