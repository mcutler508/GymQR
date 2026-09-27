/** "185" or "182.5" — integers stay clean, decimals get one place. */
export function fmtWeight(w: number): string {
  return Number.isInteger(w) ? String(w) : w.toFixed(1);
}

/** Compact volume: 950 → "950", 4200 → "4.2k", 42000 → "42k", 1.2M. */
export function fmtVol(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}k`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
