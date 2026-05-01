'use client';

import { useEffect, useRef, useState } from 'react';

/** Static-looking sparkline for the member-experience section. SVG only — no Recharts cost. */
export function StatsMock() {
  const ref = useRef<SVGSVGElement | null>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setDrawn(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.4 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  // 12 weeks of mock progression
  const points = [180, 185, 185, 190, 195, 195, 205, 210, 215, 225, 240, 245];
  const max = Math.max(...points);
  const min = Math.min(...points);
  const w = 260;
  const h = 90;
  const step = w / (points.length - 1);
  const path = points
    .map((p, i) => {
      const x = i * step;
      const y = h - ((p - min) / (max - min)) * h;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="flex h-full flex-col px-5 pt-10 pb-5 text-ink">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
        Your stats · Leg Press
      </div>
      <h3 className="mt-2 font-display text-2xl leading-tight">
        Personal record
        <br />
        <span className="text-accent">245 lb × 8</span>
      </h3>

      <div className="mt-4 rounded-card border border-line/70 bg-surface-2 p-4">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            12-week progression
          </span>
          <span className="font-mono text-[10px] text-accent">+36%</span>
        </div>
        <svg
          ref={ref}
          viewBox={`0 0 ${w} ${h}`}
          className="mt-3 h-20 w-full overflow-visible"
        >
          <defs>
            <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity="0.35" />
              <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`${path} L ${w} ${h} L 0 ${h} Z`}
            fill="url(#spark-fill)"
            opacity={drawn ? 1 : 0}
            style={{ transition: 'opacity 800ms ease 300ms' }}
          />
          <path
            d={path}
            fill="none"
            stroke="rgb(var(--accent))"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={drawn ? 0 : 1}
            style={{ transition: 'stroke-dashoffset 1100ms cubic-bezier(0.22,1,0.36,1)' }}
          />
        </svg>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Lifetime" value="284k" unit="lb" />
        <Stat label="Workouts" value="42" />
        <Stat label="Streak" value="9" unit="wk" />
      </div>

      <div className="mt-auto rounded-card border border-line/70 bg-surface-2 p-3 text-xs text-muted-strong">
        <span className="text-accent">↑</span> Up 18 lb from last month — keep going.
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-card border border-line/70 bg-surface-2 p-3 text-center">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">{label}</div>
      <div className="mt-1 font-display text-lg leading-none">
        {value}
        {unit ? <span className="ml-0.5 text-xs text-muted">{unit}</span> : null}
      </div>
    </div>
  );
}
