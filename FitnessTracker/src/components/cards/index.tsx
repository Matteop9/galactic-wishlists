"use client";

import type { UIMessagePart, UIDataTypes, UITools } from "ai";
import { SetCard } from "./set-card";
import { WorkoutPlanCard } from "./workout-plan-card";
import { WorkoutSummaryCard } from "./workout-summary-card";
import { StartExerciseCard } from "./start-exercise-card";
import { AskCard } from "./ask-card";
import { CardioCard } from "./cardio-card";
import { WeightCard } from "./weight-card";
import { ChartCard } from "./chart-card";
import { ProgrammeChangeCard } from "./programme-change-card";
import { Card } from "./card";

type Part = UIMessagePart<UIDataTypes, UITools>;

type ToolPart = Extract<Part, { type: `tool-${string}` }> & { input?: unknown; output?: unknown; errorText?: string; state: string; toolCallId: string };

const SILENT = new Set(["get_active_workout", "get_last_performance", "get_last_performance_batch", "get_programme", "list_exercises", "recall", "weekly_stats", "volume_by_muscle", "e1rm_history", "get_cardio_history", "get_daily", "get_reference_programme", "get_recent_workouts", "correlate", "get_weight_trend"]);

export function ToolCard({
  part,
  onRestTimer,
  interactive = false,
  onAnswer,
}: {
  part: ToolPart;
  onRestTimer?: (seconds: number, label: string) => void;
  /** True only on the newest message: forms and pickers are live there, read-only elsewhere. */
  interactive?: boolean;
  onAnswer?: (text: string) => void;
}) {
  const name = part.type.replace(/^tool-/, "");
  if (part.state === "output-error") return <Card tone="danger">Tool {name} failed: {part.errorText}</Card>;
  if (part.state !== "output-available") {
    if (SILENT.has(name)) return null;
    return <Card tone="muted">{label(name)}…</Card>;
  }
  const out = part.output as Record<string, unknown> | undefined;
  if (out && typeof out === "object" && "error" in out && out.error) return <Card tone="warn">{String(out.error)}</Card>;
  if (out && typeof out === "object" && ("omitted" in out || "truncated" in out)) return null;

  switch (name) {
    case "log_set":
      return <SetCard output={out as never} onRestTimer={onRestTimer} />;
    case "start_workout":
      return <WorkoutPlanCard output={out as never} />;
    case "start_exercise":
      return <StartExerciseCard output={out as never} />;
    case "finish_workout":
      return <WorkoutSummaryCard output={out as never} interactive={interactive} />;
    case "ask":
      return <AskCard spec={out as never} interactive={interactive} onAnswer={onAnswer} />;
    case "log_cardio":
      return <CardioCard output={out as never} />;
    case "log_weight":
      return <WeightCard output={out as never} />;
    case "render_chart":
      return <ChartCard spec={out as never} />;
    case "upsert_template":
    case "set_exercise_targets":
    case "set_rotation":
    case "set_cardio_plan":
    case "schedule_deload":
    case "archive_template":
      return <ProgrammeChangeCard name={name} output={out as never} />;
    case "edit_set":
      return <Card tone="muted">Set corrected: {fmtSet((out as { set: SetOut }).set)}</Card>;
    case "delete_set":
    case "undo_last_set":
      return <Card tone="muted">Removed {String((out as { exercise?: string }).exercise ?? "set")} {fmtSet((out as { deleted: SetOut }).deleted)}</Card>;
    case "edit_workout": {
      const o = out as { name: string; durationMin: number; sessionRpe: number | null };
      return <Card tone="muted">{o.name} updated: {o.durationMin} min{o.sessionRpe ? ` · RPE ${o.sessionRpe}` : ""}</Card>;
    }
    case "remember":
      return <Card tone="muted">Remembered: {String((out as { content: string }).content)}</Card>;
    case "forget":
      return <Card tone="muted">Forgotten.</Card>;
    case "log_checkin":
      return <Card tone="muted">Check-in saved for {String((out as { date: string }).date)}.</Card>;
    case "log_measurement": {
      const o = out as { site: string; valueCm: number };
      return <Card tone="muted">{o.site.replace("_", " ")}: {o.valueCm} cm</Card>;
    }
    case "set_goal":
      return <Card tone="muted">Goal updated.</Card>;
    case "add_exercise":
      return <Card tone="muted">Added {String((out as { added: string }).added)} to the library.</Card>;
    default:
      return null;
  }
}

export type SetOut = { id: number; setType: string; weightKg: number; reps: number; partialReps: number; rir: number | null; side: string | null };

export function fmtSet(s: SetOut | undefined): string {
  if (!s) return "";
  const w = s.weightKg === 0 ? "BW" : `${s.weightKg} kg`;
  return `${w} × ${s.reps}${s.partialReps ? `+${s.partialReps}p` : ""}${s.rir != null ? ` @${s.rir}` : ""}${s.side ? ` ${s.side}` : ""}`;
}

function label(name: string) {
  return (
    {
      start_workout: "Setting up your session",
      start_exercise: "Loading the exercise",
      log_set: "Logging set",
      finish_workout: "Wrapping up",
      log_cardio: "Logging cardio",
      upsert_template: "Rewriting the programme",
      set_rotation: "Updating the rotation",
      render_chart: "Drawing chart",
      ask: "One sec",
    }[name] ?? name.replace(/_/g, " ")
  );
}
