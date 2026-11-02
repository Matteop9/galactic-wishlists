import { createAgentUIStreamResponse, generateId, type UIMessage } from "ai";
import { createCoach, type ModelTier } from "@/agent/coach";
import { loadRecentMessages, saveMessage } from "@/lib/chat-store";
import { getActiveWorkout } from "@/lib/queries";

export const maxDuration = 120;

type Body = { message?: UIMessage; messages?: UIMessage[]; tier?: ModelTier };

/** Short messages during a live workout go to the fast model; everything else to the coach. */
function pickTier(text: string, inWorkout: boolean, requested?: ModelTier): ModelTier {
  if (requested) return requested;
  if (inWorkout && text.length <= 80 && !/why|should|plan|programme|change|swap|think|week/i.test(text)) return "fast";
  return "coach";
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  // The client sends only the newest message; history lives in the DB.
  const incoming = body.message ?? body.messages?.at(-1);
  if (!incoming) return Response.json({ error: "No message" }, { status: 400 });
  if (!incoming.id) incoming.id = generateId();

  const history = await loadRecentMessages();
  await saveMessage(incoming);
  const uiMessages = [...history.filter((m) => m.id !== incoming.id), incoming];

  const text = incoming.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join(" ");
  const active = await getActiveWorkout();
  const tier = pickTier(text, !!active, body.tier);
  const agent = await createCoach(tier);

  return createAgentUIStreamResponse({
    agent,
    uiMessages,
    abortSignal: req.signal,
    generateMessageId: () => generateId(),
    onUIMessageStepEnd: async ({ responseMessage }) => {
      await saveMessage(responseMessage as UIMessage);
    },
    onEnd: async ({ responseMessage }) => {
      if (responseMessage) await saveMessage(responseMessage as UIMessage);
    },
    onError: (e) => {
      console.error("chat error", e);
      return "Coach hit a snag. Try again in a moment.";
    },
  });
}
