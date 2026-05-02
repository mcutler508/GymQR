'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { RangeBucket, BucketScale } from '@/lib/member-range';

type Props = {
  buckets: RangeBucket[];
  scale: BucketScale;
  hasCardio: boolean;
};

type Metric = {
  key: string;
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

const STRENGTH_METRICS: Metric[] = [
  {
    key: 'sets',
    label: 'Sets',
    unit: 'sets',
    valueOf: (b) => b.setCount,
    format: (n) => String(n),
  },
  {
    key: 'volume',
    label: 'Volume',
    unit: 'lbs',
    valueOf: (b) => b.totalVolume,
    format: (n) => formatThousands(n),
  },
  {
    key: 'workouts',
    label: 'Workouts',
    unit: 'days',
    valueOf: (b) => b.workoutDays,
    format: (n) => String(n),
  },
];

const CARDIO_METRIC: Metric = {
  key: 'cardio',
  label: 'Cardio',
  unit: 'min',
  valueOf: (b) => Math.round(b.cardioSeconds / 60),
  format: (n) => String(n),
};

export function WeeklyBarCharts({ buckets, scale, hasCardio }: Props) {
  const metrics = hasCardio ? [...STRENGTH_METRICS, CARDIO_METRIC] : STRENGTH_METRICS;
  const scaleWord = SCALE_LABEL[scale];

  return (
    <div
      className={[
        'grid gap-3 mb-6',
        hasCardio ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3',
      ].join(' ')}
    >
      {metrics.map((m) => (
        <ChartCard key={m.key} metric={m} buckets={buckets} scaleWord={scaleWord} />
      ))}
    </div>
  );
}

function ChartCard({
  metric,
  buckets,
  scaleWord,
}: {
  metric: Metric;
  buckets: RangeBucket[];
  scaleWord: string;
}) {
  const latest = buckets[buckets.length - 1];
  const latestValue = latest ? metric.valueOf(latest) : 0;

  const data = buckets.map((b) => ({
    label: b.label,
    bucketKey: b.key,
    value: metric.valueOf(b),
  }));

  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">
          {metric.label} per {scaleWord}
        </p>
        <p className="text-xs text-muted-strong tabular-nums">
          <span className="font-display text-ink text-base mr-1">
            {metric.format(latestValue)}
          </span>
          this {scaleWord}
        </p>
      </div>
      <div className="h-24 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <XAxis dataKey="label" hide />
            <YAxis hide domain={[0, 'dataMax']} />
            <Tooltip
              cursor={{ fill: 'rgb(var(--accent) / 0.08)' }}
              contentStyle={{
                background: 'rgb(var(--surface-2))',
                border: '1px solid rgb(var(--line))',
                borderRadius: 'var(--radius)',
                fontSize: '11px',
                color: 'rgb(var(--ink))',
                padding: '6px 10px',
              }}
              labelStyle={{
                color: 'rgb(var(--muted))',
                fontSize: '10px',
                marginBottom: '2px',
              }}
              labelFormatter={(label) => String(label)}
              formatter={(value) => {
                const n = typeof value === 'number' ? value : Number(value);
                return [`${metric.format(n)} ${metric.unit}`, ''] as [string, string];
              }}
              separator=""
            />
            <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={28}>
              {data.map((d, i) => (
                <Cell
                  key={d.bucketKey}
                  fill={
                    i === data.length - 1
                      ? 'rgb(var(--accent))'
                      : 'rgb(var(--accent) / 0.45)'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function formatThousands(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}k`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}
