import { Suspense } from "react";
import { connection } from "next/server";
import { headers } from "next/headers";
import { getMemory, getSetting } from "@/lib/queries";
import { MemoryList } from "@/components/memory-list";
import { LogoutButton } from "@/components/logout-button";

async function Loader() {
  await connection();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const [memory, goal, cardioPlan] = await Promise.all([getMemory(), getSetting<Record<string, unknown> | null>("goal", null), getSetting<{ sessionsPerWeek: number } | null>("cardio_plan", null)]);
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-line bg-surface p-3 text-sm">
        <h2 className="mb-1 font-medium">Goal</h2>
        {goal ? (
          <p className="text-muted">
            {String(goal.goal ?? "")}
            {goal.target_weight_kg ? ` · target ${goal.target_weight_kg} kg` : ""}
            {goal.target_rate_kg_per_week ? ` · ${goal.target_rate_kg_per_week} kg/wk` : ""}
            {cardioPlan ? ` · cardio ${cardioPlan.sessionsPerWeek}/wk` : ""}
          </p>
        ) : (
          <p className="text-muted">Not set yet — the coach records it during onboarding.</p>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-3 text-sm">
        <h2 className="mb-1 font-medium">What the coach remembers</h2>
        <MemoryList items={memory.map((m) => ({ id: m.id, category: m.category, content: m.content }))} />
      </section>

      <section className="rounded-2xl border border-line bg-surface p-3 text-sm">
        <h2 className="mb-1 font-medium">Renpho → Apple Health → here</h2>
        <ol className="list-decimal space-y-1 pl-4 text-muted">
          <li>Renpho Health app → Settings → Apple Health: allow weight, body fat, BMI, lean mass.</li>
          <li>Health Auto Export → Automations → new REST API automation.</li>
          <li>
            URL <code className="rounded bg-surface-2 px-1 text-fg">{proto}://{host}/api/ingest/hae</code>, method POST, format JSON.
          </li>
          <li>
            Header <code className="rounded bg-surface-2 px-1 text-fg">x-hae-token</code> = your <code>HAE_TOKEN</code> env value.
          </li>
          <li>Metrics: Weight, Body Fat %, Lean Body Mass, BMI, Steps, Walking + Running Distance, Active Energy, Sleep. Range: since last sync. Run it once manually to test.</li>
        </ol>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-3 text-sm">
        <h2 className="mb-1 font-medium">Data</h2>
        <div className="flex flex-wrap gap-2">
          {["workouts", "sets", "cardio", "weight", "daily"].map((k) => (
            <a key={k} href={`/api/export?table=${k}`} className="rounded-lg border border-line px-3 py-1.5 text-xs" download>
              {k}.csv
            </a>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-3 text-sm">
        <h2 className="mb-1 font-medium">Session</h2>
        <p className="mb-2 text-muted">Passcode is set with the PASSCODE_HASH env var (<code>npm run passcode</code>).</p>
        <LogoutButton />
      </section>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-6 pt-4">
      <h1 className="mb-3 text-xl font-semibold">Settings</h1>
      <Suspense fallback={<div className="text-muted">Loading…</div>}>
        <Loader />
      </Suspense>
    </main>
  );
}
