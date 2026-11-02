"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    setBusy(false);
    if (res.ok) {
      router.replace(params.get("next") || "/");
      router.refresh();
    } else {
      setError("Wrong passcode");
    }
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-xs flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Coach</h1>
        <p className="text-sm text-muted">Enter your passcode.</p>
      </div>
      <input
        type="password"
        inputMode="numeric"
        autoComplete="current-password"
        autoFocus
        value={passcode}
        onChange={(e) => setPasscode(e.target.value)}
        className="rounded-xl border border-line bg-surface px-4 py-3 text-lg outline-none focus:border-accent"
        placeholder="Passcode"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={busy || !passcode}
        className="rounded-xl bg-accent px-4 py-3 font-medium text-black disabled:opacity-50"
      >
        {busy ? "Checking…" : "Unlock"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
