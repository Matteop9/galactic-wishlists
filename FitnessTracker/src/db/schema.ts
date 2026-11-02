import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  date,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ---------- exercise library + programme (agent-owned) ----------

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  primaryMuscle: text("primary_muscle").notNull(),
  secondaryMuscles: text("secondary_muscles").array().notNull().default([]),
  equipment: text("equipment").notNull().default("machine"),
  isUnilateral: boolean("is_unilateral").notNull().default(false),
  defaultRestS: integer("default_rest_s").notNull().default(120),
  defaultRepMin: integer("default_rep_min").notNull().default(8),
  defaultRepMax: integer("default_rep_max").notNull().default(12),
  loadIncrementKg: numeric("load_increment_kg", { precision: 5, scale: 2 }).notNull().default("2.5"),
  notes: text("notes"),
  isCustom: boolean("is_custom").notNull().default(false),
});

export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").notNull(), // push | pull | legs | upper | lower | full | other
  notes: text("notes"),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const templateExercises = pgTable(
  "template_exercises",
  {
    id: serial("id").primaryKey(),
    templateId: integer("template_id")
      .notNull()
      .references(() => templates.id, { onDelete: "cascade" }),
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => exercises.id),
    position: integer("position").notNull(),
    sets: integer("sets").notNull().default(3),
    repMin: integer("rep_min").notNull().default(8),
    repMax: integer("rep_max").notNull().default(12),
    targetRir: integer("target_rir").notNull().default(1),
    technique: text("technique"), // lengthened_partials | myo_reps | drop_set | none
    restS: integer("rest_s"),
    supersetGroup: text("superset_group"),
    targetWeightKg: numeric("target_weight_kg", { precision: 6, scale: 2 }),
    notes: text("notes"),
  },
  (t) => [index("template_exercises_template_idx").on(t.templateId)],
);

export const rotationSlots = pgTable("rotation_slots", {
  id: serial("id").primaryKey(),
  position: integer("position").notNull(),
  templateId: integer("template_id")
    .notNull()
    .references(() => templates.id, { onDelete: "cascade" }),
});

// key/value settings: next_slot, goal, cardio_plan, units, model, etc.
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- training log ----------

export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => templates.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  bodyweightKg: numeric("bodyweight_kg", { precision: 5, scale: 2 }),
  sessionRpe: integer("session_rpe"),
  notes: text("notes"),
});

export const sets = pgTable(
  "sets",
  {
    id: serial("id").primaryKey(),
    workoutId: integer("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => exercises.id),
    position: integer("position").notNull(),
    // warmup | working | top | backoff | drop | myo_activation | myo_mini | partials | failure
    setType: text("set_type").notNull().default("working"),
    weightKg: numeric("weight_kg", { precision: 6, scale: 2 }).notNull().default("0"),
    reps: integer("reps").notNull(),
    partialReps: integer("partial_reps").notNull().default(0),
    rir: integer("rir"),
    side: text("side"), // L | R | null
    tempo: text("tempo"),
    note: text("note"),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sets_workout_idx").on(t.workoutId), index("sets_exercise_idx").on(t.exerciseId)],
);

export const cardioSessions = pgTable("cardio_sessions", {
  id: serial("id").primaryKey(),
  performedAt: timestamp("performed_at", { withTimezone: true }).notNull().defaultNow(),
  // treadmill | bike | rower | elliptical | stairmaster | walk_outdoor | run_outdoor | other
  machine: text("machine").notNull(),
  kind: text("kind").notNull().default("steady"), // zone2 | intervals | steady | walk
  durationMin: numeric("duration_min", { precision: 6, scale: 1 }).notNull(),
  distanceKm: numeric("distance_km", { precision: 6, scale: 2 }),
  inclinePct: numeric("incline_pct", { precision: 4, scale: 1 }),
  level: integer("level"),
  avgSpeedKmh: numeric("avg_speed_kmh", { precision: 5, scale: 2 }),
  calories: integer("calories"),
  avgHr: integer("avg_hr"),
  rpe: integer("rpe"),
  notes: text("notes"),
});

// ---------- body + daily ----------

export const bodyMetrics = pgTable(
  "body_metrics",
  {
    id: serial("id").primaryKey(),
    date: date("date").notNull(),
    source: text("source").notNull().default("manual"), // hae | manual
    weightKg: numeric("weight_kg", { precision: 5, scale: 2 }),
    bodyFatPct: numeric("body_fat_pct", { precision: 4, scale: 1 }),
    leanMassKg: numeric("lean_mass_kg", { precision: 5, scale: 2 }),
    bmi: numeric("bmi", { precision: 4, scale: 1 }),
    raw: jsonb("raw"),
  },
  (t) => [uniqueIndex("body_metrics_date_source").on(t.date, t.source)],
);

export const dailyMetrics = pgTable("daily_metrics", {
  id: serial("id").primaryKey(),
  date: date("date").notNull().unique(),
  steps: integer("steps"),
  walkingKm: numeric("walking_km", { precision: 6, scale: 2 }),
  activeKcal: integer("active_kcal"),
  sleepHours: numeric("sleep_hours", { precision: 4, scale: 1 }),
  energy: integer("energy"), // 1-5
  alcoholUnits: numeric("alcohol_units", { precision: 4, scale: 1 }),
  proteinG: integer("protein_g"),
  calories: integer("calories"),
  notes: text("notes"),
});

export const measurements = pgTable("measurements", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  site: text("site").notNull(), // waist | chest | arm_l | arm_r | thigh_l | thigh_r | hips | neck
  valueCm: numeric("value_cm", { precision: 5, scale: 1 }).notNull(),
});

// ---------- agent ----------

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    role: text("role").notNull(),
    parts: jsonb("parts").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("messages_created_idx").on(t.createdAt)],
);

export const coachMemory = pgTable("coach_memory", {
  id: serial("id").primaryKey(),
  category: text("category").notNull().default("general"), // injury | preference | equipment | goal | schedule | general
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const programmeChanges = pgTable("programme_changes", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  actor: text("actor").notNull().default("coach"), // coach | weekly_review | onboarding | user
  summary: text("summary").notNull(),
  reason: text("reason"),
  diff: jsonb("diff"),
});

export const agentRuns = pgTable("agent_runs", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull(), // morning_brief | weekly_review
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: text("status").notNull().default("running"),
  summary: text("summary"),
  error: text("error"),
});

export type Exercise = typeof exercises.$inferSelect;
export type Template = typeof templates.$inferSelect;
export type TemplateExercise = typeof templateExercises.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type SetRow = typeof sets.$inferSelect;
export type CardioSession = typeof cardioSessions.$inferSelect;
export type BodyMetric = typeof bodyMetrics.$inferSelect;
export type DailyMetric = typeof dailyMetrics.$inferSelect;
