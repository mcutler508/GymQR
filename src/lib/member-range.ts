import { dayKeyInTz, formatLocal } from '@/lib/timezone';

export type RangeKey = 'week' | 'month' | 'ytd' | 'all';

export type RangeOption = { key: RangeKey; label: string; sublabel: string };

export const RANGE_OPTIONS: RangeOption[] = [
  { key: 'week',  label: 'Week',     sublabel: 'this week' },
  { key: 'month', label: 'Month',    sublabel: 'this month' },
  { key: 'ytd',   label: 'YTD',      sublabel: 'year to date' },
  { key: 'all',   label: 'All time', sublabel: 'all time' },
];

const STORAGE_KEY_RANGE = 'reptag_member_stats_range_v1';

export function loadRange(): RangeKey {
  if (typeof window === 'undefined') return 'month';
  try {
    const v = localStorage.getItem(STORAGE_KEY_RANGE);
    if (v === 'week' || v === 'month' || v === 'ytd' || v === 'all') return v;
    return 'month';
  } catch {
    return 'month';
  }
}

export function saveRange(r: RangeKey): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_RANGE, r);
  } catch {
    /* */
  }
}

/**
 * Inclusive ISO timestamp at the start of the selected range, in the gym's TZ.
 * Returns null for 'all' so callers can short-circuit filtering.
 */
export function rangeStartIso(
  range: RangeKey,
  timezone: string,
  now: Date = new Date(),
): string | null {
  if (range === 'all') return null;
  const todayKey = dayKeyInTz(now.toISOString(), timezone);
  if (range === 'week') {
    return `${mondayKey(todayKey)}T00:00:00`;
  }
  if (range === 'month') {
    return `${todayKey.slice(0, 7)}-01T00:00:00`;
  }
  // ytd
  return `${todayKey.slice(0, 4)}-01-01T00:00:00`;
}

/** Generic set-row filter — keeps any row whose `logged_at` ≥ range start. */
export function filterByRange<T extends { logged_at: string }>(
  sets: T[],
  range: RangeKey,
  timezone: string,
  now: Date = new Date(),
): T[] {
  const startLocal = rangeStartIso(range, timezone, now);
  if (!startLocal) return sets;
  // Compare in the gym's local-day space — convert each set's logged_at into
  // its YYYY-MM-DD in TZ, then compare to the range-start day key.
  const startDay = startLocal.slice(0, 10);
  return sets.filter((s) => dayKeyInTz(s.logged_at, timezone) >= startDay);
}

/**
 * Aggregated totals for the period IMMEDIATELY PRECEDING the active range —
 * used for "↑ 12% vs last month" deltas on KPI tiles.
 *   week  → prior 7 days (Mon-Sun of last week)
 *   month → prior calendar month (1st through last day, in gym TZ)
 *   ytd   → prior calendar year (Jan 1 – Dec 31)
 *   all   → no comparison possible (returns null)
 */
export function priorRangeTotals(
  sets: { weight: number | null; reps: number | null; duration_seconds: number | null; logged_at: string }[],
  range: RangeKey,
  timezone: string,
  now: Date = new Date(),
): { volume: number; setCount: number; workoutDays: number; cardioSeconds: number } | null {
  if (range === 'all') return null;
  const todayKey = dayKeyInTz(now.toISOString(), timezone);

  let startDay: string;
  let endDayInclusive: string;
  if (range === 'week') {
    const thisMonday = mondayKey(todayKey);
    startDay = addDays(thisMonday, -7);
    endDayInclusive = addDays(thisMonday, -1);
  } else if (range === 'month') {
    const thisMonthFirst = `${todayKey.slice(0, 7)}-01`;
    endDayInclusive = addDays(thisMonthFirst, -1);
    startDay = `${endDayInclusive.slice(0, 7)}-01`;
  } else {
    // ytd
    const thisYear = parseInt(todayKey.slice(0, 4), 10);
    startDay = `${thisYear - 1}-01-01`;
    endDayInclusive = `${thisYear - 1}-12-31`;
  }

  let volume = 0;
  let setCount = 0;
  let cardioSeconds = 0;
  const days = new globalThis.Set<string>();
  for (const s of sets) {
    const day = dayKeyInTz(s.logged_at, timezone);
    if (day < startDay || day > endDayInclusive) continue;
    setCount += 1;
    days.add(day);
    if (s.weight != null && s.reps != null) {
      volume += Number(s.weight) * Number(s.reps);
    }
    if (s.duration_seconds != null) {
      cardioSeconds += Number(s.duration_seconds);
    }
  }
  return {
    volume: Math.round(volume),
    setCount,
    workoutDays: days.size,
    cardioSeconds,
  };
}

/** Human label for the delta descriptor (e.g. "vs last week"). Null when no prior range. */
export function priorRangeLabel(range: RangeKey): string | null {
  switch (range) {
    case 'week':  return 'vs last week';
    case 'month': return 'vs last month';
    case 'ytd':   return 'vs last year';
    case 'all':   return null;
  }
}

