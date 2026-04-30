/**
 * Tiny inline SVG sparkline. Hand-rolled to avoid pulling Recharts into the
 * card list (one chart per card × 20 cards is overkill). Recharts is reserved
 * for the per-machine drill-down where the chart is the main feature.
 */
export function Sparkline({ points, width = 80, height = 32 }: { points: number[]; width?: number; height?: number }) {
  if (points.length < 2) {
    return (
      <div
        style={{ width, height }}
        className="flex items-center justify-end text-[10px] text-neutral-600"
      >
        {points.length === 1 ? `${points[0]}` : '—'}
      </div>
    );
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const path = points
    .map((y, i) => {
      const x = i * stepX;
      const py = height - ((y - min) / range) * (height - 2) - 1;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${py.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-emerald-400" />
    </svg>
  );
}
