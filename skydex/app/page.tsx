import Link from "next/link";
import { getUser } from "@/lib/auth";
import { RELEASES, CURRENT_VERSION } from "@/lib/releases";

export default async function Home() {
  const user = await getUser();

  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col px-6 py-20">
      <section className="flex flex-col items-center text-center">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-stamp">
          The authentic plane-spotting collection · v{CURRENT_VERSION}
        </p>
        <h1 className="mt-4 text-balance font-display text-5xl font-bold leading-[1.05] tracking-tight text-ink sm:text-6xl">
          Real planes. Real photos. Really verified.
        </h1>
        <p className="mt-5 max-w-xl text-pretty text-lg text-ink-soft">
          Photograph an aircraft you can actually see. SkyDex checks you genuinely
          saw it — using your location, the time, and where your camera was
          pointing — and turns it into a card in your personal logbook of the sky.
        </p>

        <div className="mt-9 flex items-center gap-3">
          <Link href={user ? "/spot" : "/login"} className="sd-btn sd-btn--capture">
            {user ? "Start spotting" : "Get started"}
          </Link>
          <Link href="/feed" className="sd-btn sd-btn--log">
            See the feed
          </Link>
        </div>
      </section>

      <section className="mt-20">
        <h2 className="border-b border-paper-edge pb-2 font-display text-xl font-semibold uppercase tracking-wide text-ink-soft">
          Release log
        </h2>
        <ol className="mt-6 flex flex-col gap-8">
          {RELEASES.map((r) => (
            <li key={r.version} className="flex flex-col gap-2">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-2xl font-bold text-ink">
                  v{r.version}
                </span>
                <span className="font-mono text-xs uppercase tracking-widest text-ink-faint">
                  {r.date}
                </span>
              </div>
              <ul className="ml-1 flex flex-col gap-1.5 border-l-2 border-paper-edge pl-4 text-ink-soft">
                {r.changes.map((c, i) => (
                  <li key={i} className="text-sm">
                    {c}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
