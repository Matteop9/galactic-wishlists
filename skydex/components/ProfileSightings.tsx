"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import SightingCard, { type Sighting } from "@/components/SightingCard";
import Lightbox from "@/components/Lightbox";
import { toggleFavourite, loadMoreSightings } from "@/app/profile/actions";

const MAX_PINS = 3;

/**
 * The profile's Favourites tray + full sighting history. Owns both so a
 * pin/unpin updates the tray instantly (optimistic, no page refresh); history
 * pages in via the loadMoreSightings server action. `children` (medals, stats)
 * render between the two sections to preserve the page layout.
 */
export default function ProfileSightings({
  initialSightings,
  featuredSightings,
  isOwner,
  userId,
  total,
  children,
}: {
  initialSightings: Sighting[];
  featuredSightings: Sighting[];
  isOwner: boolean;
  userId: string;
  total: number;
  children?: ReactNode;
}) {
  const [items, setItems] = useState(initialSightings);
  const [pinned, setPinned] = useState(featuredSightings);
  const [lightbox, setLightbox] = useState<Sighting | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialSightings.length < total);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flash(msg: string) {
    setNotice(msg);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 4000);
  }
  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  const pinnedIds = new Set(pinned.map((s) => s.id));

  async function onTogglePin(s: Sighting) {
    if (busy) return;
    const isPinned = pinnedIds.has(s.id);
    if (!isPinned && pinned.length >= MAX_PINS) {
      flash(`You can pin up to ${MAX_PINS} — unpin one first.`);
      return;
    }
    // Optimistic: flip immediately, revert if the server says no.
    const prev = pinned;
    setPinned(isPinned ? prev.filter((f) => f.id !== s.id) : [...prev, s]);
    setBusy(true);
    const res = await toggleFavourite(s.id);
    setBusy(false);
    if (res.error) {
      setPinned(prev);
      flash(res.error);
    }
  }

  async function onLoadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    const res = await loadMoreSightings(userId, items.length);
    setLoadingMore(false);
    if (res.error || !res.sightings) {
      flash(res.error ?? "Could not load more sightings.");
      return;
    }
    const fresh = res.sightings;
    setItems((prev) => {
      const seen = new Set(prev.map((p) => p.id));
      return [...prev, ...fresh.filter((s) => !seen.has(s.id))];
    });
    setHasMore(Boolean(res.hasMore));
  }

  const pinButton = (s: Sighting) => {
    const isPinned = pinnedIds.has(s.id);
    return (
      <button
        onClick={() => onTogglePin(s)}
        disabled={busy}
        className={`mt-1.5 w-full rounded-md border-2 px-3 py-2 font-display text-xs font-semibold uppercase tracking-wide transition-colors disabled:opacity-60 ${
          isPinned
            ? "border-brass bg-brass/10 text-brass hover:bg-brass/20"
            : "border-paper-edge text-ink-soft hover:border-sky hover:text-sky"
        }`}
      >
        {isPinned ? "★ Pinned — tap to unpin" : "☆ Pin to profile"}
      </button>
    );
  };

  return (
    <>
      {/* favourites tray */}
      {(isOwner || pinned.length > 0) && (
        <section className="mt-6">
          <h2 className="flex items-baseline justify-between font-display text-lg font-semibold uppercase tracking-wide text-ink-soft">
            Favourites
            {isOwner && (
              <span className="font-mono text-xs normal-case tracking-normal text-ink-faint">
                {pinned.length}/{MAX_PINS} pinned
              </span>
            )}
          </h2>
          {pinned.length === 0 ? (
            <div className="mt-3 rounded-lg border border-dashed border-paper-edge px-4 py-6 text-center font-mono text-xs text-ink-faint">
              Nothing pinned yet — hit “Pin to profile” on up to {MAX_PINS} of your
              sightings below to showcase them here.
            </div>
          ) : (
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {pinned.map((s) => (
                <div key={s.id}>
                  <SightingCard s={s} onOpen={() => setLightbox(s)} />
                  {isOwner && pinButton(s)}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {children}

      {/* full history */}
      <section className="mt-8">
        <h2 className="flex items-baseline justify-between font-display text-lg font-semibold uppercase tracking-wide text-ink-soft">
          {isOwner ? "Your sightings" : "Sightings"}
          {total > 0 && (
            <span className="font-mono text-xs normal-case tracking-normal text-ink-faint">
              showing {items.length} of {total}
            </span>
          )}
        </h2>
        <div className="mt-3">
          {items.length === 0 ? (
            <p className="text-sm text-ink-faint">No sightings yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((s) => (
                <div key={s.id}>
                  <SightingCard s={s} onOpen={() => setLightbox(s)} />
                  {isOwner && pinButton(s)}
                </div>
              ))}
            </div>
          )}
        </div>
        {hasMore && (
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="sd-btn sd-btn--log mt-5 w-full rounded-md border-2 !py-2.5 text-sm"
          >
            {loadingMore ? "Loading…" : `Load more (${total - items.length} remaining)`}
          </button>
        )}
      </section>

      {notice && (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-4 py-2 font-mono text-xs text-paper shadow-[0_8px_24px_rgba(32,38,43,0.35)]"
        >
          {notice}
        </div>
      )}
      {lightbox && <Lightbox sighting={lightbox} onClose={() => setLightbox(null)} />}
    </>
  );
}
