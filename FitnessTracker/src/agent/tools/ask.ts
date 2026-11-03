import { tool } from "ai";
import { z } from "zod";

// A structured question. The card renders a one-tap form; the answers come back
// as the user's next message ("Energy 3/5 · 45 min · left shoulder a bit sore"),
// so the model needs no special handling — it just reads the reply.

const fieldSchema = z.object({
  key: z.string().describe("Short identifier, e.g. 'energy'"),
  label: z.string().describe("What the user sees, e.g. 'Energy'"),
  kind: z.enum(["scale", "choice", "number", "minutes", "text"]),
  min: z.number().optional().describe("scale/number lower bound (scale default 1)"),
  max: z.number().optional().describe("scale/number upper bound (scale default 5)"),
  options: z.array(z.string()).optional().describe("choice: the chips to show, e.g. ['30','45','60','75+']"),
  unit: z.string().optional().describe("Shown after number/minutes, e.g. 'kg'"),
  placeholder: z.string().optional().describe("text: hint"),
  optional: z.boolean().optional().describe("User may leave it blank"),
});

export type AskField = z.infer<typeof fieldSchema>;
export type AskSpec = { title?: string; fields: AskField[]; submit_label?: string };

export const askTools = {
  ask: tool({
    description:
      "Show a tap-to-answer form instead of asking in words whenever you need one to four data points from the user (energy, time available, RIR, reps, a yes/no choice, a soreness note). Use it for the pre-session check-in. The answers arrive as the user's next message. Keep it to the fields you actually need.",
    inputSchema: z.object({
      title: z.string().optional().describe("One short line above the fields"),
      fields: z.array(fieldSchema).min(1).max(4),
      submit_label: z.string().optional(),
    }),
    execute: async (spec) => ({ asked: true, ...spec }),
  }),
};
