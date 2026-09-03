"use client";

import { useEffect } from "react";
import Link from "next/link";
import { reportClientError } from "@/lib/reportClientError";
import Mascot from "@/components/Mascot";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="w-full rounded-xl border-2 border-dashed border-paper-edge bg-paper-deep p-8">
        {/* Companion softens the crash (handoff: sad, 160 px). The copy below already
            carries her line, so no bubble here. */}
        <div className="mb-3 flex justify-center">
          <Mascot pose="sad" size={120} />
        </div>
        <div className="font-display text-xs font-bold uppercase tracking-[0.25em] text-stamp">
          Turbulence
        </div>
        <h1 className="mt-2 font-display text-2xl font-bold uppercase tracking-wide text-ink">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          That page hit a pocket of rough air. Your logbook is safe — try again, or head back
          to base.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-[11px] uppercase text-ink-faint">
            ref {error.digest}
          </p>
        )}
        <div className="mt-6 flex flex-col items-center gap-3">
          <button onClick={reset} className="sd-btn sd-btn--capture">
            Try again
          </button>
          <Link href="/" className="font-mono text-xs font-semibold uppercase text-sky-deep underline">
            Back to base
          </Link>
        </div>
      </div>
    </main>
  );
}
