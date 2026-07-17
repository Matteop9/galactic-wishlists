import Link from "next/link";
import { redirect } from "next/navigation";
import SectionShell from "@/components/SectionShell";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { resolveReport, resolvePhotoFlag } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

type ReportRow = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string | null;
  resolved: boolean;
  created_at: string;
  profiles: { handle: string | null } | null;
};

type FlaggedRow = {
  id: string;
  photo_path: string | null;
  registration: string | null;
  aircraft_type: string | null;
  review_flagged_at: string | null;
  profiles: { handle: string | null } | null;
};

export default async function ReportsPage() {
  const { isAdmin } = await getViewer();
  if (!isAdmin) redirect("/");

  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("id, target_type, target_id, reason, resolved, created_at, profiles(handle)")
    .order("resolved", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(200);

  const reports = (data ?? []) as unknown as ReportRow[];

  // Community-flagged photos awaiting an admin verdict (2 net no-votes).
  const { data: flaggedData } = await supabase
    .from("sightings")
    .select("id, photo_path, registration, aircraft_type, review_flagged_at, user_id")
    .eq("review_status", "flagged")
    .order("review_flagged_at", { ascending: true })
    .limit(50);
  const flaggedRaw = flaggedData ?? [];
  const ownerIds = [...new Set(flaggedRaw.map((f) => f.user_id as string))];
  const { data: owners } = ownerIds.length
    ? await supabase.from("profiles").select("id, handle").in("id", ownerIds)
    : { data: [] };
  const handleById = new Map((owners ?? []).map((o) => [o.id as string, o.handle as string]));
  const { data: voteRows } = flaggedRaw.length
    ? await supabase
        .from("photo_reviews")
        .select("sighting_id, can_see")
        .in("sighting_id", flaggedRaw.map((f) => f.id as string))
    : { data: [] };
  const votes = new Map<string, { yes: number; no: number }>();
  for (const v of voteRows ?? []) {
    const e = votes.get(v.sighting_id as string) ?? { yes: 0, no: 0 };
    if (v.can_see) e.yes++;
    else e.no++;
    votes.set(v.sighting_id as string, e);
  }
  const flagged: (FlaggedRow & { user_id: string })[] = flaggedRaw.map((f) => ({
    ...(f as FlaggedRow & { user_id: string }),
    profiles: { handle: handleById.get(f.user_id as string) ?? null },
  }));

  return (
    <SectionShell title="Reports" subtitle="User-flagged sightings and comments (admin only).">
      {flagged.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-display text-lg font-semibold uppercase tracking-wide text-ink">
            Community flags — photo removals awaiting your verdict
          </h2>
          <ul className="flex flex-col gap-3">
            {flagged.map((f) => {
              const v = votes.get(f.id) ?? { yes: 0, no: 0 };
              const photoUrl = f.photo_path
                ? supabase.storage.from("sightings").getPublicUrl(f.photo_path).data.publicUrl
                : null;
              return (
                <li key={f.id} className="rounded-lg border border-stamp/50 p-4">
                  <div className="flex flex-wrap items-start gap-4">
                    {photoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoUrl}
                        alt="Flagged capture photo"
                        className="h-28 w-40 rounded object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink">
                        {[f.registration, f.aircraft_type].filter(Boolean).join(" · ") ||
                          "Unknown aircraft"}{" "}
                        — by @{f.profiles?.handle ?? "spotter"}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-ink-faint">
                        {v.no} no · {v.yes} yes · flagged{" "}
                        {f.review_flagged_at
                          ? new Date(f.review_flagged_at).toLocaleString("en-GB")
                          : "—"}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <form
                          action={async () => {
                            "use server";
                            await resolvePhotoFlag(f.id, true);
                          }}
                        >
                          <button className="sd-btn sd-btn--capture !px-3 !py-1.5 !text-xs">
                            Approve removal
                          </button>
                        </form>
                        <form
                          action={async () => {
                            "use server";
                            await resolvePhotoFlag(f.id, false);
                          }}
                        >
                          <button className="sd-btn sd-btn--log !px-3 !py-1.5 !text-xs">
                            Reject — restore photo
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {reports.length === 0 ? (
        <p className="text-sm text-ink-faint">Nothing reported.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {reports.map((r) => (
            <li
              key={r.id}
              className={`rounded-lg border p-4 ${
                r.resolved ? "border-paper-edge opacity-60" : "border-stamp/50"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-display text-sm font-semibold uppercase tracking-wide text-ink">
                  {r.target_type}
                  {r.resolved && " · resolved"}
                </span>
                {!r.resolved && (
                  <form
                    action={async () => {
                      "use server";
                      await resolveReport(r.id);
                    }}
                  >
                    <button className="sd-btn sd-btn--log !px-3 !py-1.5 !text-xs">
                      Mark resolved
                    </button>
                  </form>
                )}
              </div>
              {r.reason && <p className="mt-2 text-sm text-ink">{r.reason}</p>}
              <p className="mt-2 font-mono text-[11px] text-ink-faint">
                by @{r.profiles?.handle ?? "spotter"} ·{" "}
                {r.target_type === "sighting" ? (
                  <Link href={`/s/${r.target_id}`} className="text-sky hover:underline">
                    open sighting {r.target_id.slice(0, 8)}
                  </Link>
                ) : (
                  <>
                    {r.target_type} {r.target_id.slice(0, 8)}
                  </>
                )}{" "}
                · {new Date(r.created_at).toLocaleString("en-GB")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </SectionShell>
  );
}
