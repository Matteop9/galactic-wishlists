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
  const [failed, setFailed] = useState(false);

  if (!currentUserId) return null;

  async function report() {
    const reason = window.prompt("Report this — what's wrong? (optional)");
    if (reason === null) return; // cancelled
    setBusy(true);
    setFailed(false);
    const supabase = createClient();
    const { error } = await supabase.from("reports").insert({
      reporter_id: currentUserId,
      target_type: targetType,
      target_id: targetId,
      // DB caps reason at 500 chars; trim here so a long prompt entry still lands.
      reason: reason ? reason.slice(0, 500) : null,
    });
    setBusy(false);
    if (error) {
      // Don't show "Reported" for a report that never landed.
      setFailed(true);
      return;
    }
    setDone(true);
  }

  return (
    <button onClick={report} disabled={busy || done} className={className}>
      {done ? "Reported" : failed ? "Failed — retry" : "Report"}
    </button>
  );
}
