import { type Sighting } from "@/components/SightingCard";
import { type Slot } from "@/components/BookSlot";
import { RARITY_TIERS } from "@/lib/rarity";

// Pure book-building logic, shared by the owner's /books page and the public
// read-only /u/[handle]/books page. Rows come in card-shaped (photo_url already
// resolved) but with RAW aircraft_type codes — the builder handles display
// names itself so slots key correctly by code.

export type BookKind = "type" | "airline" | "rarity";
export type BookSection = { heading: string | null; stamp: string | null; slots: Slot[] };

export type TypeRow = { code: string; display_name: string | null; name: string; rarity: string };
export type CoverRow = { kind: string; key: string; sighting_id: string };

export function buildBook({
  kind,
  rows,
  types,
  airlines,
  covers,
}: {
  kind: BookKind;
  rows: Sighting[]; // aircraft_type = raw code; newest first
  types: TypeRow[];
  airlines: { name: string }[];
  covers: CoverRow[];
}): { title: string; sections: BookSection[] } {
  const typeName = new Map(types.map((t) => [t.code, t.display_name ?? t.code]));
  const byId = new Map(rows.map((s) => [s.id, s]));

  // Every photographed sighting per type / airline, newest first — feeds both
  // the default cover (latest) and the tap-to-choose picker.
  const typeOptions = new Map<string, { id: string; url: string }[]>();
  const airlineOptions = new Map<string, { id: string; url: string }[]>();
  const addOption = (
    map: Map<string, { id: string; url: string }[]>,
    key: string,
    opt: { id: string; url: string },
  ) => {
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(opt);
  };
  for (const s of rows) {
    if (!s.photo_url) continue;
    const opt = { id: s.id, url: s.photo_url };
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
    const coverRow = cover ? byId.get(cover.id) ?? null : null;
    return {
      key,
      label,
      rarity,
      photo: cover?.url ?? null,
      // Card-shaped cover sighting for the Lightbox — display name, not code.
      cover: coverRow
        ? {
            ...coverRow,
            aircraft_type: coverRow.aircraft_type
              ? typeName.get(coverRow.aircraft_type) ?? coverRow.aircraft_type
              : null,
          }
        : null,
      options,
      coverId: chosen && options.some((o) => o.id === chosen) ? chosen : null,
    };
  }

  // Sections: the Type book is one alphabetical run; the Rarity book is the
  // same universe grouped by tier (that's the difference between the two);
  // the Airline book is alphabetical brands.
  if (kind === "airline") {
    return {
      title: "Airline Book",
      sections: [
        {
          heading: null,
          stamp: null,
          slots: [...airlines]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((a) => makeSlot("airline", a.name, a.name, null, airlineOptions.get(a.name) ?? [])),
        },
      ],
    };
  }
  if (kind === "rarity") {
    return {
      title: "Rarity Book",
      sections: RARITY_TIERS.map((tier) => ({
        heading: tier,
        stamp: `/stamps/${tier}.svg`,
        slots: types
          .filter((t) => t.rarity === tier)
          .sort((a, b) => (a.display_name ?? a.code).localeCompare(b.display_name ?? b.code))
          .map((t) =>
            makeSlot("type", t.code, t.display_name ?? t.name, t.rarity, typeOptions.get(t.code) ?? []),
          ),
      })).filter((s) => s.slots.length > 0),
    };
  }
  return {
    title: "Type Book",
    sections: [
      {
        heading: null,
        stamp: null,
        slots: [...types]
          .sort((a, b) => (a.display_name ?? a.code).localeCompare(b.display_name ?? b.code))
          .map((t) =>
            makeSlot("type", t.code, t.display_name ?? t.name, t.rarity, typeOptions.get(t.code) ?? []),
          ),
      },
    ],
  };
}
