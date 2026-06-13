'use client';

import { useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
} from 'recharts';
import {
  formatDuration,
  formatMiles,
  type CardioProgressionPoint,
} from '@/lib/cardio';
import { ChartTooltip } from '../_components/ChartTooltip';
import { EmptyState } from '../_components/EmptyState';
import { useDismissChartOnOutside } from '../_components/useDismissChartOnOutside';

export function CardioProgressionChart({ points }: { points: CardioProgressionPoint[] }) {
  if (points.length === 0) {
    return (
      <EmptyState
        headline="No sessions yet"
        sublabel="Log a session on this machine to see your duration over time."
      />
    );
  }

  // Y axis is duration in minutes for cleaner ticks than seconds.
  const data = points.map((p) => ({
    ts: p.ts,
    minutes: p.durationSeconds / 60,
    durationSeconds: p.durationSeconds,
    distanceMeters: p.distanceMeters,
  }));

  // Longest session — annotated as the "best" marker.
  let best = data[0];
  for (const d of data) {
    if (d.minutes > best.minutes) best = d;
  }

  return (
    <ChartShell>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 32, right: 24, bottom: 8, left: 0 }}>
          <CartesianGrid
            stroke="rgb(var(--line))"
            strokeDasharray="2 4"
            vertical={false}
          />
          <XAxis
            dataKey="ts"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v: number) =>
              new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            }
            tick={{ fill: 'rgb(var(--muted))', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'rgb(var(--line))' }}
          />
          <YAxis
            tick={{ fill: 'rgb(var(--muted))', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v: number) => `${Math.round(v)}m`}
            domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.1)]}
          />
          <Tooltip
            cursor={{ stroke: 'rgb(var(--line))', strokeWidth: 1 }}
            content={
              <ChartTooltip
                formatLabel={(label) => {
                  const ts = typeof label === 'number' ? label : Number(label);
                  return Number.isFinite(ts)
                    ? new Date(ts).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '';
                }}
                formatValue={(_value, payload) => {
                  const p = payload as
                    | { durationSeconds: number; distanceMeters: number }
                    | undefined;
                  if (!p) return { primary: '' };
                  const dur = formatDuration(p.durationSeconds);
                  return {
                    primary: p.distanceMeters > 0
                      ? `${dur} · ${formatMiles(p.distanceMeters)} mi`
                      : dur,
                    secondary: 'Session',
                  };
                }}
              />
            }
          />
          <Line
            type="monotone"
            dataKey="minutes"
            stroke="rgb(var(--accent))"
            strokeWidth={2}
            dot={{ fill: 'rgb(var(--accent))', stroke: 'rgb(var(--accent))', r: 3 }}
            activeDot={{ r: 5, fill: 'rgb(var(--accent))', stroke: 'rgb(var(--surface))', strokeWidth: 2 }}
          />
          <ReferenceDot
            x={best.ts}
            y={best.minutes}
            r={6}
            fill="rgb(var(--accent))"
            stroke="rgb(var(--surface))"
            strokeWidth={2}
            ifOverflow="visible"
            label={{
              value: 'BEST',
              position: 'top',
              offset: 8,
              fill: 'rgb(var(--accent))',
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.15em',
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

function ChartShell({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useDismissChartOnOutside(ref);
  return (
    <div ref={ref} className="h-72 sm:h-80 w-full mt-2">
      {children}
    </div>
  );
}
