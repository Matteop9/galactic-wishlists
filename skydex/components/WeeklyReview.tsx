"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RARITY_RANK } from "@/lib/rarity";
import { useDialog } from "@/components/useDialog";

// Monday-morning weekly review (feedback 2026-07-17): a once-a-week card
// summarising the PREVIOUS Mon–Sun week, shown on the first visit on/after
// Monday. All numbers are computed client-side from the user's own sightings
// rows (RLS own-rows read) so no server aggregation is needed — and unlike
// profile_stats' current-week window, last week's numbers are final.

// Value = local date of the current week's Monday; differs → not seen this week.
const SEEN_KEY = "skydex_weekly_seen";
const GUIDE_SEEN_KEY = "skydex_guide_seen"; // mirrors GuideModal — never stack on onboarding
const AUTO_OPEN_ROUTES = ["/", "/scrapbook", "/feed"]; // GuideModal's list minus /spot (camera flow)
const FORCE_EVENT = "skydex:open-weekly-review";

type WeekRow = {
  id: string;
  captured_at: string;
  aircraft_type: string | null;
  airline: string | null;
  rarity: string;
  photo_path: string | null;
  registration: string | null;
  callsign: string | null;
};

type Summary = {
  rangeLabel: string;
  spots: number;
  newTypes: number;
  airlines: number;
  rank: number | null;
  rarest: (WeekRow & { photoUrl: string | null; typeName: string | null }) | null;
};

/** Local 00:00 on the Monday of d's week (Mon=start; Sunday maps back 6 days). */
function mondayStart(d: Date): Date {
  const dow = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow);
}

// Local calendar date — deliberately NOT toISOString(), which shifts the date
// across midnight for non-UTC timezones.
function localYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function fmtDay(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function WeeklyReview({ userId }: { userId: string }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    const thisMonday = mondayStart(new Date());
    const stamp = () => localStorage.setItem(SEEN_KEY, localYmd(thisMonday));

    async function load(force: boolean) {
      const lastMonday = new Date(thisMonday);
      lastMonday.setDate(lastMonday.getDate() - 7);
      const sunday = new Date(thisMonday);
      sunday.setDate(sunday.getDate() - 1);

      const supabase = createClient();
      const [weekRes, priorRes, statsRes, typesRes] = await Promise.all([
        supabase
          .from("sightings")
          .select("id, captured_at, aircraft_type, airline, rarity, photo_path, registration, callsign")
          .eq("user_id", userId)
          .gte("captured_at", lastMonday.toISOString())
          .lt("captured_at", thisMonday.toISOString()),
        supabase
          .from("sightings")
          .select("aircraft_type")
          .eq("user_id", userId)
          .lt("captured_at", lastMonday.toISOString()),
        supabase.rpc("profile_stats", { p_user: userId }),
        supabase.from("aircraft_types").select("code, display_name"),
      ]);
      if (cancelled) return;
      // Errors: bail without stamping so it retries on the next visit.
      if (weekRes.error || priorRes.error) return;

      const rows = (weekRes.data ?? []) as WeekRow[];
      if (rows.length === 0) {
        // Quiet week — no card, but stamp so the queries don't rerun all week.
        if (!force) stamp();
        return;
      }

      const priorTypes = new Set(
        ((priorRes.data ?? []) as { aircraft_type: string | null }[])
          .map((r) => r.aircraft_type)
          .filter(Boolean),
      );
      const weekTypes = new Set(rows.map((r) => r.aircraft_type).filter(Boolean));
      const newTypes = [...weekTypes].filter((t) => !priorTypes.has(t)).length;
      const airlines = new Set(rows.map((r) => r.airline).filter(Boolean)).size;

      const statsRow = Array.isArray(statsRes.data) ? statsRes.data[0] : statsRes.data;
      const rank = (statsRow as { spots_all_rank?: number | null } | null)?.spots_all_rank ?? null;

      const typeName = new Map(
        ((typesRes.data ?? []) as { code: string; display_name: string | null }[]).map((t) => [
          t.code,
          t.display_name ?? t.code,
        ]),
      );

      const rarestRow = [...rows].sort(
        (a, b) =>
          (RARITY_RANK[b.rarity] ?? 0) - (RARITY_RANK[a.rarity] ?? 0) ||
          Date.parse(b.captured_at) - Date.parse(a.captured_at),
      )[0];

      setSummary({
        rangeLabel: `${fmtDay(lastMonday)} – ${fmtDay(sunday)}`,
        spots: rows.length,
        newTypes,
        airlines,
        rank,
        rarest: {
          ...rarestRow,
          photoUrl: rarestRow.photo_path
            ? supabase.storage.from("sightings").getPublicUrl(rarestRow.photo_path).data.publicUrl
            : null,
          typeName: rarestRow.aircraft_type
            ? typeName.get(rarestRow.aircraft_type) ?? rarestRow.aircraft_type
            : null,
        },
      });
      setOpen(true);
    }

    const due =
      localStorage.getItem(SEEN_KEY) !== localYmd(thisMonday) &&
      AUTO_OPEN_ROUTES.includes(pathname) &&
      // Onboarding first — bail WITHOUT stamping so the review shows next visit.
      !!localStorage.getItem(GUIDE_SEEN_KEY);
    if (due) load(false);

    const handler = () => load(true); // dev/test hook — ignores the stamp
    window.addEventListener(FORCE_EVENT, handler);
    return () => {
      cancelled = true;
      window.removeEventListener(FORCE_EVENT, handler);
    };
  }, [pathname, userId]);

  function close() {
    localStorage.setItem(SEEN_KEY, localYmd(mondayStart(new Date())));
    setOpen(false);
  }

  if (!open || !summary) return null;
  return <WeeklyReviewDialog summary={summary} onClose={close} />;
}

