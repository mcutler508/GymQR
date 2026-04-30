'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import type { ProgressionPoint } from '@/lib/stats';

export function ProgressionChart({ points }: { points: ProgressionPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-neutral-500">
        No sets logged yet on this machine.
      </div>
    );
  }

  return (
    <div className="h-56 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 16, bottom: 8, left: -16 }}>
          <CartesianGrid stroke="#262626" strokeDasharray="3 3" />
          <XAxis
            dataKey="ts"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v: number) =>
              new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            }
            tick={{ fill: '#737373', fontSize: 11 }}
            stroke="#404040"
          />
          <YAxis
            tick={{ fill: '#737373', fontSize: 11 }}
            stroke="#404040"
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: '#0a0a0a',
              border: '1px solid #262626',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelFormatter={(v) => {
              const ts = typeof v === 'number' ? v : Number(v);
              return Number.isFinite(ts)
                ? new Date(ts).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : '';
            }}
            formatter={(value, _name, ctx) => {
              const reps = (ctx?.payload as ProgressionPoint | undefined)?.reps;
              return [`${value} × ${reps ?? '?'}`, 'Working set'] as [string, string];
            }}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#34d399"
            strokeWidth={2}
            dot={{ fill: '#34d399', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
