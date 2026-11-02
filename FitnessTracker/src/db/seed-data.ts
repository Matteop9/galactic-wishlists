// Exercise library seed: Nippard-style PPL staples with lengthened-bias notes.
// Muscle keys are the canonical list used for weekly volume tracking.

export const MUSCLES = [
  "chest",
  "front_delts",
  "side_delts",
  "rear_delts",
  "triceps",
  "biceps",
  "forearms",
  "lats",
  "upper_back",
  "traps",
  "lower_back",
  "quads",
  "hamstrings",
  "glutes",
  "adductors",
  "calves",
  "abs",
  "obliques",
] as const;

export type Muscle = (typeof MUSCLES)[number];

export type SeedExercise = {
  name: string;
  primaryMuscle: Muscle;
  secondaryMuscles: Muscle[];
  equipment: "barbell" | "dumbbell" | "cable" | "machine" | "smith" | "bodyweight" | "other";
  isUnilateral?: boolean;
  defaultRestS?: number;
  defaultRepMin?: number;
  defaultRepMax?: number;
  loadIncrementKg?: number;
  notes?: string;
};

const COMPOUND = { defaultRestS: 150, defaultRepMin: 6, defaultRepMax: 10, loadIncrementKg: 2.5 } as const;
const ISO = { defaultRestS: 90, defaultRepMin: 10, defaultRepMax: 15, loadIncrementKg: 1.25 } as const;
const ISO_MACHINE = { defaultRestS: 90, defaultRepMin: 10, defaultRepMax: 15, loadIncrementKg: 2.5 } as const;

