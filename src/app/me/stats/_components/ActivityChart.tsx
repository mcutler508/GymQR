'use client';

import { useRef, useState } from 'react';
import { useDismissChartOnOutside } from './useDismissChartOnOutside';
import {
  ComposedChart,
  Area,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceDot,
  ResponsiveContainer,
} from 'recharts';
import type { RangeBucket, BucketScale } from '@/lib/member-range';
import { ChartTooltip } from './ChartTooltip';

type Props = {
  buckets: RangeBucket[];
  scale: BucketScale;
};

type MetricKey = 'sets' | 'volume';

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
};

export function ActivityChart({ buckets, scale }: Props) {
  const metricKeys: MetricKey[] = ['sets', 'volume'];
  const [activeKey, setActiveKey] = useState<MetricKey>('sets');
  const chartRef = useRef<HTMLDivElement>(null);
  useDismissChartOnOutside(chartRef);
  const metric = ALL_METRICS[activeKey];
  const scaleWord = SCALE_LABEL[scale];

  const rawValues = buckets.map((b) => metric.valueOf(b));
  const trend = rollingAverage(rawValues, Math.min(4, Math.max(2, Math.floor(rawValues.length / 3))));
  const data = buckets.map((b, i) => ({
    label: b.label,
    bucketKey: b.key,
    value: rawValues[i],
    trend: trend[i],
  }));
  const latest = data[data.length - 1];
  const latestValue = latest?.value ?? 0;

  let bestIndex = -1;
  data.forEach((d, i) => {
    if (bestIndex === -1 || d.value > data[bestIndex].value) bestIndex = i;
  });
  const best = bestIndex >= 0 && data[bestIndex].value > 0 ? data[bestIndex] : null;

  const tickInterval =
    data.length > 8 ? Math.ceil(data.length / 6) - 1 : 0;

  const gradientId = `activity-fill-${activeKey}`;

  return (
    <section className="mb-8 rounded-card bg-surface-2 p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted font-medium">
          Activity · last {data.length} {data.length === 1 ? scaleWord : `${scaleWord}s`}
        </p>
        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted">
          <span className="font-display normal-case tracking-normal text-ink text-xl mr-1.5 tabular-nums">
            {metric.format(latestValue)}
          </span>
          this {scaleWord}
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Chart metric"
        className="flex items-end gap-6 border-b border-line mb-4 text-xs"
      >
        {metricKeys.map((k) => {
          const m = ALL_METRICS[k];
          const active = k === activeKey;
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveKey(k)}
              className={`pb-2 -mb-px font-mono uppercase tracking-[0.15em] text-[11px] transition-colors border-b-2 ${
                active
                  ? 'text-ink border-accent'
                  : 'text-muted border-transparent hover:text-ink'
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <div ref={chartRef} className="h-56 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 32, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity={0.35} />
                <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              width={48}
              tickFormatter={(v: number) => metric.format(v)}
              domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.1)]}
            />
            <Tooltip
              cursor={{ stroke: 'rgb(var(--line))', strokeWidth: 1 }}
              content={
                <ChartTooltip
                  formatValue={(value, payload) => {
                    const trendVal = (payload as { trend?: number } | undefined)?.trend;
                    return {
                      primary: `${metric.format(value)} ${metric.unit}`,
                      secondary:
                        typeof trendVal === 'number'
                          ? `Trend ${metric.format(Math.round(trendVal))}`
                          : undefined,
                    };
                  }}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="rgb(var(--accent))"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              activeDot={{ r: 5, fill: 'rgb(var(--accent))', stroke: 'rgb(var(--surface))', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="trend"
              stroke="rgb(var(--muted))"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            {best && (
              <ReferenceDot
                x={best.label}
                y={best.value}
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
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function rollingAverage(values: number[], window: number): (number | null)[] {
  if (window < 2 || values.length < window) return values.map(() => null);
  const out: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < window - 1) {
      out.push(null);
      continue;
    }
    let sum = 0;
    for (let j = i - window + 1; j <= i; j++) sum += values[j];
    out.push(sum / window);
  }
  return out;
}

function formatThousands(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}k`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}
