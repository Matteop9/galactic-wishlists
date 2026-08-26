// Server-side error capture. Every error is logged to the console (Vercel logs);
// when SENTRY_DSN is set, it is also forwarded to Sentry as a bare envelope —
// no SDK, so nothing here can affect the build or the request path. Failures in
// the reporter itself are swallowed: monitoring must never break a request.

type ErrorContext = Record<string, unknown>;

function parseDsn(dsn: string): { url: string } | null {
  try {
    const u = new URL(dsn);
    const projectId = u.pathname.replaceAll("/", "");
    if (!u.username || !projectId) return null;
    // The public key travels inside the envelope header's dsn field.
    return { url: `${u.protocol}//${u.host}/api/${projectId}/envelope/` };
  } catch {
    return null;
  }
}

export async function captureServerError(error: unknown, context: ErrorContext = {}) {
  const e = error instanceof Error ? error : new Error(String(error));
  console.error("[monitor]", e.name, e.message, JSON.stringify(context), e.stack);

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  const parsed = parseDsn(dsn);
  if (!parsed) return;

  const eventId = crypto.randomUUID().replaceAll("-", "");
  const sentAt = new Date().toISOString();
  const event = {
    event_id: eventId,
    timestamp: sentAt,
    platform: "javascript",
    level: "error",
    environment: process.env.VERCEL_ENV ?? "development",
    release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12),
    exception: {
      values: [{ type: e.name || "Error", value: e.message.slice(0, 1000) }],
    },
    extra: { ...context, stack: e.stack?.slice(0, 8000) },
  };
  const envelope =
    JSON.stringify({ event_id: eventId, sent_at: sentAt, dsn }) +
    "\n" +
    JSON.stringify({ type: "event" }) +
    "\n" +
    JSON.stringify(event) +
    "\n";

  try {
    await fetch(parsed.url, {
      method: "POST",
      headers: { "content-type": "application/x-sentry-envelope" },
      body: envelope,
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Already in the console log above; nothing more to do.
  }
}
