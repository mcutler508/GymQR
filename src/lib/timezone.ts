import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';

/**
 * "Today" boundary in a specific IANA timezone, returned as a UTC instant.
 *
 * Postgres `timestamptz` columns store UTC. To filter to "today" in a gym's
 * local timezone, we need the UTC instant that corresponds to local midnight.
 * Example: gym in 'America/Los_Angeles' at 2026-04-30 19:00 UTC. "Today" in
 * Los Angeles started at 2026-04-30 07:00 UTC (midnight PT).
 */
export function startOfTodayUtc(timezone: string, now: Date = new Date()): Date {
  const ymd = formatInTimeZone(now, timezone, 'yyyy-MM-dd');
  // Interpret 'YYYY-MM-DDT00:00:00' AS BEING IN that timezone, and convert to
  // its UTC equivalent.
  return fromZonedTime(`${ymd}T00:00:00`, timezone);
}

/**
 * Day key (YYYY-MM-DD) for an ISO timestamp, computed in a target timezone.
 * Used for grouping sets by "what day was this for the gym?" — not by what day
 * it was in UTC.
 */
export function dayKeyInTz(iso: string, timezone: string): string {
  return formatInTimeZone(new Date(iso), timezone, 'yyyy-MM-dd');
}

/** Format a UTC ISO into the gym's local time (e.g. "Apr 28 · 6:32 AM"). */
export function formatLocal(iso: string, timezone: string, fmt: string): string {
  return formatInTimeZone(new Date(iso), timezone, fmt);
}

/**
 * Curated list of common IANA zones for a dropdown picker. Owners can pick the
 * closest match if they're not the default; uncommon TZs always fall through
 * to "Other" which uses whatever the browser detected.
 */
export const COMMON_TIMEZONES: { value: string; label: string }[] = [
  { value: 'America/Los_Angeles', label: 'US Pacific (Los Angeles)' },
  { value: 'America/Denver', label: 'US Mountain (Denver)' },
  { value: 'America/Chicago', label: 'US Central (Chicago)' },
  { value: 'America/New_York', label: 'US Eastern (New York)' },
  { value: 'America/Phoenix', label: 'US Arizona (no DST)' },
  { value: 'America/Anchorage', label: 'US Alaska' },
  { value: 'Pacific/Honolulu', label: 'US Hawaii' },
  { value: 'America/Toronto', label: 'Canada Eastern (Toronto)' },
  { value: 'America/Vancouver', label: 'Canada Pacific (Vancouver)' },
  { value: 'Europe/London', label: 'UK (London)' },
  { value: 'Europe/Paris', label: 'EU Central (Paris)' },
  { value: 'Europe/Berlin', label: 'EU Central (Berlin)' },
  { value: 'Australia/Sydney', label: 'Australia (Sydney)' },
  { value: 'Asia/Tokyo', label: 'Japan (Tokyo)' },
  { value: 'UTC', label: 'UTC' },
];

/**
 * Validate that a string is a usable IANA timezone. We trust browser-reported
 * names but server-side mutations should still verify (defense-in-depth).
 */
export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
