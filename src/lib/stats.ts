import type { Set } from '@/lib/supabase';
import { dayKeyInTz, formatLocal } from '@/lib/timezone';

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

export type PRFlags = {
  maxWeight: boolean;        // strictly heavier than any prior set
  maxVolume: boolean;        // weight × reps strictly higher than any prior set
  bestRepsAtWeight: boolean; // strictly more reps than any prior set at the same weight
};

/**
 * Compare a candidate set against the member's prior sets on this
 * equipment+exercise. All three checks are *strict* — tying a previous best
 * does not count. `prior` should NOT include the candidate.
 */
export function detectPRs(
  prior: Pick<Set, 'weight' | 'reps'>[],
  candidate: { weight: number; reps: number },
): PRFlags {
  const w = candidate.weight;
  const r = candidate.reps;
  const v = w * r;
  let maxWeight = true;
  let maxVolume = true;
  let bestRepsAtWeight = true;
  for (const s of prior) {
    if (s.weight == null || s.reps == null) continue;
    const pw = Number(s.weight);
    const pr = Number(s.reps);
    if (pw >= w) maxWeight = false;
    if (pw * pr >= v) maxVolume = false;
    if (pw === w && pr >= r) bestRepsAtWeight = false;
  }
  // First-ever set: no prior comparable rows. Don't celebrate "PRs" on row #1.
  const hasPrior = prior.some((s) => s.weight != null && s.reps != null);
  if (!hasPrior) {
    return { maxWeight: false, maxVolume: false, bestRepsAtWeight: false };
  }
  return { maxWeight, maxVolume, bestRepsAtWeight };
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

export type WeeklyBucket = {
  weekStart: string;       // 'YYYY-MM-DD' Monday in gym TZ
  weekLabel: string;       // 'Apr 28' (Monday short label)
  setCount: number;
  totalVolume: number;     // sum(weight × reps), strength only
  workoutDays: number;     // distinct days in this week with at least one set
  cardioSeconds: number;
};

/**
 * Group sets into the last N weeks (Mon-Sun, in the gym's timezone). Returns
 * weeks ascending — earliest first, current week last — with empty weeks
 * zero-filled so the chart timeline reads continuously.
 */
export function weeklyBuckets(
  sets: Pick<Set, 'weight' | 'reps' | 'duration_seconds' | 'logged_at'>[],
  timezone: string,
  weeks = 10,
  now: Date = new Date(),
): WeeklyBucket[] {
  // Anchor each set to its week's Monday (in gym TZ). Reuse `dayKeyInTz` for
  // the YYYY-MM-DD-in-TZ then walk back to Monday in plain UTC math — that's
  // safe because day keys never include a time component.
  const today = dayKeyInTz(now.toISOString(), timezone);
  const todayMondayKey = mondayKey(today);

  // Build list of week keys we want, oldest first.
  const wantedWeeks: string[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const d = addDays(todayMondayKey, -i * 7);
    wantedWeeks.push(d);
  }
  const wanted = new Set(wantedWeeks);

  // Aggregate.
  type Agg = {
    setCount: number;
    totalVolume: number;
    days: globalThis.Set<string>;
    cardioSeconds: number;
  };
  const byWeek = new Map<string, Agg>();
  for (const s of sets) {
    const day = dayKeyInTz(s.logged_at, timezone);
    const wk = mondayKey(day);
    if (!wanted.has(wk)) continue;
    const cur = byWeek.get(wk) ?? {
      setCount: 0,
      totalVolume: 0,
      days: new globalThis.Set<string>(),
      cardioSeconds: 0,
    };
    cur.setCount += 1;
    cur.days.add(day);
    if (s.weight != null && s.reps != null) {
      cur.totalVolume += Number(s.weight) * Number(s.reps);
    }
    if (s.duration_seconds != null) {
      cur.cardioSeconds += Number(s.duration_seconds);
    }
    byWeek.set(wk, cur);
  }

  return wantedWeeks.map((weekStart) => {
    const a = byWeek.get(weekStart);
    return {
      weekStart,
      weekLabel: weekShortLabel(weekStart, timezone),
      setCount: a?.setCount ?? 0,
      totalVolume: Math.round(a?.totalVolume ?? 0),
      workoutDays: a?.days.size ?? 0,
      cardioSeconds: a?.cardioSeconds ?? 0,
    };
  });
}

/** YYYY-MM-DD → YYYY-MM-DD of the Monday of that ISO week. Pure date math. */
function mondayKey(dayKey: string): string {
  // Treat the date as noon UTC to avoid DST edge cases — we never display the
  // time, only the YMD.
  const d = new Date(`${dayKey}T12:00:00Z`);
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const offsetToMonday = (dow + 6) % 7; // Mon=0, Sun=6
  d.setUTCDate(d.getUTCDate() - offsetToMonday);
  return d.toISOString().slice(0, 10);
}

function addDays(dayKey: string, days: number): string {
  const d = new Date(`${dayKey}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function weekShortLabel(dayKey: string, timezone: string): string {
  // Render the Monday in the gym's locale-style "Apr 28".
  return formatLocal(`${dayKey}T12:00:00Z`, timezone, 'MMM d');
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
