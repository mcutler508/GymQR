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
import type { ProgressionPoint } from '@/lib/stats';
import { ChartTooltip } from '../_components/ChartTooltip';
import { EmptyState } from '../_components/EmptyState';
import { useDismissChartOnOutside } from '../_components/useDismissChartOnOutside';

export function ProgressionChart({ points }: { points: ProgressionPoint[] }) {
  if (points.length === 0) {
    return (
      <EmptyState
        headline="No working sets yet"
        sublabel="Log a few sets on this machine to see your progression."
      />
    );
  }

  // Find the lifetime PR point so we can drop a small accent marker on the
  // chart. Heaviest weight wins, reps break ties — same rule as prFor().
  let prPoint = points[0];
  for (const p of points) {
    if (p.weight > prPoint.weight || (p.weight === prPoint.weight && p.reps > prPoint.reps)) {
      prPoint = p;
    }
  }

  return (
    <ChartShell>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 32, right: 24, bottom: 8, left: 0 }}>
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
            width={40}
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
                formatValue={(value, payload) => {
                  const reps = (payload as ProgressionPoint | undefined)?.reps;
                  return {
                    primary: `${value} × ${reps ?? '?'}`,
                    secondary: 'Working set',
                  };
                }}
              />
            }
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="rgb(var(--accent))"
            strokeWidth={2}
            dot={{ fill: 'rgb(var(--accent))', stroke: 'rgb(var(--accent))', r: 3 }}
            activeDot={{ r: 5, fill: 'rgb(var(--accent))', stroke: 'rgb(var(--surface))', strokeWidth: 2 }}
          />
          <ReferenceDot
            x={prPoint.ts}
            y={prPoint.weight}
            r={6}
            fill="rgb(var(--accent))"
            stroke="rgb(var(--surface))"
            strokeWidth={2}
            ifOverflow="visible"
            label={{
              value: 'PR',
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
