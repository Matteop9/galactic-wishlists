import SectionShell from "@/components/SectionShell";

export const metadata = { title: "Attributions — SkyDex" };

export default function AttributionsPage() {
  return (
    <SectionShell
      title="Attributions"
      subtitle="SkyDex is built on open and community data. Credit where it's due."
    >
      <div className="prose-skydex flex flex-col gap-6 text-ink-soft">
        <p>
          The live aircraft, routes and reference photos you see in SkyDex come
          from the projects and people below. We&apos;re grateful to them — please
          support them too.
        </p>

        <section>
          <h2 className="font-display text-lg font-semibold text-ink">Live aircraft data</h2>
          <ul className="mt-2 list-disc pl-5">
            <li>
              <a href="https://airplanes.live/" target="_blank" rel="noopener noreferrer" className="text-sky underline">
                airplanes.live
              </a>{" "}
              — independent, unfiltered ADS-B &amp; MLAT aircraft tracking.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-ink">Flight routes</h2>
          <p className="mt-2">
            Route information (origin, destination and airline) is provided by{" "}
            <a href="https://www.adsbdb.com/" target="_blank" rel="noopener noreferrer" className="text-sky underline">
              adsbdb
            </a>
            . The flight-route data is the work of David Taylor (Edinburgh) and
            Jim Mason (Glasgow).
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-ink">Maps</h2>
          <p className="mt-2">
            The spotting map uses{" "}
            <a href="https://carto.com/basemaps/" target="_blank" rel="noopener noreferrer" className="text-sky underline">
              CARTO
            </a>{" "}
            basemaps, rendered with{" "}
            <a href="https://maplibre.org/" target="_blank" rel="noopener noreferrer" className="text-sky underline">
              MapLibre GL
            </a>
            . Map data ©{" "}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="text-sky underline">
              OpenStreetMap
            </a>{" "}
            contributors.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-ink">Airline logos</h2>
          <p className="mt-2">
            Airline logos shown in the scrapbook are served by the{" "}
            <a href="https://www.kiwi.com/" target="_blank" rel="noopener noreferrer" className="text-sky underline">
              Kiwi.com
            </a>{" "}
            logo service and remain the trademarks of their respective airlines.
            They&apos;re used here only to identify each carrier.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-ink">Reference photos</h2>
          <p className="mt-2">
            Reference photographs of the exact aircraft are sourced from{" "}
            <a href="https://www.planespotters.net/" target="_blank" rel="noopener noreferrer" className="text-sky underline">
              Planespotters.net
            </a>{" "}
            and remain the copyright of their photographers. Each photo shows its
            photographer credit and links back to the original on Planespotters.
          </p>
        </section>

        <p className="text-sm text-ink-faint">
          SkyDex is an early, non-commercial project. If you own data shown here
          and would like a credit changed or removed, get in touch.
        </p>
      </div>
    </SectionShell>
  );
}
