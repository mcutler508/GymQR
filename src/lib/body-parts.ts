/**
 * Body-part inference from equipment + exercise names.
 *
 * The app has no body-part column anywhere — equipment only has a type
 * (single/multi/cardio) and a `text[]` of exercise names. To surface "Volume
 * by body part" without owner setup, we infer the body part by keyword
 * matching the equipment name and (for multi machines) the per-set exercise
 * name. The dictionary covers the most common machine + exercise names; misses
 * fall to the `other` bucket so members can see how much of their volume the
 * inference didn't catch.
 *
 * The five product buckets are: legs, chest, back, arms, core. Shoulders fold
 * into arms for v1 (one fewer bucket = simpler member story).
 */

export type BodyPart = 'legs' | 'chest' | 'back' | 'arms' | 'core' | 'other';

export const BODY_PARTS: readonly BodyPart[] = [
  'legs',
  'chest',
  'back',
  'arms',
  'core',
  'other',
] as const;

export const BODY_PART_LABELS: Record<BodyPart, string> = {
  legs: 'Legs',
  chest: 'Chest',
  back: 'Back',
  arms: 'Arms',
  core: 'Core',
  other: 'Other',
};

/**
 * Inference rules — order matters. The first regex that matches wins.
 * Specific tokens (e.g. "leg press") must come before generic ones
 * (e.g. "press") so the right bucket is hit.
 *
 * Inputs are lowercased before matching, so all patterns can stay lowercase.
 */
const RULES: ReadonlyArray<{ part: BodyPart; pattern: RegExp }> = [
  // Core
  {
    part: 'core',
    pattern:
      /(?:\babs?\b|abdominal|crunch|plank|sit.?up|oblique|russian twist|wood.?chop|side bend|rotary torso|hanging leg raise|cable.?crunch)/,
  },

  // Legs — match before generic "press"/"raise" so leg press lands here
  {
    part: 'legs',
    pattern:
      /(leg press|leg curl|leg extension|hack squat|smith.?machine squat|\bsquat\b|hip thrust|hip abductor|hip adductor|abductor|adductor|calf raise|standing calf|seated calf|glute|hamstring|quad|lunge|step.?up|sissy squat|good ?morning)/,
  },

  // Back — match before generic "press" or "raise" rules below
  {
    part: 'back',
    pattern:
      /(lat.?pull(down|.?up)?|pulldown|pull.?up|chin.?up|cable row|seated row|t.?bar row|barbell row|bent.?over row|inverted row|\brow\b|deadlift|face pull|shrug|rear delt|reverse fly|rear.?fly|back extension|hyper|good ?morning)/,
  },

  // Chest
  {
    part: 'chest',
    pattern:
      /(bench press|chest press|chest fly|pec deck|pec.?fly|incline (bench|press|fly)|decline (bench|press|fly)|cable fly|cable cross|push.?up|chest dip|\bdip\b)/,
  },

  // Arms — biceps, triceps, and shoulders folded in
  {
    part: 'arms',
    pattern:
      /(bicep|tricep|\bcurl\b|preacher|hammer|pushdown|skull ?crusher|kickback|overhead extension|shoulder press|overhead press|military press|arnold press|lateral raise|front raise|side raise|upright row|delt|deltoid)/,
  },
];

/**
 * Infer the body part for a set. Prefers the exercise name (multi machines:
 * e.g. "Cable Curl" on a cable stack should be arms, not whatever the machine
 * itself implies). Falls back to the equipment name.
 */
export function inferBodyPart(
  equipmentName: string | null | undefined,
  exerciseName: string | null | undefined,
): BodyPart {
  const subject = (exerciseName ?? '').trim() || (equipmentName ?? '').trim();
  if (!subject) return 'other';
  const haystack = subject.toLowerCase();
  for (const rule of RULES) {
    if (rule.pattern.test(haystack)) return rule.part;
  }
  return 'other';
}

/* ------------------------------------------------------------------ */
/* Aggregation helpers                                                 */
/* ------------------------------------------------------------------ */

type AggregableSet = {
  weight: number | null;
  reps: number | null;
  equipment_id: string;
  exercise_name: string | null;
};

type EquipmentLike = { id: string; name: string };

/** Lifetime/range-scoped: total volume (lbs × reps) grouped by body part. */
export function volumeByBodyPart(
  sets: AggregableSet[],
  equipment: Iterable<EquipmentLike>,
): Record<BodyPart, number> {
  const nameById = new Map<string, string>();
  for (const e of equipment) nameById.set(e.id, e.name);

  const totals = emptyTotals();
  for (const s of sets) {
    if (s.weight == null || s.reps == null) continue;
    const part = inferBodyPart(nameById.get(s.equipment_id), s.exercise_name);
    totals[part] += Number(s.weight) * Number(s.reps);
  }
  for (const k of BODY_PARTS) totals[k] = Math.round(totals[k]);
  return totals;
}

/** Lifetime/range-scoped: count of sets grouped by body part. Includes cardio
 *  sessions under `other` only if they have null weight & reps AND don't match
 *  any keyword rule — by default cardio sets land in `other` which is correct. */
export function setsByBodyPart(
  sets: AggregableSet[],
  equipment: Iterable<EquipmentLike>,
): Record<BodyPart, number> {
  const nameById = new Map<string, string>();
  for (const e of equipment) nameById.set(e.id, e.name);

  const totals = emptyTotals();
  for (const s of sets) {
    // Only count strength sets here — cardio rows have null weight/reps and
    // shouldn't inflate any body-part bucket.
    if (s.weight == null || s.reps == null) continue;
    const part = inferBodyPart(nameById.get(s.equipment_id), s.exercise_name);
    totals[part] += 1;
  }
  return totals;
}

function emptyTotals(): Record<BodyPart, number> {
  return { legs: 0, chest: 0, back: 0, arms: 0, core: 0, other: 0 };
}
