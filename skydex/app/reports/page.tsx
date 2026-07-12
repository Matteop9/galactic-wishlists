import Link from "next/link";
import { redirect } from "next/navigation";
import SectionShell from "@/components/SectionShell";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { resolveReport } from "@/app/actions/admin";

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

  return (
    <SectionShell title="Reports" subtitle="User-flagged sightings and comments (admin only).">
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
