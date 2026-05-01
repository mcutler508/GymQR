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
import {
  formatDuration,
  formatMiles,
  type CardioProgressionPoint,
} from '@/lib/cardio';

export function CardioProgressionChart({ points }: { points: CardioProgressionPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-neutral-500">
        No sessions logged yet on this machine.
      </div>
    );
  }

  // Y axis is duration in minutes (cleaner ticks than seconds).
  const data = points.map((p) => ({
    ts: p.ts,
    minutes: p.durationSeconds / 60,
    durationSeconds: p.durationSeconds,
    distanceMeters: p.distanceMeters,
  }));

  return (
    <div className="h-56 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: -16 }}>
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
            tickFormatter={(v: number) => `${Math.round(v)}m`}
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
            formatter={(_value, _name, ctx) => {
              const p = ctx?.payload as
                | { durationSeconds: number; distanceMeters: number }
                | undefined;
              if (!p) return ['', ''] as [string, string];
              const dur = formatDuration(p.durationSeconds);
              const label = p.distanceMeters > 0
                ? `${dur} · ${formatMiles(p.distanceMeters)} mi`
                : dur;
              return [label, 'Session'] as [string, string];
            }}
          />
          <Line
            type="monotone"
            dataKey="minutes"
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
