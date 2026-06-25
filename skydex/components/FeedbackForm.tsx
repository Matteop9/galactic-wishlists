"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function FeedbackForm({ userId }: { userId: string }) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("feedback").insert({ user_id: userId, body: text });
    setBusy(false);
    if (error) setError(error.message);
    else {
      setDone(true);
      setBody("");
    }
  }

  return (
    <div className="mt-10 rounded-lg border border-paper-edge p-4">
      <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-ink">
        Feedback
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Found a bug, or have an idea? Tell us — it goes straight to the team.
      </p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="What's on your mind?"
        className="mt-3 w-full rounded-md border border-paper-edge bg-paper-deep px-3 py-2 text-sm text-ink outline-none focus:border-sky"
      />
      {error && <p className="mt-2 text-sm text-stamp">{error}</p>}
      {done && <p className="mt-2 text-sm text-sky">Thanks — sent!</p>}
      <button
        onClick={submit}
        disabled={busy || !body.trim()}
        className="sd-btn sd-btn--capture mt-3 self-start"
      >
        {busy ? "Sending…" : "Send feedback"}
      </button>
    </div>
  );
}