function WeeklyReviewDialog({ summary, onClose }: { summary: Summary; onClose: () => void }) {
  const dialogRef = useDialog(onClose);

  const stat = (label: string, value: string | number) => (
    <div className="flex flex-col items-center">
      <span className="font-display text-2xl font-bold tabular-nums text-ink">{value}</span>
      <span className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">{label}</span>
    </div>
  );

  const r = summary.rarest;
  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Weekly review"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/60 p-4 outline-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-paper-edge bg-paper-deep p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-center font-display text-sm font-bold uppercase tracking-[0.2em] text-stamp">
          Weekly review
        </p>
        <p className="mt-1 text-center font-mono text-xs uppercase tracking-wide text-ink-faint">
          {summary.rangeLabel}
        </p>

        <div className="mt-4 grid grid-cols-4 gap-1 border-t border-paper-edge pt-3">
          {stat("Spots", summary.spots)}
          {stat("New types", summary.newTypes)}
          {stat("Airlines", summary.airlines)}
          {stat("Rank", summary.rank ?? "—")}
        </div>

        {r && (
          <a
            href={`/s/${r.id}`}
            className="mt-4 block overflow-hidden rounded-lg border border-paper-edge"
          >
            <div className="relative bg-gradient-to-b from-[#9FC0D4] to-[#DFE6E0]">
              {r.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.photoUrl} alt="" className="h-36 w-full object-cover" />
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/stamps/${r.rarity}.svg`}
                alt={r.rarity}
                className="absolute left-3 top-3 h-14 w-14"
              />
            </div>
            <div className="flex items-baseline justify-between gap-2 px-3 py-2">
              <span className="font-display font-bold text-ink">
                {r.registration || r.callsign || "—"}
              </span>
              <span className="truncate font-serif text-xs text-ink-soft">
                {r.typeName ?? ""}
              </span>
            </div>
          </a>
        )}
        <p className="mt-1.5 text-center font-mono text-[10px] uppercase tracking-wide text-ink-faint">
          Catch of the week
        </p>

        <div className="mt-5 flex items-center justify-center gap-3">
          <a href="/scrapbook" className="sd-btn sd-btn--log !px-4 !py-2 !text-sm">
            Scrapbook
          </a>
          <button onClick={onClose} className="sd-btn sd-btn--capture !px-4 !py-2 !text-sm">
            Keep spotting
          </button>
        </div>
      </div>
    </div>
  );
}
