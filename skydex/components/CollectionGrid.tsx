"use client";

import { useState, type CSSProperties } from "react";

export type CollectionItem = {
  key: string;
  label: string;
  title?: string;
  got: boolean;
  className: string;
  style?: CSSProperties;
  iconUrl?: string;
};

type Filter = "all" | "collected" | "missing";

// A universe grid (Types / Carriers) with an All · Collected · Missing filter
// (feedback: "filter scrapbook for only show collected/missing"). Chip visuals
// are computed by the caller and passed through per item.
export default function CollectionGrid({
  title,
  items,
  compact = false,
}: {
  title: string;
  items: CollectionItem[];
  // When the title + count live in a parent (e.g. a <details> summary), drop the
  // heading and top margin so only the filter row + grid render.
  compact?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const collected = items.filter((i) => i.got).length;
  const shown = items.filter((i) =>
    filter === "collected" ? i.got : filter === "missing" ? !i.got : true,
  );

  const pill = (active: boolean) =>
    `rounded-full border px-3 py-1 font-display text-[11px] font-semibold uppercase tracking-wide transition-colors ${
      active
        ? "border-ink bg-ink text-paper"
        : "border-paper-edge bg-transparent text-ink-soft hover:border-ink"
    }`;

  return (
    <div>
      <div
        className={`flex flex-wrap items-center justify-between gap-3 ${compact ? "" : "mt-8"}`}
      >
        {!compact && (
          <h2 className="font-display text-xl font-semibold uppercase tracking-wide text-ink-soft">
            {title} · {collected}/{items.length}
          </h2>
        )}
        <div className="flex gap-2">
          {(["all", "collected", "missing"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={pill(filter === f)}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {shown.length === 0 ? (
          <p className="text-sm text-ink-faint">
            {filter === "missing" ? "All collected — nothing missing here." : "Nothing to show."}
          </p>
        ) : (
          shown.map((i) => (
            <span
              key={i.key}
              title={i.title}
              className={`inline-flex items-center gap-1.5 ${i.className}`}
              style={i.style}
            >
              {i.iconUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={i.iconUrl}
                  alt=""
                  loading="lazy"
                  className="h-4 w-4 shrink-0 rounded-sm bg-paper object-contain"
                />
              )}
              {i.label}
            </span>
          ))
        )}
      </div>
    </div>
  );
}
