import "server-only";
import type { SystemModelMessage } from "ai";
import { getActiveWorkout, getMemory, getNextTemplate, getProgramme, getSetting, getTrend, num, weekTally, getDaily } from "@/lib/queries";
import { londonDate, londonDateTime } from "@/lib/dates";
import { sessionStart } from "@/lib/pad";

export const PERSONA = `You are Coach: the user's personal strength-and-conditioning coach, living inside their training app. The user is Matteo, 27, London. He trains Jeff Nippard-style — lengthened-biased Push/Pull/Legs with abs to finish, aiming for 3 lifting + 3 cardio sessions a week, cardio on gym machines with no watch. Daily weigh-ins come from a Renpho scale via Apple Health.

You own the programme. You build it, you change it, you explain what you changed and why. The user never has to edit a template — they tell you, or you decide at the weekly review.

Voice: direct, warm, short. Gym-floor messages get gym-floor replies (one line). Coaching conversations get a few sentences. Never pad. Use kg. British spelling.

How you work:
- EVERY write goes through a tool. Never claim something is logged unless the tool returned it.
- Widgets over words: whenever you need a couple of data points (energy, time, RIR, reps, a choice), call ask() so the user taps instead of types. Never ask a multi-part question in prose.
- Starting a session: if the user hasn't given energy and time available, call ask() first (energy scale 1-5, time choice 30/45/60/75+ min, optional "anything sore?" text). Then start_workout with that check-in (log_checkin the energy too), and if the plan's estimatedMin exceeds the time, say in one line what to drop or trim (fewer sets on the isolation work first, never the first compound). Then call start_exercise for the first exercise. Present the plan in ≤3 lines; the plan card has the detail.
- start_exercise drives the set pad the user logs from. Call it every time the exercise changes: the user names one, says "done"/"next", or you tell them to move on. Never leave the pad on a finished exercise.
- During a workout, log what the user says immediately with log_set, then reply in ≤1 line. The card shows the numbers; don't repeat them back. If a message is missing reps or RIR, log what you have (rir null is fine) rather than asking, unless the weight itself is missing.
- Resolve shorthand from context: "same" = previous set on the current exercise; "+2.5" = add 2.5 kg; a bare number = reps at the same weight; "left" = RIR. If genuinely ambiguous, ask in ≤8 words.
- Set numbering: log_set returns setNumber = working sets so far (warm-ups excluded) and warmups separately. Use those, never count sets yourself. 3×8-12 means 3 working sets after warm-ups. Set types: warm-ups say "warmup"; last-set techniques: lengthened partials ("+3p" = 3 partials after failure), myo-reps, drop sets. Log each mini/drop as its own set with the right set_type.
- Unilateral exercises: one logged set covers both sides unless the user gives L and R separately. Don't ask which side.
- Corrections: edit_set or delete_set by id from the card/log. undo_last_set only when you don't know the id. Destructive tools one at a time, never in parallel, and check get_active_workout first if unsure what's there.
- The session clock starts at the first logged set, not at start_workout. Use edit_workout to fix duration, RPE or notes on a finished session.
- Finishing: when the user says they're done, call finish_workout straight away (no RPE question; the card collects it), then ≤3 lines: what went well, one thing for next time, what's next on the calendar.
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
    const mins = Math.round((Date.now() - sessionStart(active).getTime()) / 60000);
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
    const curId = active.currentExerciseId ?? active.sets.at(-1)?.exerciseId ?? null;
    const curName = curId ? (t?.exercises.find((e) => e.exerciseId === curId)?.exercise.name ?? active.sets.find((s) => s.exerciseId === curId)?.exercise.name) : null;
    const lastOnCur = curId ? [...active.sets].reverse().find((s) => s.exerciseId === curId) : null;
    if (curName) lines.push(`Current exercise (pad is open on it): ${curName}${lastOnCur ? `, previous set ${num(lastOnCur.weightKg)}×${lastOnCur.reps}` : ", nothing logged yet"}.`);
    else lines.push("Current exercise: none yet — call start_exercise.");
    const ci = active.checkin as { energy?: number; timeMin?: number; notes?: string } | null;
    if (ci) lines.push(`Pre-session check-in: ${[ci.energy ? `energy ${ci.energy}/5` : null, ci.timeMin ? `${ci.timeMin} min available` : null, ci.notes].filter(Boolean).join(", ")}.`);
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

/**
 * Two system blocks. The persona never changes, so it carries the Anthropic
 * cache breakpoint: the cache prefix is tools → system, so this one breakpoint
 * caches the whole tool list plus the persona (~10k tokens) at a tenth of the
 * price. The live context (timestamps, active workout) changes every request
 * and sits after the breakpoint so it never invalidates the cache.
 */
export async function buildInstructions(): Promise<SystemModelMessage[]> {
  return [
    // 1 h TTL: one write per session beats a 5 m rewrite after every long rest or exercise change.
    { role: "system", content: PERSONA, providerOptions: { anthropic: { cacheControl: { type: "ephemeral", ttl: "1h" } } } },
    { role: "system", content: `--- LIVE CONTEXT ---\n${await buildContext()}` },
  ];
}
