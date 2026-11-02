// Seeds the exercise library (idempotent). The programme itself is built by
// the coach during onboarding; REFERENCE_PROGRAMME is available to it as a start.
import { db } from "./index";
import { exercises } from "./schema";
import { SEED_EXERCISES } from "./seed-data";

async function main() {
  let inserted = 0;
  for (const e of SEED_EXERCISES) {
    const res = await db
      .insert(exercises)
      .values({
        name: e.name,
        primaryMuscle: e.primaryMuscle,
        secondaryMuscles: e.secondaryMuscles,
        equipment: e.equipment,
        isUnilateral: e.isUnilateral ?? false,
        defaultRestS: e.defaultRestS ?? 120,
        defaultRepMin: e.defaultRepMin ?? 8,
        defaultRepMax: e.defaultRepMax ?? 12,
        loadIncrementKg: String(e.loadIncrementKg ?? 2.5),
        notes: e.notes ?? null,
      })
      .onConflictDoNothing({ target: exercises.name })
      .returning({ id: exercises.id });
    inserted += res.length;
  }
  console.log(`Seeded exercises: ${inserted} new, ${SEED_EXERCISES.length - inserted} already present.`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
