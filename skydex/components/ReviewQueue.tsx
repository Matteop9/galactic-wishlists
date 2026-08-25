"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { announceTicketsChanged } from "@/lib/tickets";
import { TicketGlyph } from "@/components/TicketChip";
import { SpinnerBlock } from "@/components/Loading";

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
  // Review-to-earn: the vote RPC reports Tickets earned today + the cap (10, or
  // 20 for Frequent Flyers). justEarned drives the little "+1 Ticket" flash.
  const [earn, setEarn] = useState<{ today: number; cap: number; justEarned: boolean } | null>(
    null,
  );

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
      const res = (data ?? {}) as {
        ok?: boolean;
        error?: string;
        earned?: boolean;
        tickets_today?: number;
        review_cap?: number;
      };
      if (error || res.error) {
        setState("error");
        return;
      }
      if (typeof res.tickets_today === "number" && typeof res.review_cap === "number") {
        setEarn({
          today: res.tickets_today,
          cap: res.review_cap,
          justEarned: Boolean(res.earned),
        });
        if (res.earned) announceTicketsChanged(); // header chip re-reads its balance
      }
      setDone((n) => n + 1);
      await loadNext();
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") {
    return <SpinnerBlock className="py-10" />;
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
          // Deliberately NOT wrapped in SightingPhoto (the app-wide "photo opens
          // the card" convention): reviews are anonymous, and the card would
          // reveal the spotter. See AGENTS.md § UI conventions.
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

      {earn?.justEarned && (
        <p className="mt-4 flex items-center justify-center gap-1.5 font-mono text-xs font-semibold text-sky-deep">
          <TicketGlyph className="h-3.5 w-3.5 text-brass" />
          +1 Ticket earned
        </p>
      )}

      <p className="mt-4 text-center font-mono text-[11px] text-ink-faint">
        Reviewed this session: {done}
        {elig && ` · today: ${elig.reviewed_today + done}/${elig.daily_limit}`}
        {earn && ` · Tickets earned today: ${earn.today}/${earn.cap}`}
      </p>
    </div>
  );
}
