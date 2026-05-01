export type ExerciseCategory = {
  category: string;
  exercises: string[];
};

export const EXERCISE_CATALOG: ExerciseCategory[] = [
  {
    category: 'Cable / Pulley',
    exercises: [
      'Lat Pulldown',
      'Cable Row',
      'Tricep Pushdown',
      'Face Pull',
      'Cable Curl',
      'Cable Fly',
      'Cable Lateral Raise',
      'Cable Crunch',
      'Wood Chopper',
    ],
  },
  {
    category: 'Dumbbells',
    exercises: [
      'DB Bench Press',
      'DB Incline Press',
      'DB Shoulder Press',
      'DB Curl',
      'DB Row',
      'DB Lateral Raise',
      'DB Fly',
      'DB Pullover',
      'Goblet Squat',
      'Hammer Curl',
    ],
  },
  {
    category: 'Multi-purpose Bench',
    exercises: [
      'Incline Bench Press',
      'Decline Bench Press',
      'Flat Bench Press',
      'Seated Row',
      'Seated Curl',
      'Bulgarian Split Squat',
    ],
  },
  {
    category: 'Barbell / Rack',
    exercises: [
      'Back Squat',
      'Front Squat',
      'Deadlift',
      'Bench Press',
      'Overhead Press',
      'Bent-Over Row',
      'Romanian Deadlift',
    ],
  },
  {
    category: 'Plate-Loaded / Other',
    exercises: [
      'Leg Press',
      'Hack Squat',
      'Chest Press',
      'Shoulder Press',
      'Lat Pulldown (machine)',
      'Seated Row (machine)',
    ],
  },
];

/**
 * Normalize a list of exercise names: trim, drop empties, dedupe
 * case-insensitively (keeping the first-seen casing).
 */
export function normalizeExerciseList(input: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    const v = raw.trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}
