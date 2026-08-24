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
          <p className="mt-2">
            Live positions are transient — shown on the spotting screen, never
            stored. They come from community ADS-B networks, tried in this order:
          </p>
          <ul className="mt-2 list-disc pl-5">
            <li>
              <a href="https://adsb.lol/" target="_blank" rel="noopener noreferrer" className="text-sky underline">
                adsb.lol
              </a>{" "}
              — primary. Data © adsb.lol contributors, made available under the{" "}
              <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noopener noreferrer" className="text-sky underline">
                Open Database License (ODbL)
              </a>
              .
            </li>
            <li>
              <a href="https://adsb.fi/" target="_blank" rel="noopener noreferrer" className="text-sky underline">
                adsb.fi
              </a>{" "}
              — fallback. Community-driven, unfiltered ADS-B &amp; MLAT aircraft
              tracking.
            </li>
            <li>
              <a href="https://airplanes.live/" target="_blank" rel="noopener noreferrer" className="text-sky underline">
                airplanes.live
              </a>{" "}
              — fallback. Community-driven ADS-B network.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-ink">Flight data on cards</h2>
          <p className="mt-2">
            The flight details stamped onto a verified sighting — route, operating
            airline, flight number and status — are provided by the{" "}
            <a href="https://fr24api.flightradar24.com/" target="_blank" rel="noopener noreferrer" className="text-sky underline">
              Flightradar24 API
            </a>
            . Aircraft type names are SkyDex&apos;s own compilation of the public
            ICAO type designators.
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
          If you own data shown here and would like a credit changed or removed,
          get in touch.
        </p>
      </div>
    </SectionShell>
  );
}
