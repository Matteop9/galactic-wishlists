"use client";

import { useEffect, useMemo, useState } from "react";
import SightingCard, { type Sighting } from "@/components/SightingCard";
import Comments from "@/components/Comments";
import Reactions from "@/components/Reactions";
import ReportButton from "@/components/ReportButton";
import ShareButton from "@/components/ShareButton";
import Lightbox from "@/components/Lightbox";
import FeedStories from "@/components/FeedStories";
import { airlineFromCallsign } from "@/lib/airlines";
import { type ReactionState } from "@/lib/reactions";
import { deleteSighting } from "@/app/actions/admin";

// Catch-up high-water mark: the ISO created_at of the newest sighting already
// seen. NOT the WeeklyReview date-stamp pattern — this compares `>` against a
// timestamp so any newer insert counts as unseen.
const SEEN_KEY = "skydex_feed_seen_at";

// "since Tuesday" / "since 3 Aug" — computed in an effect (not render: clock reads).
function sinceLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "your last visit";
  const days = (Date.now() - d.getTime()) / 86_400_000;
  if (days < 1) return "earlier today";
  if (days < 7) return d.toLocaleDateString("en-GB", { weekday: "long" });
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function SightingBrowser({
  sightings,
  showComments = false,
  showVerifiedToggle = false,
  currentUserId = null,
  isAdmin = false,
  canDelete = false,
  commentCounts = {},
  reactions,
  compact = false,
  catchUp = false,
}: {
  sightings: Sighting[];
  showComments?: boolean;
  showVerifiedToggle?: boolean;
  currentUserId?: string | null;
  isAdmin?: boolean;
  canDelete?: boolean;
  commentCounts?: Record<string, number>;
  reactions?: Record<string, ReactionState>;
  /** Photo-first cards (feed). Other consumers keep the full spec card. */
  compact?: boolean;
  /** Enable the "N new since…" banner + tap-through stories (feed only —
      rows must carry created_at). */
  catchUp?: boolean;
}) {
  const [items, setItems] = useState(sightings);
  const [lightbox, setLightbox] = useState<Sighting | null>(null);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<string | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  // Catch-up state — `seen` is read/seeded from localStorage in an effect (SSR-safe).
  const [seen, setSeen] = useState<{ mark: string; label: string } | null>(null);
  const [storiesOpen, setStoriesOpen] = useState(false);

  const newestIso = useMemo(() => {
    let max: string | null = null;
    for (const s of items) {
      if (s.created_at && (!max || Date.parse(s.created_at) > Date.parse(max))) {
        max = s.created_at;
      }
    }
    return max;
  }, [items]);

  useEffect(() => {
    if (!catchUp || !newestIso) return;
    // Deferred a tick: localStorage is client-only, so the banner necessarily
    // appears after hydration — and the setState must not run synchronously in
    // the effect body (react-hooks/set-state-in-effect).
    const t = setTimeout(() => {
      const mark = localStorage.getItem(SEEN_KEY);
      if (!mark) {
        // First-ever visit: seed to the newest row, no banner — nobody gets a
        // 50-card story on day one.
        localStorage.setItem(SEEN_KEY, newestIso);
        return;
      }
      setSeen({ mark, label: sinceLabel(mark) });
    }, 0);
    return () => clearTimeout(t);
  }, [catchUp, newestIso]);

  // Unseen rows, oldest first, so tapping through reads chronologically.
  const unseen = useMemo(() => {
    if (!catchUp || !seen) return [];
    const cutoff = Date.parse(seen.mark);
    if (Number.isNaN(cutoff)) return [];
    return items
      .filter((s) => s.created_at && Date.parse(s.created_at) > cutoff)
      .sort((a, b) => Date.parse(a.created_at!) - Date.parse(b.created_at!));
  }, [catchUp, seen, items]);

  function closeStories() {
    setStoriesOpen(false);
    if (newestIso) {
      localStorage.setItem(SEEN_KEY, newestIso);
      setSeen({ mark: newestIso, label: "" }); // unseen collapses to [] → banner clears
    }
  }

  // Distinct types with per-type counts — powers the filter dropdown.
  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of items) {
      if (s.aircraft_type) counts.set(s.aircraft_type, (counts.get(s.aircraft_type) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((s) => {
      if (type && s.aircraft_type !== type) return false;
      if (verifiedOnly && !s.verified) return false;
      if (!q) return true;
      const hay = [
        s.registration,
        s.callsign,
        s.aircraft_type,
        s.airline ?? airlineFromCallsign(s.callsign),
        s.handle,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query, type, verifiedOnly]);

  async function onDelete(id: string) {
    if (!window.confirm("Delete this sighting and its photo?")) return;
    const res = await deleteSighting(id);
    if (res.ok) setItems((prev) => prev.filter((s) => s.id !== id));
    else window.alert(res.error ?? "Could not delete.");
  }

  const pill = (active: boolean) =>
    `rounded-full border px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-wide transition-colors ${
      active
        ? "border-ink bg-ink text-paper"
        : "border-paper-edge bg-transparent text-ink-soft hover:border-ink"
    }`;

  const q = query.trim();

  return (
    <div>
      {/* catch-up banner — tap through everything that landed since last visit */}
      {unseen.length > 0 && (
        <button
          onClick={() => setStoriesOpen(true)}
          className="mb-4 flex w-full items-center justify-between gap-3 rounded-lg border border-sky bg-sky/10 px-4 py-3 text-left hover:bg-sky/15"
        >
          <span className="font-display text-sm font-semibold uppercase tracking-wide text-ink">
            {unseen.length === items.length && items.length >= 50
              ? `${items.length}+`
              : unseen.length}{" "}
            new {unseen.length === 1 ? "catch" : "catches"}
            {seen?.label ? ` since ${seen.label}` : ""}
          </span>
          <span className="shrink-0 font-mono text-xs text-sky">tap through →</span>
        </button>
      )}

      {/* toolbar — search, type dropdown, verified toggle on one compact row */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search reg, callsign, airline, spotter…"
          className="min-w-0 flex-1 basis-48 rounded-md border border-paper-edge bg-paper-deep px-3 py-2 font-mono text-sm text-ink outline-none focus:border-sky"
        />
        <span className="relative">
          <select
            value={type ?? ""}
            onChange={(e) => setType(e.target.value || null)}
            aria-label="Filter by aircraft type"
            className="appearance-none rounded-md border border-paper-edge bg-paper-deep py-2 pl-3 pr-8 font-display text-xs font-semibold uppercase tracking-wide text-ink-soft outline-none focus:border-sky"
          >
            <option value="">All types · {items.length}</option>
            {typeCounts.map(([t, n]) => (
              <option key={t} value={t}>
                {t} · {n}
              </option>
            ))}
          </select>
          <span
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-soft"
          >
            ▾
          </span>
        </span>
        {showVerifiedToggle && (
          <button onClick={() => setVerifiedOnly((v) => !v)} className={pill(verifiedOnly)}>
            Verified only
          </button>
        )}
      </div>

      <p className="mt-3 font-mono text-[11px] uppercase tracking-wide text-ink-faint">
        {filtered.length} {filtered.length === 1 ? "sighting" : "sightings"}
        {type ? ` · ${type}` : ""}
        {q ? ` matching “${q}”` : ""}
      </p>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-ink-faint">No sightings match.</p>
      ) : (
        <div className={`mt-5 grid gap-4 ${showComments ? "" : "sm:grid-cols-2"}`}>
          {filtered.map((s) => (
            <div key={s.id} className="relative overflow-hidden rounded-lg">
              {canDelete && (
                <button
                  onClick={() => onDelete(s.id)}
                  className="absolute left-2 top-2 z-20 rounded bg-ink/80 px-2 py-1 font-mono text-[11px] uppercase tracking-wide text-paper hover:bg-stamp"
                >
                  Delete
                </button>
              )}
              <SightingCard s={s} onOpen={() => setLightbox(s)} compact={compact} />
              {reactions && (
                <Reactions
                  sightingId={s.id}
                  currentUserId={currentUserId}
                  state={reactions[s.id]}
                />
              )}
              {(s.verified || currentUserId) && (
                <div className="flex justify-end gap-4 bg-paper-deep px-3 py-1">
                  {s.verified && (
                    <ShareButton
                      id={s.id}
                      className="font-mono text-[11px] uppercase tracking-wide text-ink-faint hover:text-sky"
                    />
                  )}
                  {currentUserId && (
                    <ReportButton
                      targetType="sighting"
                      targetId={s.id}
                      currentUserId={currentUserId}
                      className="font-mono text-[11px] uppercase tracking-wide text-ink-faint hover:text-stamp disabled:opacity-60"
                    />
                  )}
                </div>
              )}
              {showComments && (
                <Comments
                  sightingId={s.id}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  count={commentCounts[s.id] ?? 0}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {lightbox && <Lightbox sighting={lightbox} onClose={() => setLightbox(null)} />}

      {storiesOpen && unseen.length > 0 && (
        <FeedStories
          sightings={unseen}
          currentUserId={currentUserId}
          reactions={reactions}
          onClose={closeStories}
        />
      )}
    </div>
  );
}