export type BucketScale = 'day' | 'week' | 'month';

/** Granularity to drive the bar charts under each range. */
export function bucketScaleFor(range: RangeKey): BucketScale {
  switch (range) {
    case 'week':  return 'day';
    case 'month': return 'week';
    case 'ytd':   return 'month';
    case 'all':   return 'week';
  }
}

export type RangeBucket = {
  key: string;     // 'YYYY-MM-DD' for day/week, 'YYYY-MM' for month
  label: string;   // 'Mon' / 'Apr 28' / 'Jan'
  setCount: number;
  totalVolume: number;
  workoutDays: number;
  cardioSeconds: number;
};

type SetLike = {
  weight: number | null;
  reps: number | null;
  duration_seconds: number | null;
  logged_at: string;
};

/**
 * Bucket sets into the right scale for the chart, zero-filling missing
 * intervals so trend lines never look misleadingly compressed.
 *   week  → 7 daily buckets (Mon..Sun, today inclusive)
 *   month → ISO weeks of the current month (Mon-anchored)
 *   ytd   → calendar months Jan..current
 *   all   → last 10 weeks (preserves prior chart behavior)
 */
export function bucketsForRange(
  sets: SetLike[],
  range: RangeKey,
  timezone: string,
  now: Date = new Date(),
): { buckets: RangeBucket[]; scale: BucketScale } {
  const scale = bucketScaleFor(range);
  const todayKey = dayKeyInTz(now.toISOString(), timezone);

  const wantedKeys: { key: string; label: string }[] = [];

  if (range === 'week') {
    const monday = mondayKey(todayKey);
    for (let i = 0; i < 7; i++) {
      const d = addDays(monday, i);
      // Stop at today — don't show future days.
      if (d > todayKey) break;
      wantedKeys.push({ key: d, label: weekdayShort(d, timezone) });
    }
  } else if (range === 'month') {
    const monthStart = `${todayKey.slice(0, 7)}-01`;
    let cur = mondayKey(monthStart);
    const todayMonday = mondayKey(todayKey);
    while (cur <= todayMonday) {
      wantedKeys.push({ key: cur, label: weekShortLabel(cur, timezone) });
      cur = addDays(cur, 7);
    }
  } else if (range === 'ytd') {
    const year = todayKey.slice(0, 4);
    const curMonth = parseInt(todayKey.slice(5, 7), 10);
    for (let m = 1; m <= curMonth; m++) {
      const mm = String(m).padStart(2, '0');
      wantedKeys.push({ key: `${year}-${mm}`, label: monthShortLabel(`${year}-${mm}-01`, timezone) });
    }
  } else {
    // all: last 10 weeks (current behavior)
    const todayMonday = mondayKey(todayKey);
    for (let i = 9; i >= 0; i--) {
      const d = addDays(todayMonday, -i * 7);
      wantedKeys.push({ key: d, label: weekShortLabel(d, timezone) });
    }
  }

  type Agg = {
    setCount: number;
    totalVolume: number;
    days: globalThis.Set<string>;
    cardioSeconds: number;
  };
  const wanted = new globalThis.Set(wantedKeys.map((k) => k.key));
  const agg = new Map<string, Agg>();

  for (const s of sets) {
    const day = dayKeyInTz(s.logged_at, timezone);
    let key: string;
    if (scale === 'day')   key = day;
    else if (scale === 'week') key = mondayKey(day);
    else /* month */       key = day.slice(0, 7);
    if (!wanted.has(key)) continue;

    const cur = agg.get(key) ?? {
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
    agg.set(key, cur);
  }

  const buckets: RangeBucket[] = wantedKeys.map(({ key, label }) => {
    const a = agg.get(key);
    return {
      key,
      label,
      setCount: a?.setCount ?? 0,
      totalVolume: Math.round(a?.totalVolume ?? 0),
      workoutDays: a?.days.size ?? 0,
      cardioSeconds: a?.cardioSeconds ?? 0,
    };
  });

  return { buckets, scale };
}

/* ---------------------------- date math ---------------------------- */

function mondayKey(dayKey: string): string {
  const d = new Date(`${dayKey}T12:00:00Z`);
  const dow = d.getUTCDay();             // 0=Sun..6=Sat
  const offsetToMonday = (dow + 6) % 7;  // Mon=0, Sun=6
  d.setUTCDate(d.getUTCDate() - offsetToMonday);
  return d.toISOString().slice(0, 10);
}

function addDays(dayKey: string, days: number): string {
  const d = new Date(`${dayKey}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function weekShortLabel(dayKey: string, timezone: string): string {
  return formatLocal(`${dayKey}T12:00:00Z`, timezone, 'MMM d');
}

function weekdayShort(dayKey: string, timezone: string): string {
  return formatLocal(`${dayKey}T12:00:00Z`, timezone, 'EEE');
}

function monthShortLabel(dayKey: string, timezone: string): string {
  return formatLocal(`${dayKey}T12:00:00Z`, timezone, 'MMM');
}
