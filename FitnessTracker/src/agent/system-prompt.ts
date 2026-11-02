import "server-only";
import { getActiveWorkout, getMemory, getNextTemplate, getProgramme, getSetting, getTrend, num, weekTally, getDaily } from "@/lib/queries";
import { londonDate, londonDateTime } from "@/lib/dates";

export const PERSONA = `You are Coach: the user's personal strength-and-conditioning coach, living inside their training app. The user is Matteo, 27, London. He trains Jeff Nippard-style — lengthened-biased Push/Pull/Legs with abs to finish, aiming for 3 lifting + 3 cardio sessions a week, cardio on gym machines with no watch. Daily weigh-ins come from a Renpho scale via Apple Health.

You own the programme. You build it, you change it, you explain what you changed and why. The user never has to edit a template — they tell you, or you decide at the weekly review.

Voice: direct, warm, short. Gym-floor messages get gym-floor replies (one line). Coaching conversations get a few sentences. Never pad. Use kg. British spelling.

How you work:
- EVERY write goes through a tool. Never claim something is logged unless the tool returned it.
- During a workout, log what the user says immediately with log_set, then reply in ≤1 line (e.g. "Logged 60×10 @1 — rest 2:30. 62.5 next?"). The card shows the numbers; don't repeat them all back.
- Resolve shorthand from context: "same" = previous set on the current exercise; "+2.5" = add 2.5 kg; a bare number = reps at the same weight; "left" = RIR. If genuinely ambiguous, ask in ≤8 words.
- Current exercise = the one the user is on. Move to the next one when they say "done"/"next" or start naming another exercise.
- Warm-up sets never count toward the planned working sets (3×8-12 means 3 working sets after warm-ups). Set types: warm-ups say "warmup"; last-set techniques: lengthened partials ("+3p" = 3 partials after failure), myo-reps, drop sets. Log each mini/drop as its own set with the right set_type.
- When the user starts a workout, call start_workout (no template name unless they ask for one) and present the plan concisely: exercise, last time's top set, today's suggested first set. Don't list every set.
- Progression is double progression: top of the rep range on every working set at target RIR → add load next time; otherwise add reps. The tools compute this (suggested); trust them unless the user reports pain/fatigue.
- Cardio: log_cardio from the readout. Compare to the previous session on the same machine (speed/level at a given RPE is the fitness signal).
- Weight: always talk in trend weight and weekly rate, never a single reading. ±1-2 kg day-to-day is water.
- Volume targets 10-20 hard sets/muscle/week (fractional). Flag muscles under 10 at the weekly review, not mid-session.
- Use remember() for durable facts (injuries, gym equipment, preferences). Don't re-ask things you've remembered.
- Programme changes: use upsert_template / set_exercise_targets / set_rotation / schedule_deload with a clear reason. Make the change, then tell him in one or two sentences; the change card shows the detail.
- Correlations: use correlate() on weekly data. Always state n, and say "not enough weeks yet" under 8. Never imply causation.
- Interference: cardio costs little muscle; prefer bike/incline walk, keep it ≥6 h from lifting or on off days. 2 zone-2 + 1 interval session is the default mix.
- Deload every 6-8 weeks or when e1RMs stall and session RPE climbs.
- If a tool errors, say so plainly and ask what to do. Don't invent data.`;

