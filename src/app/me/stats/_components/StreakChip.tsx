type Props = { days: number };

/**
 * Inline chip rendered next to the member name when a recent training streak
 * exists. Hidden when the streak is < 2 days — a single day isn't a streak,
 * surfacing it would feel like noise.
 */
export function StreakChip({ days }: Props) {
  if (days < 2) return null;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-card bg-surface border border-line text-xs text-ink">
      <span
        className="inline-block h-1.5 w-1.5 rounded-full bg-accent"
        aria-hidden="true"
      />
      <span className="font-mono tabular-nums">{days}</span>
      <span className="text-muted-strong">day streak</span>
    </span>
  );
}
