import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are a knowledgeable friend helping someone optimise their health, training, and recovery.
Be concise, warm, and occasionally dry. No exclamation marks. No hype. If rest is the right call, say rest.
British English. Keep responses short — 2–4 sentences unless the user asks for more.`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorised", { status: 401 });

  const { messages, date } = await request.json() as {
    messages: { role: "user" | "assistant"; content: string }[];
    date: string;
  };

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-5",
    max_tokens: 512,
    system: SYSTEM,
    messages,
  });

  // Save updated conversation after streaming completes (fire-and-forget from stream end)
  stream.on("finalMessage", async (msg) => {
    const assistantText = msg.content.find((b) => b.type === "text")?.text ?? "";
    const updated = [...messages, { role: "assistant", content: assistantText }];
    await supabase
      .from("daily_plans")
      .upsert({ user_id: user.id, date, morning_conversation: updated }, { onConflict: "user_id,date" });
  });

  return new Response(stream.toReadableStream(), {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}
