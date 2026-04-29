import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import PlanReaction from "./plan-reaction";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString("en-CA", { timeZone: "Europe/London" });

  const [{ data: todayPlan }, { data: metrics }, { data: recentPlans }] = await Promise.all([
    supabase.from("daily_plans").select("provisional_plan,final_plan,reaction").eq("user_id", user.id).eq("date", today).single(),
    supabase.from("health_metrics").select("steps,hrv_ms,resting_heart_rate_bpm,sleep_duration_minutes,active_energy_kcal").eq("user_id", user.id).eq("date", yesterdayStr).single(),
    supabase.from("daily_plans").select("date,final_plan,actual_activity").eq("user_id", user.id).order("date", { ascending: false }).limit(7),
  ]);

  const streak = (recentPlans ?? []).filter((p) => p.final_plan || p.actual_activity).length;

  const sleepHours = metrics?.sleep_duration_minutes
    ? Math.round((metrics.sleep_duration_minutes / 60) * 10) / 10
    : null;

  const hasCheckedInThisMorning = !!todayPlan?.final_plan;
  const hasProvisionalPlan = !!todayPlan?.provisional_plan;

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/London" })}
        </h1>
        <p className="text-[var(--color-text-muted)] text-sm">{streak} day streak</p>
      </div>

      {/* Today's plan or CTA */}
      {hasCheckedInThisMorning ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p className="text-xs text-[var(--color-text-muted)] mb-2">Today's plan</p>
          <p className="text-sm leading-relaxed">{todayPlan.final_plan}</p>
        </div>
      ) : hasProvisionalPlan ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4">
          <div>
            <p className="text-xs text-[var(--color-text-muted)] mb-2">Tonight's provisional plan</p>
            <p className="text-sm leading-relaxed">{todayPlan.provisional_plan}</p>
          </div>
          <PlanReaction
            planDate={today}
            currentReaction={todayPlan.reaction as string | null}
          />
          <Link
            href="/app/checkin/morning"
            className="block w-full text-center rounded-lg bg-[var(--color-accent)] text-white py-2.5 text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            Do morning check-in
          </Link>
        </div>
      ) : (
        <Link
          href="/app/checkin/evening"
          className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 hover:border-[var(--color-accent)] transition-colors"
        >
          <p className="text-sm font-medium">Evening check-in</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Log today and see tomorrow's plan</p>
        </Link>
      )}

      {/* Yesterday's metrics */}
      {metrics && (
        <div>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">Yesterday</p>
          <div className="grid grid-cols-3 gap-3">
            {sleepHours && <MetricCard label="Sleep" value={`${sleepHours}h`} />}
            {metrics.hrv_ms && <MetricCard label="HRV" value={`${Math.round(metrics.hrv_ms)}ms`} />}
            {metrics.resting_heart_rate_bpm && <MetricCard label="RHR" value={`${Math.round(metrics.resting_heart_rate_bpm)}bpm`} />}
            {metrics.steps && <MetricCard label="Steps" value={metrics.steps.toLocaleString()} />}
            {metrics.active_energy_kcal && <MetricCard label="Active" value={`${Math.round(Number(metrics.active_energy_kcal))} kcal`} />}
          </div>
        </div>
      )}

      {/* Recent week */}
      {recentPlans && recentPlans.length > 0 && (
        <div>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">This week</p>
          <div className="space-y-2">
            {recentPlans.map((p) => (
              <div key={p.date} className="flex items-center gap-3 text-sm">
                <span className="text-[var(--color-text-muted)] w-12 text-xs shrink-0">
                  {new Date(p.date).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })}
                </span>
                <span className="text-[var(--color-text-muted)] truncate">
                  {p.actual_activity || p.final_plan || "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
      <p className="text-base font-semibold mt-0.5">{value}</p>
    </div>
  );
}
