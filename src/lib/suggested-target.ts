export type Suggestion =
  | { kind: 'first-time' }
  | { kind: 'increase-weight'; weight: number; reps: number }
  | { kind: 'add-rep'; weight: number; reps: number }
  | { kind: 'deload'; weight: number; reps: number; stalledSessions: number };

type Lift = { weight: number; reps: number };

/** Sessions with the same top set before we call it a stall. */
const STALL_SESSIONS = 3;

export function suggestTarget(lastSet?: Lift): Suggestion {
  if (!lastSet) return { kind: 'first-time' };
  if (lastSet.reps >= 8) {
    return { kind: 'increase-weight', weight: lastSet.weight + 5, reps: 8 };
  }
  return { kind: 'add-rep', weight: lastSet.weight, reps: lastSet.reps + 1 };
}

/** Heaviest set in a session; ties broken by more reps. */
export function topSet(sets: { weight: number | null; reps: number | null }[]): Lift | null {
  let best: Lift | null = null;
  for (const s of sets) {
    if (s.weight == null || s.reps == null) continue;
    const w = Number(s.weight);
    const r = Number(s.reps);
    if (!best || w > best.weight || (w === best.weight && r > best.reps)) {
      best = { weight: w, reps: r };
    }
  }
  return best;
}

/**
 * Target for today, driven by the top set of each *prior* session (oldest →
 * newest). Frozen for the whole session so it doesn't jump between sets.
 *
 * Stall rule: if the last STALL_SESSIONS sessions all hit the identical top
 * set, the +5 / +1 ladder isn't working — drop ~10% (rounded to 5) and rebuild.
 */
export function suggestFromSessions(
  sessions: { weight: number | null; reps: number | null }[][],
): Suggestion {
  const tops = sessions.map(topSet).filter((t): t is Lift => t != null);
  const last = tops[tops.length - 1];
  if (!last) return { kind: 'first-time' };

  const recent = tops.slice(-STALL_SESSIONS);
  const stalled =
    recent.length === STALL_SESSIONS &&
    recent.every((t) => t.weight === last.weight && t.reps === last.reps);
  if (stalled) {
    const dropped = Math.max(5, Math.round((last.weight * 0.9) / 5) * 5);
    return { kind: 'deload', weight: dropped, reps: last.reps, stalledSessions: STALL_SESSIONS };
  }
  return suggestTarget(last);
}

export function describeSuggestion(s: Suggestion): string {
  switch (s.kind) {
    case 'first-time':
      return 'No history yet. Start with a comfortable weight and log your first set.';
    case 'increase-weight':
      return `Try ${s.weight} lbs × ${s.reps}`;
    case 'add-rep':
      return `Same weight, push for ${s.weight} lbs × ${s.reps}`;
    case 'deload':
      return `Stalled ${s.stalledSessions} sessions — reset to ${s.weight} lbs × ${s.reps}`;
  }
}
