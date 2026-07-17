import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RARITY_TIERS } from "@/lib/rarity";
import BookSlot, { type Slot } from "@/components/BookSlot";

export const dynamic = "force-dynamic";

type BookKind = "type" | "airline" | "rarity";

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<{ book?: string; view?: string }>;
}) {
  const sp = await searchParams;
  const kind: BookKind =
    sp.book === "airline" || sp.book === "rarity" ? sp.book : "type";
  const missingOnly = sp.view === "missing";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: sightingData }, { data: typeData }, { data: airlineData }, { data: coverData }] =
    await Promise.all([
      supabase
        .from("sightings")
        .select("id, aircraft_type, airline, rarity, photo_path, verified, captured_at")
        .eq("user_id", user!.id)
        .order("captured_at", { ascending: false }),
      supabase.from("aircraft_types").select("code, display_name, name, rarity"),
      supabase.from("airlines").select("name"),
      supabase.from("book_covers").select("kind, key, sighting_id").eq("user_id", user!.id),
    ]);

  const sightings = (sightingData ?? []) as {
    id: string;
    aircraft_type: string | null;
    airline: string | null;
    rarity: string;
    photo_path: string | null;
    verified: boolean;
  }[];
  const types = (typeData ?? []) as {
    code: string;
    display_name: string | null;
    name: string;
    rarity: string;
  }[];
  const airlines = (airlineData ?? []) as { name: string }[];
  const covers = (coverData ?? []) as { kind: string; key: string; sighting_id: string }[];

  const pub = (path: string | null) =>
    path ? supabase.storage.from("sightings").getPublicUrl(path).data.publicUrl : null;

  // Every photographed sighting per type / airline, newest first — feeds both
  // the default cover (latest) and the tap-to-choose picker.
  const typeOptions = new Map<string, { id: string; url: string }[]>();
  const airlineOptions = new Map<string, { id: string; url: string }[]>();
  const addOption = (map: Map<string, { id: string; url: string }[]>, key: string, opt: { id: string; url: string }) => {
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(opt);
  };
  for (const s of sightings) {
    if (!s.photo_path) continue;
    const opt = { id: s.id, url: pub(s.photo_path)! };
    if (s.aircraft_type) addOption(typeOptions, s.aircraft_type, opt);
    if (s.airline) addOption(airlineOptions, s.airline, opt);
  }

  // Chosen covers (kind+key → sighting id). Rarity book reuses the type covers.
  const coverId = new Map<string, string>();
  for (const c of covers) coverId.set(`${c.kind}:${c.key}`, c.sighting_id);

  function makeSlot(
    coverKind: "type" | "airline",
    key: string,
    label: string,
    rarity: string | null,
    options: { id: string; url: string }[],
  ): Slot {
    const chosen = coverId.get(`${coverKind}:${key}`);
    const cover = (chosen && options.find((o) => o.id === chosen)) || options[0] || null;
    return {
      key,
      label,
      rarity,
      photo: cover?.url ?? null,
      options,
      coverId: chosen && options.some((o) => o.id === chosen) ? chosen : null,
    };
  }

  // Sections: the Type book is one alphabetical run; the Rarity book is the
  // same universe grouped by tier (that's the difference between the two);
  // the Airline book is alphabetical brands.
  let sections: { heading: string | null; stamp: string | null; slots: Slot[] }[] = [];
  let title = "";
  if (kind === "airline") {
    title = "Airline Book";
    sections = [
      {
        heading: null,
        stamp: null,
        slots: [...airlines]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((a) => makeSlot("airline", a.name, a.name, null, airlineOptions.get(a.name) ?? [])),
      },
    ];
  } else if (kind === "rarity") {
    title = "Rarity Book";
    sections = RARITY_TIERS.map((tier) => ({
      heading: tier,
      stamp: `/stamps/${tier}.svg`,
      slots: types
        .filter((t) => t.rarity === tier)
        .sort((a, b) => (a.display_name ?? a.code).localeCompare(b.display_name ?? b.code))
        .map((t) =>
          makeSlot("type", t.code, t.display_name ?? t.name, t.rarity, typeOptions.get(t.code) ?? []),
        ),
    })).filter((s) => s.slots.length > 0);
  } else {
    title = "Type Book";
    sections = [
      {
        heading: null,
        stamp: null,
        slots: [...types]
          .sort((a, b) => (a.display_name ?? a.code).localeCompare(b.display_name ?? b.code))
          .map((t) =>
            makeSlot("type", t.code, t.display_name ?? t.name, t.rarity, typeOptions.get(t.code) ?? []),
          ),
      },
    ];
  }

  const allSlots = sections.flatMap((s) => s.slots);
  const collected = allSlots.filter((s) => s.photo).length;
  const pct = allSlots.length ? Math.round((collected / allSlots.length) * 100) : 0;
  const shownSections = sections
    .map((s) => ({ ...s, shown: missingOnly ? s.slots.filter((x) => !x.photo) : s.slots }))
    .filter((s) => s.shown.length > 0);

  // Luggage-tag tab: squared, left dot coloured by book kind.
  const TABS: { k: BookKind; label: string; dot: string }[] = [
    { k: "type", label: "Type", dot: "var(--color-ink)" },
    { k: "airline", label: "Airline", dot: "var(--color-brass)" },
    { k: "rarity", label: "Rarity", dot: "var(--color-stamp)" },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink pb-3">
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-ink">
          {title}
        </h1>
        <Link href="/scrapbook" className="font-mono text-xs text-ink-soft hover:text-ink">
          ← list view
        </Link>
      </div>

      {/* tag tabs */}
      <div className="mt-5 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = kind === t.k;
          return (
            <Link
              key={t.k}
              href={`/books?book=${t.k}`}
              className={`relative rounded-[4px] border py-2 pl-6 pr-3.5 font-display text-sm font-semibold uppercase tracking-wide transition-colors ${
                active
                  ? "border-ink bg-ink text-paper"
                  : "border-paper-edge bg-paper-deep text-ink-soft hover:border-ink"
              }`}
            >
              <span
                aria-hidden
                className="absolute left-2.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full"
                style={
                  active
                    ? { background: "var(--color-paper)" }
                    : { border: `1.5px solid ${t.dot}` }
                }
              />
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* progress + All/Missing filter */}
      <div className="mt-6 flex items-center justify-between font-mono text-xs uppercase tracking-wide text-ink-soft">
        <span>
          {collected} of {allSlots.length} collected
        </span>
        <span className="flex gap-1.5">
          {([
            { v: "all", label: "All" },
            { v: "missing", label: "Missing" },
          ] as const).map(({ v, label }) => {
            const on = missingOnly ? v === "missing" : v === "all";
            return (
              <Link
                key={v}
                href={`/books?book=${kind}${v === "missing" ? "&view=missing" : ""}`}
                className={`rounded-full border px-2.5 py-0.5 text-[10px] tracking-[0.06em] ${
                  on ? "border-ink bg-ink text-paper" : "border-paper-edge text-ink-soft hover:border-ink"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded border border-paper-edge bg-paper-deep">
        <div
          className="h-full bg-gradient-to-r from-sky to-brass"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* the page */}
      <div className="mt-6 rounded-lg border border-paper-edge bg-paper p-4 shadow-inner sm:p-6">
        {shownSections.length === 0 ? (
          <p className="py-8 text-center font-mono text-xs uppercase tracking-wide text-ink-faint">
            {missingOnly ? "Nothing missing — book complete." : "Nothing here yet."}
          </p>
        ) : (
          <div className="flex flex-col gap-7">
            {shownSections.map((section) => (
              <section key={section.heading ?? "all"}>
                {section.heading && (
                  <div className="mb-3 flex items-center justify-between border-b border-paper-edge pb-1.5">
                    <span className="flex items-center gap-2">
                      {section.stamp && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={section.stamp} alt="" className="h-6 w-6" />
                      )}
                      <h2 className="font-display text-lg font-bold uppercase tracking-wide text-ink">
                        {section.heading}
                      </h2>
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-wide text-ink-faint">
                      {section.slots.filter((s) => s.photo).length} of {section.slots.length}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {section.shown.map((slot) => (
                    <BookSlot key={slot.key} slot={slot} kind={kind} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
