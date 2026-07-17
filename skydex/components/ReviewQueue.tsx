"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Community photo review: random anonymous photos from other spotters, one
// question — can you actually see an aircraft? All the trust rules live in the
// review_* RPCs (standing, daily cap, one vote per photo, net-2 flagging,
// net-2 endorsement retiring a photo from the pool);
// this component is just the card and the two buttons.

type Eligibility = {
  eligible: boolean;
  verified_count: number;
  reviewed_today: number;
  daily_limit: number;
};

type NextPhoto = { sighting_id: string; photo_path: string; captured_at: string };

export default function ReviewQueue() {
  const [elig, setElig] = useState<Eligibility | null>(null);
  const [photo, setPhoto] = useState<NextPhoto | null>(null);
  const [state, setState] = useState<"loading" | "gate" | "reviewing" | "empty" | "error">(
    "loading",
  );
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);

  const loadNext = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("review_next");
    if (error) {
      setState("error");
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      setPhoto(null);
      setState("empty");
    } else {
      setPhoto(row as NextPhoto);
      setState("reviewing");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("review_eligibility");
      if (cancelled) return;
      if (error || !data) {
        setState("error");
        return;
      }
      const e = data as Eligibility;
      setElig(e);
      if (!e.eligible) {
        setState("gate");
      } else {
        await loadNext();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadNext]);

  async function vote(canSee: boolean) {
    if (!photo || busy) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("review_vote", {
        p_sighting: photo.sighting_id,
        p_can_see: canSee,
      });
      const res = (data ?? {}) as { ok?: boolean; error?: string };
      if (error || res.error) {
        setState("error");
        return;
      }
      setDone((n) => n + 1);
      await loadNext();
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") {
    return <p className="text-sm text-ink-faint">Loading…</p>;
  }

  if (state === "error") {
    return (
      <p className="text-sm text-stamp">
        Something went wrong loading the review queue — try again in a minute.
      </p>
    );
  }

  if (state === "gate") {
    return (
      <div className="rounded-lg border border-paper-edge p-5 text-sm text-ink-soft">
        <p>
          Community review unlocks once you have{" "}
          <strong className="text-ink">5 verified sightings</strong> of your own — you have{" "}
          {elig?.verified_count ?? 0}. Get spotting!
        </p>
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div className="rounded-lg border border-paper-edge p-5 text-sm text-ink-soft">
        <p>
          Nothing left to review — you&apos;ve seen every photo currently in the queue.
          {done > 0 && ` Thanks for checking ${done} photo${done === 1 ? "" : "s"} today.`}
        </p>
      </div>
    );
  }

  const photoUrl = photo
    ? createClient().storage.from("sightings").getPublicUrl(photo.photo_path).data.publicUrl
    : null;

  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-paper-edge bg-ink">
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt="A spotter's capture photo, under community review"
            className="mx-auto max-h-[60vh] w-full object-contain"
          />
        )}
      </div>

      <p className="mt-5 text-center font-display text-lg font-semibold uppercase tracking-wide text-ink">
        Can you see an aircraft in this photo?
      </p>
      <p className="mt-1 text-center text-xs text-ink-faint">
        Zoomed-in dots and faint contrail specks count — &ldquo;no&rdquo; is for photos with no
        aircraft visible at all.
      </p>

      <div className="mt-4 flex justify-center gap-3">
        <button
          onClick={() => vote(true)}
          disabled={busy}
          className="sd-btn sd-btn--capture !px-8"
        >
          Yes, I can
        </button>
        <button onClick={() => vote(false)} disabled={busy} className="sd-btn sd-btn--log !px-8">
          No aircraft
        </button>
      </div>

      <p className="mt-4 text-center font-mono text-[11px] text-ink-faint">
        Reviewed this session: {done}
        {elig && ` · today: ${elig.reviewed_today + done}/${elig.daily_limit}`}
      </p>
    </div>
  );
}
