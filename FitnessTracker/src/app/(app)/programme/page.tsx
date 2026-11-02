import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { programmeData } from "@/lib/dashboard";
import { londonDateTime } from "@/lib/dates";

const TECH: Record<string, string> = { lengthened_partials: "lengthened partials", myo_reps: "myo-reps", drop_set: "drop set" };

async function Loader() {
  await connection();
  const p = await programmeData();
  const nextId = p.rotation.length ? p.rotation[p.nextSlot % p.rotation.length] : null;
  if (p.templates.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
        No programme yet — the coach builds it in your first conversation. <Link href="/" className="text-accent">Open the chat →</Link>
      </div>
    );
  }
  return (
    <div>
      <div className="mb-3 text-xs text-muted">
        Rotation: {p.rotation.map((id) => p.templates.find((t) => t.id === id)?.name).join(" → ")}
      </div>
      {p.templates.map((t) => (
        <section key={t.id} className={`mb-3 rounded-2xl border bg-surface p-3 ${t.id === nextId ? "border-accent/60" : "border-line"}`}>
          <div className="mb-1 flex items-baseline justify-between">
            <h2 className="font-medium">
              {t.name} {t.id === nextId && <span className="ml-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-accent">next</span>}
            </h2>
            <span className="text-xs capitalize text-muted">{t.kind}</span>
          </div>
          {t.notes && <p className="mb-1 text-xs text-muted">{t.notes}</p>}
          <ol className="divide-y divide-line">
            {t.exercises.map((e) => (
              <li key={e.id} className="flex items-baseline justify-between gap-2 py-1.5 text-sm">
                <span className="min-w-0 truncate">{e.exercise.name}</span>
                <span className="tabular shrink-0 text-xs text-muted">
                  {e.sets}×{e.repMin}–{e.repMax} @{e.targetRir}
                  {e.technique ? ` · ${TECH[e.technique] ?? e.technique}` : ""}
                  {e.targetWeightKg ? ` · ${Number(e.targetWeightKg)} kg` : ""}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ))}
      <h2 className="mb-2 mt-5 text-sm font-medium">Change log</h2>
      {p.changes.length === 0 ? (
        <p className="text-sm text-muted">No changes yet.</p>
      ) : (
        <ul className="space-y-2">
          {p.changes.map((c) => (
            <li key={c.id} className="rounded-xl border border-line bg-surface px-3 py-2 text-sm">
              <div className="flex justify-between gap-2">
                <span>{c.summary}</span>
                <span className="shrink-0 text-[11px] text-muted">{londonDateTime(c.createdAt)}</span>
              </div>
              {c.reason && <div className="mt-0.5 text-xs text-muted">{c.reason}</div>}
              <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted">{c.actor.replace("_", " ")}</div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-muted">
        Want something different? <Link href="/" className="text-accent">Tell the coach</Link> — it edits the programme itself.
      </p>
    </div>
  );
}

export default function ProgrammePage() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-6 pt-4">
      <h1 className="mb-3 text-xl font-semibold">Programme</h1>
      <Suspense fallback={<div className="text-muted">Loading…</div>}>
        <Loader />
      </Suspense>
    </main>
  );
}
