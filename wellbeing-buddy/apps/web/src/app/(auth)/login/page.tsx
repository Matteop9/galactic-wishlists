"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"magic" | "password">("magic");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();

    if (mode === "password") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        router.push("/app/dashboard");
      }
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold mb-1">Wellbeing Buddy</h1>
        <p className="text-[var(--color-text-muted)] mb-8 text-sm">Your daily health companion.</p>

        {sent ? (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-3">
            <p className="text-sm">Check your email — a link is on its way to <strong>{email}</strong>.</p>
            <button onClick={() => { setSent(false); setMode("password"); }} className="text-xs text-[var(--color-text-muted)] underline">
              Use password instead
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-[var(--color-text-muted)] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)] transition-colors"
              />
            </div>

            {mode === "password" && (
              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)] transition-colors"
                />
              </div>
            )}

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[var(--color-accent)] text-white py-2.5 text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
            >
              {loading ? "…" : mode === "password" ? "Sign in" : "Send magic link"}
            </button>

            <button
              type="button"
              onClick={() => { setMode(mode === "magic" ? "password" : "magic"); setError(""); }}
              className="w-full text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              {mode === "magic" ? "Sign in with password instead" : "Send magic link instead"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
