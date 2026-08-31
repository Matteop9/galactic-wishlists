"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Public support form — works signed-out. Submissions land in the shared
// feedback queue with user_id null (RLS: feedback_insert_support), so they
// show up in the same admin triage view as in-app feedback.
export default function SupportForm() {
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [trap, setTrap] = useState(""); // honeypot — bots fill it, people never see it
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || busy) return;
    if (trap) {
      // Pretend success for bots; nothing is stored.
      setDone(true);
      return;
    }
    setBusy(true);
    setError(null);
    const contact = email.trim();
    const composed = `[support]${contact ? ` reply-to: ${contact} —` : ""} ${text}`;
    const supabase = createClient();
    const { error } = await supabase
      .from("feedback")
      .insert({ user_id: null, body: composed.slice(0, 2200) });
    setBusy(false);
    if (error) setError("Something went wrong sending that — please try again.");
    else {
      setDone(true);
      setBody("");
    }
  }

  if (done) {
    return (
      <p className="rounded-lg border border-paper-edge bg-paper-deep p-4 text-sm text-sky">
        Thanks — your message has been sent to the team.
        {email.trim() ? " We'll reply to the email you gave." : ""}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input
        type="text"
        value={trap}
        onChange={(e) => setTrap(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        maxLength={200}
        placeholder="Your email (optional — so we can reply)"
        className="rounded-md border border-paper-edge bg-paper-deep px-3 py-2 text-sm text-ink outline-none focus:border-sky"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        maxLength={2000}
        required
        placeholder="Your question or problem — include your username if it's about your account."
        className="rounded-md border border-paper-edge bg-paper-deep px-3 py-2 text-sm text-ink outline-none focus:border-sky"
      />
      {error && <p className="text-sm text-stamp">{error}</p>}
      <button
        type="submit"
        disabled={busy || !body.trim()}
        className="sd-btn sd-btn--capture self-start"
      >
        {busy ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
