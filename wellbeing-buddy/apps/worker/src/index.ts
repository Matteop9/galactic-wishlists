import { HaePayloadSchema } from "@wellbeing/shared";
import { parseHaePayload } from "./lib/parse-hae";
import { upsertHealthMetrics } from "./lib/supabase";

export interface Env {
  WEBHOOK_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Only accept POST to /health
    if (request.method !== "POST" || url.pathname !== "/health") {
      return new Response("Not found", { status: 404 });
    }

    // Validate shared secret
    const token = url.searchParams.get("token");
    if (!token || token !== env.WEBHOOK_SECRET) {
      return new Response("Unauthorised", { status: 401 });
    }

    // Require a user_id query param so we know whose data this is
    const userId = url.searchParams.get("user_id");
    if (!userId) {
      return new Response("Missing user_id", { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const parsed = HaePayloadSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Payload validation failed", issues: parsed.error.issues }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const rowsByDate = parseHaePayload(parsed.data, userId);
    const rows = Array.from(rowsByDate.values());

    if (rows.length === 0) {
      return new Response(JSON.stringify({ inserted: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      await upsertHealthMetrics(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, rows);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return new Response(JSON.stringify({ error: msg }), { status: 502, headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ inserted: rows.length }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
} satisfies ExportedHandler<Env>;
