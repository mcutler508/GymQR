/**
 * Tiny inline SVG sparkline. Hand-rolled to avoid pulling Recharts into the
 * card list (one chart per card × 20 cards is overkill). Recharts is reserved
 * for the per-machine drill-down where the chart is the main feature.
 */
export function Sparkline({ points, width = 120, height = 40 }: { points: number[]; width?: number; height?: number }) {
  if (points.length < 2) {
    return (
      <div
        style={{ width, height }}
        className="flex items-center justify-end text-[10px] text-muted tabular-nums"
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
  // The closing-fill path: same line, then sweeps to bottom-right and bottom-left
  // so we can paint a soft accent gradient underneath. Adds depth without noise.
  const lastX = (points.length - 1) * stepX;
  const fillPath = `${path} L ${lastX.toFixed(1)} ${height} L 0 ${height} Z`;
  const lastY = height - ((points[points.length - 1] - min) / range) * (height - 2) - 1;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0 text-accent">
      <defs>
        <linearGradient id="sparkline-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill="url(#sparkline-fill)" stroke="none" />
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="2.5" fill="currentColor" />
    </svg>
  );
}
