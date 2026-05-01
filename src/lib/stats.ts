import type { Set } from '@/lib/supabase';
import { dayKeyInTz } from '@/lib/timezone';

export type LifetimeTotals = {
  totalVolume: number;     // sum(weight × reps) — "lbs moved"
  totalSets: number;
  workoutDays: number;     // distinct calendar days (in gym TZ) with at least one set
};

export function lifetimeTotals(
  sets: Pick<Set, 'weight' | 'reps' | 'logged_at'>[],
  timezone: string,
): LifetimeTotals {
  let volume = 0;
  const days = new Set<string>();
  for (const s of sets) {
    if (s.weight != null && s.reps != null) {
      volume += Number(s.weight) * Number(s.reps);
    }
    days.add(dayKeyInTz(s.logged_at, timezone));
  }
  return {
    totalVolume: Math.round(volume),
    totalSets: sets.length,
    workoutDays: days.size,
  };
}

/**
 * Distinct workout days in the last 7 calendar days (today inclusive, in the
 * gym's local time).
 */
export function weeklyStreak(
  sets: Pick<Set, 'logged_at'>[],
  timezone: string,
  now: Date = new Date(),
): number {
  // Compute today + 6 prior days as YMD strings in the gym's TZ; count any
  // matches.
  const todayKey = dayKeyInTz(now.toISOString(), timezone);
  const todayDate = new Date(`${todayKey}T12:00:00Z`); // noon UTC, just for math
  const recentKeys = new Set<string>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(todayDate.getTime() - i * 24 * 60 * 60 * 1000);
    recentKeys.add(d.toISOString().slice(0, 10));
  }
  const days = new Set<string>();
  for (const s of sets) {
    const key = dayKeyInTz(s.logged_at, timezone);
    if (recentKeys.has(key)) days.add(key);
  }
  return days.size;
}

export type PR = {
  weight: number;
  reps: number;
  logged_at: string;
} | null;

/** Heaviest single set (by weight, tiebreaker: most reps). TZ-independent.
 *  Skips rows without weight/reps (cardio). */
export function prFor(sets: Pick<Set, 'weight' | 'reps' | 'logged_at'>[]): PR {
  const strength = sets.filter((s) => s.weight != null && s.reps != null);
  if (strength.length === 0) return null;
  let best = strength[0];
  for (const s of strength) {
    if (Number(s.weight) > Number(best.weight)) {
      best = s;
    } else if (Number(s.weight) === Number(best.weight) && Number(s.reps) > Number(best.reps)) {
      best = s;
    }
  }
  return {
    weight: Number(best.weight),
    reps: Number(best.reps),
    logged_at: best.logged_at,
  };
}

export type ProgressionPoint = {
  day: string;        // 'YYYY-MM-DD' in gym timezone
  ts: number;         // ms epoch — useful for chart x-axis
  weight: number;     // working-set weight (heaviest set that day)
  reps: number;       // reps of that working set
};

/**
 * Working-set progression: one point per day (in gym TZ), with the heaviest
 * set of that day (tiebreaker: most reps). Sorted ascending by date.
 */
export function progressionFor(
  sets: Pick<Set, 'weight' | 'reps' | 'logged_at'>[],
  timezone: string,
): ProgressionPoint[] {
  const byDay = new Map<string, { weight: number; reps: number }>();
  for (const s of sets) {
    if (s.weight == null || s.reps == null) continue;
    const day = dayKeyInTz(s.logged_at, timezone);
    const w = Number(s.weight);
    const r = Number(s.reps);
    const cur = byDay.get(day);
    if (!cur || w > cur.weight || (w === cur.weight && r > cur.reps)) {
      byDay.set(day, { weight: w, reps: r });
    }
  }
  return Array.from(byDay.entries())
    .map(([day, v]) => ({
      day,
      ts: new Date(`${day}T12:00:00Z`).getTime(),
      weight: v.weight,
      reps: v.reps,
    }))
    .sort((a, b) => a.ts - b.ts);
}

/**
 * Split a list of sets into workout sessions by gap detection. Two sets logged
 * within `gapHours` of each other belong to the same session; a gap larger
 * than that starts a new session. Returns sessions in chronological order
 * (earliest first).
 *
 * Useful when a member trains twice in one day — we want morning and evening
 * surfaced as separate rows in Recent History rather than blurred into one.
 */
export function groupIntoSessions<T extends { logged_at: string }>(
  sets: T[],
  gapHours = 2,
): Array<{ startedAt: string; endedAt: string; sets: T[] }> {
  if (sets.length === 0) return [];
  const sorted = [...sets].sort((a, b) =>
    a.logged_at.localeCompare(b.logged_at),
  );
  const gapMs = gapHours * 60 * 60 * 1000;
  const sessions: Array<{ startedAt: string; endedAt: string; sets: T[] }> = [];
  for (const s of sorted) {
    const t = new Date(s.logged_at).getTime();
    const last = sessions[sessions.length - 1];
    if (!last) {
      sessions.push({ startedAt: s.logged_at, endedAt: s.logged_at, sets: [s] });
      continue;
    }
    const lastT = new Date(last.endedAt).getTime();
    if (t - lastT > gapMs) {
      sessions.push({ startedAt: s.logged_at, endedAt: s.logged_at, sets: [s] });
    } else {
      last.sets.push(s);
      last.endedAt = s.logged_at;
    }
  }
  return sessions;
}
