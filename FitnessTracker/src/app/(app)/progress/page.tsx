import { Suspense } from "react";
import { connection } from "next/server";
import { progressData } from "@/lib/dashboard";
import { ProgressCharts } from "@/components/progress-charts";

async function Loader() {
  await connection();
  const data = await progressData();
  return <ProgressCharts data={data} />;
}

export default function ProgressPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-6 pt-4">
      <h1 className="mb-3 text-xl font-semibold">Progress</h1>
      <Suspense fallback={<div className="text-muted">Loading…</div>}>
        <Loader />
      </Suspense>
    </main>
  );
}
