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
