import Link from "next/link";
import { getUser } from "@/lib/auth";
import { RELEASES, CURRENT_VERSION } from "@/lib/releases";

export default async function Home() {
  const user = await getUser();

  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col px-6 py-14">
      <section className="flex flex-col items-center text-center">
        {/* swinging luggage-tag hero — hangs from a pin, idle sway */}
        <div className="relative flex h-44 justify-center">
          <span
            aria-hidden
            className="absolute top-1 left-1/2 z-10 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[#8A6A3E]"
          />
          <div className="sd-tag-swing mt-2 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-tag.svg"
              alt="SkyDex"
              className="h-44 w-auto drop-shadow-[0_12px_24px_rgba(40,30,15,0.24)]"
            />
          </div>
        </div>

        <p className="mt-2 font-mono text-xs uppercase tracking-[0.22em] text-stamp">
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

        <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <Link href={user ? "/spot" : "/login"} className="sd-btn sd-btn--capture">
            {user ? "Start spotting" : "Get started"}
          </Link>
          <Link href="/feed" className="sd-btn sd-btn--log">
            See the feed
          </Link>
        </div>

        {/* 01 / 02 / 03 — how it works */}
        <ol className="mt-12 grid w-full max-w-xl grid-cols-3 gap-3 border-t border-paper-edge pt-6">
          {[
            { n: "01", t: "Spot & shoot a real aircraft" },
            { n: "02", t: "We verify it really happened" },
            { n: "03", t: "Collect the stamped card" },
          ].map((s) => (
            <li key={s.n} className="text-center">
              <div className="font-display text-2xl font-bold text-stamp">{s.n}</div>
              <div className="mt-1 text-sm leading-snug text-ink-soft">{s.t}</div>
            </li>
          ))}
        </ol>
      </section>

      {/* scroll-margin clears the sticky-free header when the banner deep-links here */}
      <section id="whats-new" className="mt-20 scroll-mt-6">
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
