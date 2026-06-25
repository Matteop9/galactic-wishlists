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

function Polaroid({ slot, tilt }: { slot: Slot; tilt: number }) {
  const rotate = `rotate(${tilt}deg)`;
  if (!slot.photo) {
    return (
      <div
        className="rounded-sm border-2 border-dashed border-paper-edge bg-paper/40 p-2.5 pb-0"
        style={{ transform: rotate }}
      >
        <div className="flex aspect-square items-center justify-center bg-[repeating-linear-gradient(45deg,rgba(216,201,168,0.18),rgba(216,201,168,0.18)_8px,transparent_8px,transparent_16px)]">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
            Not yet
            <br />
            spotted
          </span>
        </div>
        <div className="py-2 text-center font-mono text-[10px] uppercase tracking-wide text-ink-faint">
          {slot.label}
        </div>
      </div>
    );
  }
  return (
    <div
      className="relative rounded-sm bg-[#FBF8F1] p-2.5 pb-0 shadow-[0_4px_10px_rgba(40,30,15,0.22)]"
      style={{ transform: rotate }}
    >
      <div className="relative aspect-square overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={slot.photo} alt={slot.label} className="h-full w-full object-cover" />
        {slot.rarity && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/stamps/${slot.rarity}.svg`}
            alt={slot.rarity}
            className="absolute bottom-1 right-1 h-9 w-9"
          />
        )}
      </div>
      <div className="py-2 text-center font-hand text-lg leading-none text-ink-soft">
        {slot.label}
      </div>
    </div>
  );
}

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<{ book?: string }>;
}) {
  const sp = await searchParams;
  const kind: BookKind =
    sp.book === "airline" || sp.book === "rarity" ? sp.book : "type";

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

  const tab = (k: BookKind, label: string) =>
    `rounded-md border px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide ${
      kind === k
        ? "border-ink bg-ink text-paper"
        : "border-paper-edge bg-paper-deep text-ink-soft hover:border-ink"
    }`;

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

      <div className="mt-5 flex gap-2">
        <Link href="/books?book=type" className={tab("type", "Type")}>Type</Link>
        <Link href="/books?book=airline" className={tab("airline", "Airline")}>Airline</Link>
        <Link href="/books?book=rarity" className={tab("rarity", "Rarity")}>Rarity</Link>
      </div>

      {/* progress */}
      <div className="mt-6 font-mono text-xs uppercase tracking-wide text-ink-soft">
        {collected} of {slots.length} collected
        <div className="mt-2 h-2 overflow-hidden rounded border border-paper-edge bg-paper-deep">
          <div
            className="h-full bg-gradient-to-r from-sky to-brass"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* the page */}
      <div className="mt-6 rounded-lg border border-paper-edge bg-paper p-4 shadow-inner sm:p-6">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
          {slots.map((slot, i) => (
            <Polaroid key={slot.key} slot={slot} tilt={i % 2 === 0 ? -2.2 : 1.8} />
          ))}
        </div>
      </div>
    </main>
  );
}
