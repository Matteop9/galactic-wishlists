// Client-side error reporter used by the error boundaries. Fire-and-forget to
// /api/client-error, which relays into the same server monitor. Must never
// throw — a failing reporter inside an error boundary would loop.
export function reportClientError(error: unknown) {
  try {
    const e = error as { message?: unknown; stack?: unknown; digest?: unknown };
    const body = JSON.stringify({
      message:
        typeof e?.message === "string" && e.message
          ? e.message.slice(0, 500)
          : String(error).slice(0, 500),
      stack: typeof e?.stack === "string" ? e.stack.slice(0, 4000) : undefined,
      digest: typeof e?.digest === "string" ? e.digest : undefined,
      url: typeof window !== "undefined" ? window.location.href.slice(0, 300) : undefined,
    });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/client-error", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/client-error", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Swallow everything — see above.
  }
}
