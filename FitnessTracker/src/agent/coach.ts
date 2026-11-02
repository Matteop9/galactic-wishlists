import "server-only";
import { ToolLoopAgent, isStepCount, type InferAgentUIMessage } from "ai";
import { workoutTools } from "./tools/workout";
import { cardioTools } from "./tools/cardio";
import { bodyTools } from "./tools/body";
import { programmeTools } from "./tools/programme";
import { memoryTools } from "./tools/memory";
import { analysisTools } from "./tools/analysis";
import { buildInstructions } from "./system-prompt";

export const coachTools = {
  ...workoutTools,
  ...cardioTools,
  ...bodyTools,
  ...programmeTools,
  ...memoryTools,
  ...analysisTools,
};

import { createAnthropic } from "@ai-sdk/anthropic";

// Vercel AI Gateway by default (AI_GATEWAY_API_KEY, or OIDC on Vercel).
// Set ANTHROPIC_API_KEY to bypass the gateway and call Anthropic directly.
const GATEWAY_MODELS = { coach: "anthropic/claude-sonnet-5.5", fast: "anthropic/claude-haiku-5.5" } as const;
const DIRECT_MODELS = { coach: "claude-sonnet-5-5", fast: "claude-haiku-5-5" } as const;

export type ModelTier = keyof typeof GATEWAY_MODELS;

export function modelFor(tier: ModelTier) {
  if (process.env.ANTHROPIC_API_KEY) return createAnthropic()(DIRECT_MODELS[tier]);
  return GATEWAY_MODELS[tier];
}

/** Instructions are rebuilt per request so the live context is fresh. */
export async function createCoach(tier: ModelTier = "coach", extraInstructions = "") {
  const instructions = (await buildInstructions()) + (extraInstructions ? `\n\n${extraInstructions}` : "");
  return new ToolLoopAgent({
    model: modelFor(tier),
    instructions,
    tools: coachTools,
    stopWhen: isStepCount(tier === "fast" ? 4 : 12),
  });
}

export type CoachAgent = Awaited<ReturnType<typeof createCoach>>;
export type CoachUIMessage = InferAgentUIMessage<CoachAgent>;