export const SEED_EXERCISES: SeedExercise[] = [
  // ---- push ----
  { name: "Low-Incline Smith Press", primaryMuscle: "chest", secondaryMuscles: ["front_delts", "triceps"], equipment: "smith", ...COMPOUND, notes: "15–30° incline. Touch the chest, full stretch at the bottom." },
  { name: "Incline Dumbbell Press", primaryMuscle: "chest", secondaryMuscles: ["front_delts", "triceps"], equipment: "dumbbell", ...COMPOUND, defaultRepMin: 8, defaultRepMax: 12, loadIncrementKg: 2 },
  { name: "Flat Barbell Bench Press", primaryMuscle: "chest", secondaryMuscles: ["front_delts", "triceps"], equipment: "barbell", ...COMPOUND },
  { name: "Machine Chest Press", primaryMuscle: "chest", secondaryMuscles: ["front_delts", "triceps"], equipment: "machine", ...COMPOUND, defaultRepMin: 8, defaultRepMax: 12 },
  { name: "Pec Deck", primaryMuscle: "chest", secondaryMuscles: [], equipment: "machine", ...ISO_MACHINE, notes: "Lengthened partials on the last set — stop at the deep stretch." },
  { name: "Cable Flye", primaryMuscle: "chest", secondaryMuscles: [], equipment: "cable", ...ISO, notes: "Set pulleys low-to-mid; stretch is the point." },
  { name: "Dumbbell Flye", primaryMuscle: "chest", secondaryMuscles: [], equipment: "dumbbell", ...ISO, notes: "Lengthened partials on the last set." },
  { name: "Dips", primaryMuscle: "chest", secondaryMuscles: ["triceps", "front_delts"], equipment: "bodyweight", ...COMPOUND, defaultRepMin: 8, defaultRepMax: 12, notes: "Lean forward for chest; add weight when 12 is easy." },
  { name: "Machine Shoulder Press", primaryMuscle: "front_delts", secondaryMuscles: ["side_delts", "triceps"], equipment: "machine", ...COMPOUND, defaultRepMin: 8, defaultRepMax: 12 },
  { name: "Seated Dumbbell Shoulder Press", primaryMuscle: "front_delts", secondaryMuscles: ["side_delts", "triceps"], equipment: "dumbbell", ...COMPOUND, defaultRepMin: 8, defaultRepMax: 12, loadIncrementKg: 2 },
  { name: "Cable Lateral Raise", primaryMuscle: "side_delts", secondaryMuscles: [], equipment: "cable", ...ISO, isUnilateral: true, notes: "Cuff at the wrist, cable behind the body for a stretch at the bottom. Myo-reps on the last set." },
  { name: "Dumbbell Lateral Raise", primaryMuscle: "side_delts", secondaryMuscles: [], equipment: "dumbbell", ...ISO, loadIncrementKg: 1, notes: "Lean away or seated for the stretch." },
  { name: "Machine Lateral Raise", primaryMuscle: "side_delts", secondaryMuscles: [], equipment: "machine", ...ISO_MACHINE },
  { name: "Overhead Cable Triceps Extension", primaryMuscle: "triceps", secondaryMuscles: [], equipment: "cable", ...ISO, defaultRepMin: 10, defaultRepMax: 12, loadIncrementKg: 2.5, notes: "Long head at length — elbows high, full stretch. Drop set on the last set." },
  { name: "Cable Triceps Pressdown", primaryMuscle: "triceps", secondaryMuscles: [], equipment: "cable", ...ISO, loadIncrementKg: 2.5 },
  { name: "Skull Crusher", primaryMuscle: "triceps", secondaryMuscles: [], equipment: "barbell", ...ISO, defaultRepMin: 8, defaultRepMax: 12, loadIncrementKg: 2.5, notes: "3-second lowering, bar behind the head." },
  { name: "Dumbbell Overhead Triceps Extension", primaryMuscle: "triceps", secondaryMuscles: [], equipment: "dumbbell", ...ISO, loadIncrementKg: 2 },

  // ---- pull ----
  { name: "Weighted Pull-Up", primaryMuscle: "lats", secondaryMuscles: ["biceps", "upper_back"], equipment: "bodyweight", ...COMPOUND, notes: "Full hang at the bottom. Add weight when 10 bodyweight reps are clean." },
  { name: "Lat Pulldown", primaryMuscle: "lats", secondaryMuscles: ["biceps", "upper_back"], equipment: "cable", ...COMPOUND, defaultRepMin: 8, defaultRepMax: 12, loadIncrementKg: 2.5, notes: "Lengthened partials on the last set — top half of the ROM." },
  { name: "Wide-Grip Lat Pulldown", primaryMuscle: "lats", secondaryMuscles: ["upper_back", "biceps"], equipment: "cable", ...COMPOUND, defaultRepMin: 8, defaultRepMax: 12 },
  { name: "Chest-Supported Row", primaryMuscle: "upper_back", secondaryMuscles: ["lats", "biceps", "rear_delts"], equipment: "machine", ...COMPOUND, defaultRepMin: 8, defaultRepMax: 12, notes: "Let the shoulder blades glide forward at the bottom. Lengthened partials on the last set." },
  { name: "Seated Cable Row", primaryMuscle: "upper_back", secondaryMuscles: ["lats", "biceps"], equipment: "cable", ...COMPOUND, defaultRepMin: 8, defaultRepMax: 12 },
  { name: "Single-Arm Dumbbell Row", primaryMuscle: "lats", secondaryMuscles: ["upper_back", "biceps"], equipment: "dumbbell", ...COMPOUND, defaultRepMin: 8, defaultRepMax: 12, isUnilateral: true, loadIncrementKg: 2 },
  { name: "Kneeling Cable Pullover", primaryMuscle: "lats", secondaryMuscles: [], equipment: "cable", ...ISO, defaultRepMin: 12, defaultRepMax: 15, loadIncrementKg: 2.5, notes: "Arms long, stretch overhead." },
  { name: "Face Pull", primaryMuscle: "rear_delts", secondaryMuscles: ["upper_back"], equipment: "cable", ...ISO, defaultRepMin: 12, defaultRepMax: 20, loadIncrementKg: 2.5 },
  { name: "Reverse Pec Deck", primaryMuscle: "rear_delts", secondaryMuscles: ["upper_back"], equipment: "machine", ...ISO_MACHINE, defaultRepMin: 12, defaultRepMax: 20 },
  { name: "Dumbbell Shrug", primaryMuscle: "traps", secondaryMuscles: [], equipment: "dumbbell", ...ISO, loadIncrementKg: 2 },
  { name: "Incline Dumbbell Curl", primaryMuscle: "biceps", secondaryMuscles: [], equipment: "dumbbell", ...ISO, defaultRepMin: 8, defaultRepMax: 12, loadIncrementKg: 1, notes: "Strict, arms hanging behind the torso — the lengthened curl." },
  { name: "Bayesian Cable Curl", primaryMuscle: "biceps", secondaryMuscles: [], equipment: "cable", ...ISO, defaultRepMin: 8, defaultRepMax: 12, loadIncrementKg: 1.25, isUnilateral: true, notes: "Face away from the stack, arm behind the body." },
  { name: "Hammer Curl", primaryMuscle: "biceps", secondaryMuscles: ["forearms"], equipment: "dumbbell", ...ISO, defaultRepMin: 10, defaultRepMax: 12, loadIncrementKg: 1 },
  { name: "Preacher Curl", primaryMuscle: "biceps", secondaryMuscles: [], equipment: "machine", ...ISO, defaultRepMin: 8, defaultRepMax: 12 },

  // ---- legs ----
  { name: "Hack Squat", primaryMuscle: "quads", secondaryMuscles: ["glutes", "adductors"], equipment: "machine", ...COMPOUND, loadIncrementKg: 5, notes: "Deep — the stretch at the bottom is the stimulus." },
  { name: "Barbell Back Squat", primaryMuscle: "quads", secondaryMuscles: ["glutes", "adductors", "lower_back"], equipment: "barbell", ...COMPOUND },
  { name: "Leg Press", primaryMuscle: "quads", secondaryMuscles: ["glutes", "adductors"], equipment: "machine", ...COMPOUND, defaultRepMin: 8, defaultRepMax: 12, loadIncrementKg: 5 },
  { name: "Single-Leg Press", primaryMuscle: "quads", secondaryMuscles: ["glutes"], equipment: "machine", ...COMPOUND, defaultRepMin: 8, defaultRepMax: 12, isUnilateral: true, loadIncrementKg: 5 },
  { name: "Romanian Deadlift", primaryMuscle: "hamstrings", secondaryMuscles: ["glutes", "lower_back"], equipment: "barbell", ...COMPOUND, defaultRepMin: 8, defaultRepMax: 10, loadIncrementKg: 5, notes: "Push the hips back, bar on the legs, stop at the stretch, no bounce." },
  { name: "Dumbbell Romanian Deadlift", primaryMuscle: "hamstrings", secondaryMuscles: ["glutes", "lower_back"], equipment: "dumbbell", ...COMPOUND, defaultRepMin: 8, defaultRepMax: 12, loadIncrementKg: 2 },
  { name: "Leg Extension", primaryMuscle: "quads", secondaryMuscles: [], equipment: "machine", ...ISO_MACHINE, notes: "Lean back to lengthen the rectus femoris. 3-second lowering; lengthened partials on the last set." },
  { name: "Seated Leg Curl", primaryMuscle: "hamstrings", secondaryMuscles: [], equipment: "machine", ...ISO_MACHINE, defaultRepMin: 10, defaultRepMax: 12, notes: "Seated beats lying — hamstrings are longer at the hip. Drop set on the last set." },
  { name: "Lying Leg Curl", primaryMuscle: "hamstrings", secondaryMuscles: [], equipment: "machine", ...ISO_MACHINE },
  { name: "Nordic Curl", primaryMuscle: "hamstrings", secondaryMuscles: [], equipment: "bodyweight", ...ISO, defaultRepMin: 5, defaultRepMax: 8, loadIncrementKg: 0 },
  { name: "Hip Thrust", primaryMuscle: "glutes", secondaryMuscles: ["hamstrings"], equipment: "barbell", ...COMPOUND, defaultRepMin: 8, defaultRepMax: 12, loadIncrementKg: 5 },
  { name: "Bulgarian Split Squat", primaryMuscle: "quads", secondaryMuscles: ["glutes", "adductors"], equipment: "dumbbell", ...COMPOUND, defaultRepMin: 8, defaultRepMax: 12, isUnilateral: true, loadIncrementKg: 2 },
  { name: "Standing Calf Raise", primaryMuscle: "calves", secondaryMuscles: [], equipment: "machine", ...ISO_MACHINE, notes: "Pause 2 s at the bottom stretch. Myo-reps on the last set." },
  { name: "Seated Calf Raise", primaryMuscle: "calves", secondaryMuscles: [], equipment: "machine", ...ISO_MACHINE },
  { name: "Leg Press Calf Raise", primaryMuscle: "calves", secondaryMuscles: [], equipment: "machine", ...ISO_MACHINE, loadIncrementKg: 5 },
  { name: "Hip Adduction Machine", primaryMuscle: "adductors", secondaryMuscles: [], equipment: "machine", ...ISO_MACHINE },

  // ---- abs finishers ----
  { name: "Cable Crunch", primaryMuscle: "abs", secondaryMuscles: [], equipment: "cable", ...ISO, loadIncrementKg: 2.5, notes: "Kneeling, hips still, crunch the ribs to the pelvis." },
  { name: "Hanging Leg Raise", primaryMuscle: "abs", secondaryMuscles: ["obliques"], equipment: "bodyweight", ...ISO, defaultRepMin: 8, defaultRepMax: 15, loadIncrementKg: 0 },
  { name: "Weighted Decline Crunch", primaryMuscle: "abs", secondaryMuscles: [], equipment: "other", ...ISO, loadIncrementKg: 2.5 },
  { name: "Bicycle Crunch", primaryMuscle: "abs", secondaryMuscles: ["obliques"], equipment: "bodyweight", ...ISO, defaultRepMin: 12, defaultRepMax: 20, loadIncrementKg: 0 },
  { name: "Reverse Crunch", primaryMuscle: "abs", secondaryMuscles: [], equipment: "bodyweight", ...ISO, defaultRepMin: 10, defaultRepMax: 15, loadIncrementKg: 0 },
  { name: "Ab Wheel Rollout", primaryMuscle: "abs", secondaryMuscles: ["lats"], equipment: "other", ...ISO, defaultRepMin: 8, defaultRepMax: 12, loadIncrementKg: 0 },
  { name: "L-Sit Hold", primaryMuscle: "abs", secondaryMuscles: [], equipment: "bodyweight", ...ISO, defaultRepMin: 10, defaultRepMax: 30, loadIncrementKg: 0, notes: "Reps = seconds held." },
  { name: "Long-Lever Plank", primaryMuscle: "abs", secondaryMuscles: ["obliques"], equipment: "bodyweight", ...ISO, defaultRepMin: 20, defaultRepMax: 45, loadIncrementKg: 0, notes: "Reps = seconds held." },
];

