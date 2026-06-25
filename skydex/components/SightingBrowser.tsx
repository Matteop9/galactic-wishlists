"use client";

import { useMemo, useState } from "react";
import SightingCard, { type Sighting } from "@/components/SightingCard";
import Comments from "@/components/Comments";
import Reactions from "@/components/Reactions";
import ReportButton from "@/components/ReportButton";
import ShareButton from "@/components/ShareButton";
import Lightbox from "@/components/Lightbox";
import { airlineFromCallsign } from "@/lib/airlines";
import { type ReactionState } from "@/lib/reactions";
import { deleteSighting } from "@/app/actions/admin";

export default function SightingBrowser({
  sightings,
  showComments = false,
  showVerifiedToggle = false,
  currentUserId = null,
  isAdmin = false,
  canDelete = false,
  commentCounts = {},
  reactions,
}: {
  sightings: Sighting[];
  showComments?: boolean;
  showVerifiedToggle?: boolean;
  currentUserId?: string | null;
  isAdmin?: boolean;
  canDelete?: boolean;
  commentCounts?: Record<string, number>;
  reactions?: Record<string, ReactionState>;
}) {
  const [items, setItems] = useState(sightings);
  const [lightbox, setLightbox] = useState<Sighting | null>(null);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<string | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const types = useMemo(
    () => [...new Set(items.map((s) => s.aircraft_type).filter(Boolean) as string[])].sort(),
    [items],
  );

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

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search registration, callsign, type, airline, spotter…"
        className="w-full rounded-md border border-paper-edge bg-paper-deep px-3 py-2.5 font-mono text-sm text-ink outline-none focus:border-sky"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => setType(null)} className={pill(!type)}>
          All types
        </button>
        {types.map((t) => (
          <button key={t} onClick={() => setType(t === type ? null : t)} className={pill(type === t)}>
            {t}
          </button>
        ))}
        {showVerifiedToggle && (
          <button onClick={() => setVerifiedOnly((v) => !v)} className={pill(verifiedOnly)}>
            Verified only
          </button>
        )}
      </div>

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
              <SightingCard s={s} onOpen={() => setLightbox(s)} />
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
    </div>
  );
}
