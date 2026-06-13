'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { RangeBucket, BucketScale } from '@/lib/member-range';
import { ChartTooltip } from './ChartTooltip';

type Props = {
  buckets: RangeBucket[];
  scale: BucketScale;
  hasCardio: boolean;
};

type MetricKey = 'sets' | 'volume' | 'workouts' | 'cardio';

type Metric = {
  key: MetricKey;
  label: string;
  unit: string;
  valueOf: (b: RangeBucket) => number;
  format: (n: number) => string;
};

const SCALE_LABEL: Record<BucketScale, string> = {
  day: 'day',
  week: 'week',
  month: 'month',
};

const ALL_METRICS: Record<MetricKey, Metric> = {
  sets: {
    key: 'sets',
    label: 'Sets',
    unit: 'sets',
    valueOf: (b) => b.setCount,
    format: (n) => String(n),
  },
  volume: {
    key: 'volume',
    label: 'Volume',
    unit: 'lbs',
    valueOf: (b) => b.totalVolume,
    format: formatThousands,
  },
  workouts: {
    key: 'workouts',
    label: 'Workouts',
    unit: 'days',
    valueOf: (b) => b.workoutDays,
    format: (n) => String(n),
  },
  cardio: {
    key: 'cardio',
    label: 'Cardio',
    unit: 'min',
    valueOf: (b) => Math.round(b.cardioSeconds / 60),
    format: (n) => String(n),
  },
};

export function ActivityChart({ buckets, scale, hasCardio }: Props) {
  const metricKeys: MetricKey[] = hasCardio
    ? ['sets', 'volume', 'workouts', 'cardio']
    : ['sets', 'volume', 'workouts'];
  const [activeKey, setActiveKey] = useState<MetricKey>('sets');
  const metric = ALL_METRICS[activeKey];
  const scaleWord = SCALE_LABEL[scale];

  const data = buckets.map((b) => ({
    label: b.label,
    bucketKey: b.key,
    value: metric.valueOf(b),
  }));
  const latest = data[data.length - 1];
  const latestValue = latest?.value ?? 0;

  // Tick density: show fewer x-axis ticks when there are many buckets so labels
  // don't collide on narrow screens. ytd (12 months) and 'all' (10 weeks) both
  // benefit from skip-every-other.
  const tickInterval =
    data.length > 8 ? Math.ceil(data.length / 6) - 1 : 0;

  return (
    <section className="rounded-card border border-line bg-surface p-4 sm:p-5 mb-6">
      <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted font-medium">
          Activity · last {data.length} {data.length === 1 ? scaleWord : `${scaleWord}s`}
        </p>
        <p className="text-xs text-muted-strong">
          <span className="font-display text-ink text-xl mr-1.5 tabular-nums">
            {metric.format(latestValue)}
          </span>
          this {scaleWord}
        </p>
      </div>

      <div className="flex flex-wrap gap-1 p-1 rounded-card bg-surface-2 border border-line mb-4 text-xs">
        {metricKeys.map((k) => {
          const m = ALL_METRICS[k];
          const active = k === activeKey;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setActiveKey(k)}
              aria-pressed={active}
              className={`flex-1 px-3 py-1.5 rounded transition-colors ${
                active
                  ? 'bg-accent text-accent-ink font-medium'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="h-48 sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -24 }}>
            <CartesianGrid
              stroke="rgb(var(--line))"
              strokeDasharray="2 4"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: 'rgb(var(--muted))', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'rgb(var(--line))' }}
              interval={tickInterval}
            />
            <YAxis
              tick={{ fill: 'rgb(var(--muted))', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={(v: number) => metric.format(v)}
              domain={[0, 'dataMax']}
            />
            <Tooltip
              cursor={{ fill: 'rgb(var(--accent) / 0.08)' }}
              content={
                <ChartTooltip
                  formatValue={(value) => ({
                    primary: `${metric.format(value)} ${metric.unit}`,
                  })}
                />
              }
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={36}>
              {data.map((d, i) => (
                <Cell
                  key={d.bucketKey}
                  fill={
                    i === data.length - 1
                      ? 'rgb(var(--accent))'
                      : 'rgb(var(--accent) / 0.35)'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function formatThousands(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}k`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}
