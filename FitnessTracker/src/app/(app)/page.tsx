import { Suspense } from "react";
import { connection } from "next/server";
import { Chat } from "@/components/chat";
import { loadRecentMessages } from "@/lib/chat-store";
import { buildPad } from "@/lib/pad";
import { getActiveWorkout, getNextTemplate, getTrend, weekTally } from "@/lib/queries";

async function ChatLoader() {
  await connection(); // request-time data, never prerendered
  const [messages, active, next, trend, tally] = await Promise.all([
    loadRecentMessages(),
    getActiveWorkout(),
    getNextTemplate(),
    getTrend(60),
    weekTally(),
  ]);
  const pad = active ? await buildPad(active) : null;
  return (
    <Chat
      initialMessages={messages}
      header={{
        activeWorkout: active ? { id: active.id, name: active.name, startedAt: active.startedAt.toISOString(), sets: active.sets.filter((s) => s.setType !== "warmup").length } : null,
        nextWorkout: next?.name ?? null,
        trendKg: trend.latest?.trendKg ?? null,
        rateKg: trend.rate,
        lifts: tally.lifts,
        cardio: tally.cardio,
        liftTarget: tally.liftTarget,
        cardioTarget: tally.cardioTarget,
        pad,
      }}
    />
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-muted">Loading…</div>}>
      <ChatLoader />
    </Suspense>
  );
}
