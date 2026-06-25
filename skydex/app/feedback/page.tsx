import { redirect } from "next/navigation";
import SectionShell from "@/components/SectionShell";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { resolveFeedback } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

type FeedbackRow = {
  id: string;
  body: string;
  resolved: boolean;
  created_at: string;
  profiles: { handle: string | null } | null;
};

export default async function FeedbackPage() {
  const { isAdmin } = await getViewer();
  if (!isAdmin) redirect("/");

  const supabase = await createClient();
  const { data } = await supabase
    .from("feedback")
    .select("id, body, resolved, created_at, profiles(handle)")
    .order("resolved", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as unknown as FeedbackRow[];

  return (
    <SectionShell title="Feedback" subtitle="What users have sent in (admin only).">
      {rows.length === 0 ? (
        <p className="text-sm text-ink-faint">No feedback yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((f) => (
            <li
              key={f.id}
              className={`rounded-lg border p-4 ${
                f.resolved ? "border-paper-edge opacity-60" : "border-sky/50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-ink">{f.body}</p>
                {!f.resolved && (
                  <form
                    action={async () => {
                      "use server";
                      await resolveFeedback(f.id);
                    }}
                  >
                    <button className="sd-btn sd-btn--log shrink-0 !px-3 !py-1.5 !text-xs">
                      Done
                    </button>
                  </form>
                )}
              </div>
              <p className="mt-2 font-mono text-[11px] text-ink-faint">
                @{f.profiles?.handle ?? "spotter"} · {new Date(f.created_at).toLocaleString("en-GB")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </SectionShell>
  );
}