/** Reference PPL A/B the coach can start from or rewrite during onboarding. */
export const REFERENCE_PROGRAMME: Array<{
  name: string;
  kind: "push" | "pull" | "legs";
  exercises: Array<{ exercise: string; sets: number; repMin: number; repMax: number; targetRir: number; technique?: string }>;
}> = [
  {
    name: "Push A",
    kind: "push",
    exercises: [
      { exercise: "Low-Incline Smith Press", sets: 3, repMin: 6, repMax: 10, targetRir: 1 },
      { exercise: "Machine Shoulder Press", sets: 2, repMin: 8, repMax: 12, targetRir: 1 },
      { exercise: "Pec Deck", sets: 2, repMin: 10, repMax: 15, targetRir: 0, technique: "lengthened_partials" },
      { exercise: "Cable Lateral Raise", sets: 3, repMin: 10, repMax: 15, targetRir: 0, technique: "myo_reps" },
      { exercise: "Overhead Cable Triceps Extension", sets: 3, repMin: 10, repMax: 12, targetRir: 0, technique: "drop_set" },
      { exercise: "Cable Crunch", sets: 3, repMin: 10, repMax: 15, targetRir: 1 },
    ],
  },
  {
    name: "Pull A",
    kind: "pull",
    exercises: [
      { exercise: "Lat Pulldown", sets: 3, repMin: 6, repMax: 10, targetRir: 1, technique: "lengthened_partials" },
      { exercise: "Chest-Supported Row", sets: 3, repMin: 8, repMax: 12, targetRir: 1, technique: "lengthened_partials" },
      { exercise: "Kneeling Cable Pullover", sets: 2, repMin: 12, repMax: 15, targetRir: 1 },
      { exercise: "Face Pull", sets: 2, repMin: 12, repMax: 20, targetRir: 1 },
      { exercise: "Incline Dumbbell Curl", sets: 3, repMin: 8, repMax: 12, targetRir: 1 },
      { exercise: "Hammer Curl", sets: 2, repMin: 10, repMax: 12, targetRir: 1 },
      { exercise: "Hanging Leg Raise", sets: 3, repMin: 8, repMax: 15, targetRir: 1 },
    ],
  },
  {
    name: "Legs A",
    kind: "legs",
    exercises: [
      { exercise: "Hack Squat", sets: 3, repMin: 6, repMax: 10, targetRir: 1 },
      { exercise: "Romanian Deadlift", sets: 3, repMin: 8, repMax: 10, targetRir: 2 },
      { exercise: "Leg Extension", sets: 3, repMin: 10, repMax: 15, targetRir: 0, technique: "lengthened_partials" },
      { exercise: "Seated Leg Curl", sets: 3, repMin: 10, repMax: 12, targetRir: 0, technique: "drop_set" },
      { exercise: "Standing Calf Raise", sets: 3, repMin: 10, repMax: 15, targetRir: 0, technique: "myo_reps" },
      { exercise: "Weighted Decline Crunch", sets: 3, repMin: 10, repMax: 15, targetRir: 1 },
    ],
  },
  {
    name: "Push B",
    kind: "push",
    exercises: [
      { exercise: "Incline Dumbbell Press", sets: 3, repMin: 8, repMax: 12, targetRir: 1 },
      { exercise: "Dips", sets: 2, repMin: 8, repMax: 12, targetRir: 1 },
      { exercise: "Cable Flye", sets: 2, repMin: 10, repMax: 15, targetRir: 0, technique: "lengthened_partials" },
      { exercise: "Dumbbell Lateral Raise", sets: 3, repMin: 10, repMax: 15, targetRir: 0, technique: "myo_reps" },
      { exercise: "Skull Crusher", sets: 2, repMin: 8, repMax: 12, targetRir: 1 },
      { exercise: "Cable Triceps Pressdown", sets: 2, repMin: 10, repMax: 15, targetRir: 0, technique: "drop_set" },
      { exercise: "Bicycle Crunch", sets: 3, repMin: 12, repMax: 20, targetRir: 1 },
    ],
  },
  {
    name: "Pull B",
    kind: "pull",
    exercises: [
      { exercise: "Wide-Grip Lat Pulldown", sets: 3, repMin: 8, repMax: 12, targetRir: 1, technique: "lengthened_partials" },
      { exercise: "Seated Cable Row", sets: 3, repMin: 8, repMax: 12, targetRir: 1 },
      { exercise: "Reverse Pec Deck", sets: 2, repMin: 12, repMax: 20, targetRir: 1 },
      { exercise: "Dumbbell Shrug", sets: 2, repMin: 10, repMax: 15, targetRir: 1 },
      { exercise: "Bayesian Cable Curl", sets: 3, repMin: 8, repMax: 12, targetRir: 1 },
      { exercise: "Preacher Curl", sets: 2, repMin: 8, repMax: 12, targetRir: 0, technique: "drop_set" },
      { exercise: "Reverse Crunch", sets: 3, repMin: 10, repMax: 15, targetRir: 1 },
    ],
  },
  {
    name: "Legs B",
    kind: "legs",
    exercises: [
      { exercise: "Single-Leg Press", sets: 3, repMin: 8, repMax: 12, targetRir: 1 },
      { exercise: "Hip Thrust", sets: 3, repMin: 8, repMax: 12, targetRir: 1 },
      { exercise: "Lying Leg Curl", sets: 3, repMin: 10, repMax: 15, targetRir: 0, technique: "lengthened_partials" },
      { exercise: "Leg Extension", sets: 2, repMin: 10, repMax: 15, targetRir: 0, technique: "drop_set" },
      { exercise: "Leg Press Calf Raise", sets: 3, repMin: 10, repMax: 15, targetRir: 0, technique: "myo_reps" },
      { exercise: "L-Sit Hold", sets: 3, repMin: 10, repMax: 30, targetRir: 1 },
    ],
  },
];