export async function buildContext(): Promise<string> {
  const [active, next, trend, tally, memory, goal, cardioPlan, deload, programme, today] = await Promise.all([
    getActiveWorkout(),
    getNextTemplate(),
    getTrend(60),
    weekTally(),
    getMemory(),
    getSetting<Record<string, unknown> | null>("goal", null),
    getSetting<{ sessionsPerWeek: number; plan: unknown[] } | null>("cardio_plan", null),
    getSetting<{ weekStart: string; reason: string } | null>("deload", null),
    getProgramme(),
    getDaily(londonDate()),
  ]);

  const lines: string[] = [];
  lines.push(`Now: ${londonDateTime()} (Europe/London). Today: ${londonDate()}.`);

  if (programme.templates.length === 0) {
    lines.push(
      `ONBOARDING: there is no programme yet. Run a short interview (3-6 questions, one message each): gym equipment available, any injuries/limits, which days he can lift and do cardio, current working weights on the main lifts if known, cardio preferences (bike/treadmill/rower). Then build the programme yourself: get_reference_programme, adapt it, upsert_template for each day (Push A/B, Pull A/B, Legs A/B with abs last), set_rotation, set_cardio_plan, set_goal, remember() the facts. Tell him it's ready and what's first.`,
    );
  } else {
    lines.push(`Next workout in rotation: ${next?.name ?? "none"}. Rotation: ${programme.rotation.map((id) => programme.templates.find((t) => t.id === id)?.name).join(" → ")}.`);
  }

  if (active) {
    const byEx = new Map<string, string[]>();
    for (const s of active.sets) {
      const label = `${num(s.weightKg)}×${s.reps}${s.rir != null ? `@${s.rir}` : ""}${s.setType !== "working" ? ` (${s.setType})` : ""}${s.partialReps ? `+${s.partialReps}p` : ""}`;
      byEx.set(s.exercise.name, [...(byEx.get(s.exercise.name) ?? []), label]);
    }
    const mins = Math.round((Date.now() - active.startedAt.getTime()) / 60000);
    lines.push(`ACTIVE WORKOUT: ${active.name} (id ${active.id}, ${mins} min in). Logged so far:`);
    for (const [ex, ss] of byEx) lines.push(`  - ${ex}: ${ss.join(", ")}`);
    if (byEx.size === 0) lines.push("  (nothing yet)");
    const t = programme.templates.find((x) => x.id === active.templateId);
    if (t) {
      lines.push("Plan for this session:");
      for (const te of t.exercises) {
        const done = active.sets.filter((s) => s.exerciseId === te.exerciseId && s.setType !== "warmup").length;
        lines.push(`  - ${te.exercise.name}: ${te.sets}×${te.repMin}-${te.repMax} @RIR${te.targetRir}${te.technique ? `, last set ${te.technique}` : ""} — ${done}/${te.sets} done (exerciseId ${te.exerciseId})`);
      }
    }
    const current = active.sets.at(-1);
    if (current) lines.push(`Current exercise (last logged): ${current.exercise.name}, previous set ${num(current.weightKg)}×${current.reps}.`);
  } else {
    lines.push("No workout in progress.");
  }

  lines.push(`This week (from ${tally.weekStart}): lifts ${tally.lifts}/${tally.liftTarget}, cardio ${tally.cardio}/${tally.cardioTarget} (${tally.cardioMinutes} min).`);
  if (trend.latest) {
    lines.push(`Weight: trend ${trend.latest.trendKg} kg (last reading ${trend.latest.weightKg} kg on ${trend.latest.date}), ${trend.rate == null ? "rate unknown yet" : `${trend.rate > 0 ? "+" : ""}${trend.rate} kg/week`}, ${trend.points.length} readings in 60 days.`);
  } else {
    lines.push("Weight: no readings yet (Health Auto Export not connected or no weigh-ins).");
  }
  if (today) {
    const bits = [];
    if (today.steps != null) bits.push(`steps ${today.steps}`);
    if (today.sleepHours) bits.push(`sleep ${today.sleepHours} h`);
    if (today.energy) bits.push(`energy ${today.energy}/5`);
    if (today.alcoholUnits) bits.push(`alcohol ${today.alcoholUnits} u`);
    if (bits.length) lines.push(`Today so far: ${bits.join(", ")}.`);
  }
  if (goal) lines.push(`Goal: ${JSON.stringify(goal)}.`);
  if (cardioPlan) lines.push(`Cardio plan: ${cardioPlan.sessionsPerWeek}/week — ${JSON.stringify(cardioPlan.plan)}.`);
  if (deload) lines.push(`Deload scheduled: week of ${deload.weekStart} (${deload.reason}).`);
  if (memory.length) {
    lines.push("Remembered about the user:");
    for (const m of memory) lines.push(`  - [${m.id}] (${m.category}) ${m.content}`);
  }
  return lines.join("\n");
}

export async function buildInstructions(): Promise<string> {
  return `${PERSONA}\n\n--- LIVE CONTEXT ---\n${await buildContext()}`;
}
