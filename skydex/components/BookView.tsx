import Link from "next/link";
import BookSlot from "@/components/BookSlot";
import { type BookKind, type BookSection } from "@/lib/bookBuilder";

// The book page chrome — tag tabs, progress bar, All/Missing filter, and the
// slot grid. Shared by the owner's /books and the public /u/[handle]/books
// (readOnly: no cover picker; basePath keeps tab/filter links on that route).

export default function BookView({
  title,
  kind,
  missingOnly,
  sections,
  basePath,
  readOnly = false,
  backHref,
  backLabel,
  actions,
  note,
}: {
  title: string;
  kind: BookKind;
  missingOnly: boolean;
  sections: BookSection[];
  basePath: string;
  readOnly?: boolean;
  backHref: string;
  backLabel: string;
  actions?: React.ReactNode;
  note?: string;
}) {
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
        <span className="flex items-center gap-3">
          {actions}
          <Link href={backHref} className="font-mono text-xs text-ink-soft hover:text-ink">
            {backLabel}
          </Link>
        </span>
      </div>

      {note && (
        <p className="mt-3 font-mono text-[11px] uppercase tracking-wide text-ink-faint">{note}</p>
      )}

      {/* tag tabs */}
      <div className="mt-5 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = kind === t.k;
          return (
            <Link
              key={t.k}
              href={`${basePath}?book=${t.k}`}
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
                href={`${basePath}?book=${kind}${v === "missing" ? "&view=missing" : ""}`}
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
                    <BookSlot key={slot.key} slot={slot} kind={kind} readOnly={readOnly} />
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
