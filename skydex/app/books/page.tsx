import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RARITY_RANK } from "@/lib/rarity";

export const dynamic = "force-dynamic";

type BookKind = "type" | "airline" | "rarity";

type Slot = {
  key: string;
  label: string;
  rarity: string | null;
  photo: string | null;
  verified: boolean;
};

// One ruled slot in the book. Collected = photo + small rarity stamp; empty =
// dashed box with a diagonal hatch and a mono "NOT YET SPOTTED".
function BookSlot({ slot }: { slot: Slot }) {
  if (!slot.photo) {
    return (
      <div className="overflow-hidden rounded-lg border border-dashed border-paper-edge bg-paper-deep">
        <div className="flex aspect-[4/3] items-center justify-center bg-[repeating-linear-gradient(45deg,rgba(216,201,168,0.3)_0_8px,transparent_8px_16px)]">
          <span className="text-center font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-ink-faint">
            Not yet
            <br />
            spotted
          </span>
        </div>
        <div className="px-2 py-1.5 text-center font-mono text-[10px] uppercase tracking-wide text-ink-faint">
          {slot.label}
        </div>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-paper-edge bg-white shadow-[0_4px_12px_rgba(32,38,43,0.1)]">
      <div className="relative aspect-[4/3] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={slot.photo} alt={slot.label} className="h-full w-full object-cover" />
        {slot.rarity && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/stamps/${slot.rarity}.svg`}
            alt={slot.rarity}
            className="absolute bottom-1 right-1 h-8 w-8"
          />
        )}
      </div>
      <div className="px-2 py-1.5 text-center font-mono text-[10px] font-semibold uppercase tracking-wide text-ink">
        {slot.label}
      </div>
    </div>
  );
}

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
  const [{ data: sightingData }, { data: typeData }, { data: airlineData }] =
    await Promise.all([
      supabase
        .from("sightings")
        .select("aircraft_type, airline, rarity, photo_path, verified, captured_at")
        .eq("user_id", user!.id)
        .order("captured_at", { ascending: false }),
      supabase.from("aircraft_types").select("code, display_name, name, rarity"),
      supabase.from("airlines").select("name"),
    ]);

  const sightings = (sightingData ?? []) as {
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

  const pub = (path: string | null) =>
    path ? supabase.storage.from("sightings").getPublicUrl(path).data.publicUrl : null;

  // First photographed sighting per type / airline.
  const typePhoto = new Map<string, string>();
  const airlinePhoto = new Map<string, string>();
  for (const s of sightings) {
    if (!s.photo_path) continue;
    if (s.aircraft_type && !typePhoto.has(s.aircraft_type)) {
      typePhoto.set(s.aircraft_type, pub(s.photo_path)!);
    }
    if (s.airline && !airlinePhoto.has(s.airline)) airlinePhoto.set(s.airline, pub(s.photo_path)!);
  }

  let slots: Slot[] = [];
  let title = "";
  if (kind === "airline") {
    title = "Airline Book";
    slots = [...airlines]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((a) => ({
        key: a.name,
        label: a.name,
        rarity: null,
        photo: airlinePhoto.get(a.name) ?? null,
        verified: airlinePhoto.has(a.name),
      }));
  } else {
    // type + rarity share the type universe; rarity just sorts/labels by tier.
    title = kind === "rarity" ? "Rarity Book" : "Type Book";
    slots = [...types]
      .sort(
        (a, b) =>
          (RARITY_RANK[a.rarity] ?? 0) - (RARITY_RANK[b.rarity] ?? 0) ||
          (a.display_name ?? a.code).localeCompare(b.display_name ?? b.code),
      )
      .map((t) => ({
        key: t.code,
        label: t.display_name ?? t.name,
        rarity: t.rarity,
        photo: typePhoto.get(t.code) ?? null,
        verified: typePhoto.has(t.code),
      }));
  }

  const collected = slots.filter((s) => s.photo).length;
  const pct = slots.length ? Math.round((collected / slots.length) * 100) : 0;
  const shownSlots = missingOnly ? slots.filter((s) => !s.photo) : slots;

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
          {collected} of {slots.length} collected
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
        {shownSlots.length === 0 ? (
          <p className="py-8 text-center font-mono text-xs uppercase tracking-wide text-ink-faint">
            {missingOnly ? "Nothing missing — book complete." : "Nothing here yet."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {shownSlots.map((slot) => (
              <BookSlot key={slot.key} slot={slot} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
