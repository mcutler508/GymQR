import type { Set } from '@/lib/supabase';

export type LifetimeTotals = {
  totalVolume: number;     // sum(weight × reps) — "lbs moved"
  totalSets: number;
  workoutDays: number;     // distinct calendar days with at least one set
};

export function lifetimeTotals(sets: Pick<Set, 'weight' | 'reps' | 'logged_at'>[]): LifetimeTotals {
  let volume = 0;
  const days = new Set<string>();
  for (const s of sets) {
    volume += Number(s.weight) * Number(s.reps);
    days.add(dayKey(s.logged_at));
  }
  return {
    totalVolume: Math.round(volume),
    totalSets: sets.length,
    workoutDays: days.size,
  };
}

/** Distinct workout days in the last 7 calendar days (today inclusive). */
export function weeklyStreak(sets: Pick<Set, 'logged_at'>[], now: Date = new Date()): number {
  const today = startOfDay(now);
  const threshold = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
  const days = new Set<string>();
  for (const s of sets) {
    const t = new Date(s.logged_at);
    if (t >= threshold) days.add(dayKey(s.logged_at));
  }
  return days.size;
}

export type PR = {
  weight: number;
  reps: number;
  logged_at: string;
} | null;

/** Heaviest single set (by weight, tiebreaker: most reps). */
export function prFor(sets: Pick<Set, 'weight' | 'reps' | 'logged_at'>[]): PR {
  if (sets.length === 0) return null;
  let best = sets[0];
  for (const s of sets) {
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
  day: string;        // 'YYYY-MM-DD'
  ts: number;         // ms epoch — useful for chart x-axis
  weight: number;     // working-set weight (heaviest set that day)
  reps: number;       // reps of that working set
};

/**
 * Working-set progression: one point per day, with the heaviest set of that
 * day (tiebreaker: most reps). Sorted ascending by date — ready to chart.
 */
export function progressionFor(
  sets: Pick<Set, 'weight' | 'reps' | 'logged_at'>[],
): ProgressionPoint[] {
  const byDay = new Map<string, { weight: number; reps: number }>();
  for (const s of sets) {
    const day = dayKey(s.logged_at);
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

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
