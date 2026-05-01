import type { Set } from '@/lib/supabase';
import { dayKeyInTz } from '@/lib/timezone';

const METERS_PER_MILE = 1609.344;

export function milesToMeters(miles: number): number {
  return miles * METERS_PER_MILE;
}

export function metersToMiles(meters: number): number {
  return meters / METERS_PER_MILE;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatMiles(meters: number): string {
  const mi = metersToMiles(meters);
  if (mi >= 100) return mi.toFixed(0);
  if (mi >= 10) return mi.toFixed(1);
  return mi.toFixed(2);
}

export type CardioBest = {
  longestDurationSeconds: number;
  longestDurationLoggedAt: string | null;
  longestDistanceMeters: number;
  longestDistanceLoggedAt: string | null;
};

export function cardioBest(
  sets: Pick<Set, 'duration_seconds' | 'distance_meters' | 'logged_at'>[],
): CardioBest {
  let longestDur = 0;
  let longestDurAt: string | null = null;
  let longestDist = 0;
  let longestDistAt: string | null = null;
  for (const s of sets) {
    const d = s.duration_seconds == null ? 0 : Number(s.duration_seconds);
    if (d > longestDur) {
      longestDur = d;
      longestDurAt = s.logged_at;
    }
    const m = s.distance_meters == null ? 0 : Number(s.distance_meters);
    if (m > longestDist) {
      longestDist = m;
      longestDistAt = s.logged_at;
    }
  }
  return {
    longestDurationSeconds: longestDur,
    longestDurationLoggedAt: longestDurAt,
    longestDistanceMeters: longestDist,
    longestDistanceLoggedAt: longestDistAt,
  };
}

export type CardioTotals = {
  totalDurationSeconds: number;
  totalDistanceMeters: number;
  totalSessions: number;
};

export function cardioTotals(
  sets: Pick<Set, 'duration_seconds' | 'distance_meters'>[],
): CardioTotals {
  let dur = 0;
  let dist = 0;
  let count = 0;
  for (const s of sets) {
    if (s.duration_seconds == null && s.distance_meters == null) continue;
    if (s.duration_seconds != null) dur += Number(s.duration_seconds);
    if (s.distance_meters != null) dist += Number(s.distance_meters);
    count += 1;
  }
  return {
    totalDurationSeconds: dur,
    totalDistanceMeters: dist,
    totalSessions: count,
  };
}

export type CardioProgressionPoint = {
  day: string;
  ts: number;
  durationSeconds: number;
  distanceMeters: number;
};

/**
 * One point per calendar day (in gym TZ): the longest-duration session of
 * that day, with its accompanying distance. Sorted chronologically.
 */
export function cardioProgressionFor(
  sets: Pick<Set, 'duration_seconds' | 'distance_meters' | 'logged_at'>[],
  timezone: string,
): CardioProgressionPoint[] {
  const byDay = new Map<string, { duration: number; distance: number }>();
  for (const s of sets) {
    if (s.duration_seconds == null && s.distance_meters == null) continue;
    const day = dayKeyInTz(s.logged_at, timezone);
    const dur = s.duration_seconds == null ? 0 : Number(s.duration_seconds);
    const dist = s.distance_meters == null ? 0 : Number(s.distance_meters);
    const cur = byDay.get(day);
    if (!cur || dur > cur.duration || (dur === cur.duration && dist > cur.distance)) {
      byDay.set(day, { duration: dur, distance: dist });
    }
  }
  return Array.from(byDay.entries())
    .map(([day, v]) => ({
      day,
      ts: new Date(`${day}T12:00:00Z`).getTime(),
      durationSeconds: v.duration,
      distanceMeters: v.distance,
    }))
    .sort((a, b) => a.ts - b.ts);
}

export type CardioSuggestion =
  | { kind: 'first-time' }
  | { kind: 'add-time'; durationSeconds: number; distanceMeters: number | null };

/**
 * +1 minute if last had distance (likely a run/ride — small target makes
 * progress visible); +30 seconds otherwise (treadmill walks, climbers).
 * Distance suggestion echoes last-time + 0.1 mi if there was one.
 */
export function suggestCardioTarget(
  lastSet?: { duration_seconds: number | null; distance_meters: number | null },
): CardioSuggestion {
  if (!lastSet || lastSet.duration_seconds == null) return { kind: 'first-time' };
  const lastDur = Number(lastSet.duration_seconds);
  const lastDist = lastSet.distance_meters == null ? null : Number(lastSet.distance_meters);
  const stepSeconds = lastDist != null && lastDist > 0 ? 60 : 30;
  return {
    kind: 'add-time',
    durationSeconds: lastDur + stepSeconds,
    distanceMeters: lastDist != null && lastDist > 0 ? lastDist + milesToMeters(0.1) : null,
  };
}

export function describeCardioSuggestion(s: CardioSuggestion): string {
  if (s.kind === 'first-time') {
    return 'No history yet. Log your first session.';
  }
  return `Aim for ${formatDuration(s.durationSeconds)}${
    s.distanceMeters != null ? ` · ${formatMiles(s.distanceMeters)} mi` : ''
  }`;
}
