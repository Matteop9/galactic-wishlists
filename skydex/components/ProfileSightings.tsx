"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SightingCard, { type Sighting } from "@/components/SightingCard";
import Lightbox from "@/components/Lightbox";
import { toggleFavourite } from "@/app/profile/actions";

export default function ProfileSightings({
  sightings,
  featuredIds,
  isOwner,
}: {
  sightings: Sighting[];
  featuredIds: string[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [lightbox, setLightbox] = useState<Sighting | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const featured = new Set(featuredIds);

  async function onStar(id: string) {
    if (busy) return;
    setBusy(id);
    const res = await toggleFavourite(id);
    setBusy(null);
    if (res.error) window.alert(res.error);
    else router.refresh();
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {sightings.map((s) => (
          <div key={s.id} className="relative overflow-hidden rounded-lg">
            {isOwner && (
              <button
                onClick={() => onStar(s.id)}
                disabled={busy === s.id}
                aria-label={featured.has(s.id) ? "Unfeature" : "Feature on profile"}
                className="absolute right-2 top-2 z-20 rounded-full bg-ink/70 px-2 py-1 text-sm leading-none text-paper hover:bg-ink disabled:opacity-60"
              >
                {featured.has(s.id) ? "★" : "☆"}
              </button>
            )}
            <SightingCard s={s} onOpen={() => setLightbox(s)} />
          </div>
        ))}
      </div>
      {lightbox && <Lightbox sighting={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
