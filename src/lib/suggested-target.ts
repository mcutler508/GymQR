export type Suggestion =
  | { kind: 'first-time' }
  | { kind: 'increase-weight'; weight: number; reps: number }
  | { kind: 'add-rep'; weight: number; reps: number };

export function suggestTarget(lastSet?: { weight: number; reps: number }): Suggestion {
  if (!lastSet) return { kind: 'first-time' };
  if (lastSet.reps >= 8) {
    return { kind: 'increase-weight', weight: lastSet.weight + 5, reps: 8 };
  }
  return { kind: 'add-rep', weight: lastSet.weight, reps: lastSet.reps + 1 };
}

export function describeSuggestion(s: Suggestion): string {
  switch (s.kind) {
    case 'first-time':
      return 'No history yet. Start with a comfortable weight and log your first set.';
    case 'increase-weight':
      return `Try ${s.weight} lbs × ${s.reps}`;
    case 'add-rep':
      return `Same weight, push for ${s.weight} lbs × ${s.reps}`;
  }
}

export type PresetKind = 'repeat' | 'add-weight' | 'same-weight' | 'deload';

export type Preset = {
  kind: PresetKind;
  label: string;
  weight: number;
  reps: number;
};

/**
 * Four one-tap presets derived from a member's most recent set on this
 * equipment + exercise. Returns null when there's no history — the UI shows
 * the custom-set form instead.
 *
 * - Repeat Last: nail the same set again (volume baseline).
 * - +5 lbs:    weight bump, drop reps to 8 if last was rep-out at ≥ 8.
 * - Same Weight: chase one extra rep at the same weight.
 * - Deload:   90% of last weight, rounded to the nearest 5, at 10 reps.
 */
export function presetsFor(
  lastSet?: { weight: number; reps: number },
): Preset[] | null {
  if (!lastSet) return null;
  const w = lastSet.weight;
  const r = lastSet.reps;
  const deloadWeight = Math.max(5, Math.round((w * 0.9) / 5) * 5);
  return [
    { kind: 'repeat', label: 'Repeat Last', weight: w, reps: r },
    { kind: 'add-weight', label: '+5 lbs', weight: w + 5, reps: r >= 8 ? 8 : r },
    { kind: 'same-weight', label: 'Same Weight', weight: w, reps: r + 1 },
    { kind: 'deload', label: 'Deload', weight: deloadWeight, reps: 10 },
  ];
}
