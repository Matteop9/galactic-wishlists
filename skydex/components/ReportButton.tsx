"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ReportButton({
  targetType,
  targetId,
  currentUserId,
  className = "",
}: {
  targetType: "sighting" | "comment";
  targetId: string;
  currentUserId: string | null;
  className?: string;
}) {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!currentUserId) return null;

  async function report() {
    const reason = window.prompt("Report this — what's wrong? (optional)");
    if (reason === null) return; // cancelled
    setBusy(true);
    const supabase = createClient();
    await supabase.from("reports").insert({
      reporter_id: currentUserId,
      target_type: targetType,
      target_id: targetId,
      reason: reason || null,
    });
    setBusy(false);
    setDone(true);
  }

  return (
    <button onClick={report} disabled={busy || done} className={className}>
      {done ? "Reported" : "Report"}
    </button>
  );
}
