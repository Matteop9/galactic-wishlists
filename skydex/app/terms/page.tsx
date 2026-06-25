import SectionShell from "@/components/SectionShell";

export const metadata = { title: "Terms — SkyDex" };

export default function TermsPage() {
  return (
    <SectionShell title="Terms" subtitle="The deal for using SkyDex.">
      <div className="flex flex-col gap-5 text-ink-soft">
        <section>
          <h2 className="font-display text-lg font-semibold text-ink">Spot safely and legally</h2>
          <p className="mt-2">
            Never trespass, enter restricted or airfield areas, or put yourself or others at
            risk to get a photo. Don&apos;t photograph in places where doing so is prohibited.
            Follow all local laws.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-ink">Your content</h2>
          <p className="mt-2">
            You keep ownership of the photos you take. By posting, you grant SkyDex permission
            to display them in the app and feed. Don&apos;t upload anything unlawful, offensive,
            or that isn&apos;t a genuine aircraft photo.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-ink">Moderation</h2>
          <p className="mt-2">
            We may remove any sighting or comment that breaks these terms. Verification is a
            best-effort game mechanic, not a guarantee of accuracy.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-ink">No warranty</h2>
          <p className="mt-2">
            SkyDex is an early, non-commercial project provided “as is”, without warranty, and
            may change or be unavailable at any time.
          </p>
        </section>
      </div>
    </SectionShell>
  );
}
