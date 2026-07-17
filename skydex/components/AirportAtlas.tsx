import AirportCode from "@/components/AirportCode";
import { airportInfo } from "@/lib/airports";

// The scrapbook's airport atlas — one merged tally of every airport seen on a
// route leg, grouped continent → country → airport with totals at each layer.
// Codes missing from the lookup gather under a trailing "Other" bucket so
// nothing a spotter has logged silently disappears.

export type AirportTally = { code: string; dep: number; dest: number };

type CountryGroup = { country: string; airports: AirportTally[]; total: number };
type ContinentGroup = {
  continent: string;
  countries: CountryGroup[];
  airports: number;
  total: number;
};

const total = (t: AirportTally) => t.dep + t.dest;

function group(airports: AirportTally[]): ContinentGroup[] {
  const byContinent = new Map<string, Map<string, AirportTally[]>>();
  for (const t of airports) {
    const info = airportInfo(t.code);
    const continent = info?.continent ?? "Other";
    const country = info?.country ?? "Unknown";
    const countries = byContinent.get(continent) ?? new Map<string, AirportTally[]>();
    countries.set(country, [...(countries.get(country) ?? []), t]);
    byContinent.set(continent, countries);
  }

  const sum = (list: AirportTally[]) => list.reduce((n, t) => n + total(t), 0);
  const groups = [...byContinent.entries()].map(([continent, countries]) => {
    const countryGroups: CountryGroup[] = [...countries.entries()]
      .map(([country, list]) => ({
        country,
        airports: list.sort((a, b) => total(b) - total(a) || a.code.localeCompare(b.code)),
        total: sum(list),
      }))
      .sort((a, b) => b.total - a.total || a.country.localeCompare(b.country));
    return {
      continent,
      countries: countryGroups,
      airports: countryGroups.reduce((n, c) => n + c.airports.length, 0),
      total: countryGroups.reduce((n, c) => n + c.total, 0),
    };
  });

  // "Other" always sinks to the bottom regardless of its total.
  return groups.sort(
    (a, b) =>
      Number(a.continent === "Other") - Number(b.continent === "Other") ||
      b.total - a.total ||
      a.continent.localeCompare(b.continent),
  );
}

export default function AirportAtlas({ airports }: { airports: AirportTally[] }) {
  if (airports.length === 0) return null;

  return (
    <div className="mt-4 space-y-3">
      {group(airports).map((c) => (
        <details key={c.continent} className="group rounded-lg border border-paper-edge bg-paper-deep">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-2.5 [&::-webkit-details-marker]:hidden">
            <span className="font-display text-sm font-semibold uppercase tracking-wide text-ink">
              {c.continent}
            </span>
            <span className="font-mono text-xs text-ink-soft">
              {c.airports} {c.airports === 1 ? "airport" : "airports"} · {c.total}
            </span>
            <span
              aria-hidden
              className="ml-auto text-ink-soft transition-transform group-open:rotate-180"
            >
              ▾
            </span>
          </summary>
          <div className="space-y-2 border-t border-paper-edge px-4 pb-3 pt-3">
            {c.countries.map((k) => (
              <details key={k.country} className="group/country rounded-md border border-paper-edge bg-paper">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
                  <span className="font-display text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    {k.country}
                  </span>
                  <span className="font-mono text-[11px] text-ink-faint">
                    {k.airports.length} · {k.total}
                  </span>
                  <span
                    aria-hidden
                    className="ml-auto text-xs text-ink-faint transition-transform group-open/country:rotate-180"
                  >
                    ▾
                  </span>
                </summary>
                <div className="flex flex-wrap gap-2 border-t border-paper-edge px-3 pb-2.5 pt-2.5">
                  {k.airports.map((t) => (
                    <AirportCode
                      key={t.code}
                      code={t.code}
                      count={total(t)}
                      detail={`↑${t.dep} dep · ↓${t.dest} dest`}
                      className="rounded-md border border-sky bg-sky-tint px-2.5 py-1 font-mono text-xs font-semibold text-sky-deep"
                    />
                  ))}
                </div>
              </details>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
