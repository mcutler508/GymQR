import { cookies } from 'next/headers';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  RANGE_OPTIONS,
  filterByRange,
  priorRangeLabel,
  priorRangeTotals,
  type RangeKey,
} from '@/lib/member-range';
import {
  BODY_PART_LABELS,
  setsByBodyPart,
  volumeByBodyPart,
  type BodyPart,
} from '@/lib/body-parts';
import type { EquipmentType } from '@/lib/supabase';
import { EmptyState } from '@/app/me/stats/_components/EmptyState';
import { DeltaIndicator, type Delta } from '@/app/me/stats/_components/DeltaIndicator';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'reptag_member_id';

const ALLOWED_METRICS = ['volume', 'sets'] as const;
type Metric = (typeof ALLOWED_METRICS)[number];

const ALLOWED_RANGES: ReadonlySet<RangeKey> = new Set(['week', 'month', 'ytd', 'all']);

type SetRow = {
  weight: number | null;
  reps: number | null;
  duration_seconds: number | null;
  exercise_name: string | null;
  logged_at: string;
  equipment_id: string;
  equipment: { id: string; name: string; equipment_type: EquipmentType } | null;
};

export default async function BreakdownPage({
  searchParams,
}: {
  searchParams: Promise<{ metric?: string; range?: string }>;
}) {
  const sp = await searchParams;
  const metric: Metric = isMetric(sp.metric) ? sp.metric : 'volume';
  const range: RangeKey = isRange(sp.range) ? sp.range : 'month';

  const store = await cookies();
  const memberId = store.get(COOKIE_NAME)!.value;

  const { data: member } = await supabase
    .from('members')
    .select('gyms(timezone)')
    .eq('id', memberId)
    .maybeSingle<{ gyms: { timezone: string } | null }>();
  const timezone = member?.gyms?.timezone ?? 'UTC';

  const { data: setsRaw } = await supabase
    .from('sets')
    .select(
      'weight, reps, duration_seconds, exercise_name, logged_at, equipment_id, equipment(id, name, equipment_type)',
    )
    .eq('member_id', memberId)
    .returns<SetRow[]>();

  const sets = setsRaw ?? [];
  const ranged = filterByRange(sets, range, timezone);

  // Equipment lookup for inferBodyPart — distinct on id.
  const equipmentMap = new Map<string, { id: string; name: string }>();
  for (const s of sets) {
    if (s.equipment && !equipmentMap.has(s.equipment.id)) {
      equipmentMap.set(s.equipment.id, { id: s.equipment.id, name: s.equipment.name });
    }
  }
  const equipment = Array.from(equipmentMap.values());

  const totals =
    metric === 'volume'
      ? volumeByBodyPart(ranged, equipment)
      : setsByBodyPart(ranged, equipment);
  const grandTotal = (Object.values(totals) as number[]).reduce((s, n) => s + n, 0);

  // Sort by value desc, keep 'other' pinned to the bottom regardless of size.
  const sorted = (Object.entries(totals) as [BodyPart, number][])
    .sort((a, b) => {
      if (a[0] === 'other') return 1;
      if (b[0] === 'other') return -1;
      return b[1] - a[1];
    });

  // Delta vs prior period for the same metric.
  const prior = priorRangeTotals(sets, range, timezone);
  const priorVal = prior ? (metric === 'volume' ? prior.volume : prior.setCount) : null;
  const rangeWord = RANGE_OPTIONS.find((o) => o.key === range)?.sublabel ?? '';
  const priorWord = priorRangeLabel(range);

  const isVolume = metric === 'volume';
  const otherMetric: Metric = isVolume ? 'sets' : 'volume';

  return (
    <>
      <p className="mb-5">
        <Link
          href="/me/stats"
          className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted hover:text-ink transition-colors"
        >
          ← All stats
        </Link>
      </p>

      <header className="mb-6">
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1.5">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted font-medium">
            {isVolume ? 'Volume' : 'Sets'} · by body part · {rangeWord}
          </p>
          <Link
            href={`/me/stats/breakdown?metric=${otherMetric}&range=${range}`}
            className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-strong hover:text-ink transition-colors"
          >
            View by {otherMetric} ›
          </Link>
        </div>
        <p
          className={[
            'font-display tabular-nums tracking-tight leading-none text-ink',
            'halogen:text-5xl halogen:font-medium',
            'concrete:text-6xl concrete:font-black',
            'locker:text-4xl locker:font-semibold',
            'athletic:text-5xl athletic:font-black athletic:italic',
          ].join(' ')}
        >
          {formatTotal(grandTotal, metric)}
        </p>
        <p className="mt-1.5 text-[10px] font-mono uppercase tracking-[0.15em] text-muted">
          {isVolume ? 'lbs moved' : grandTotal === 1 ? 'set' : 'sets'} {rangeWord}
        </p>
        {priorVal !== null && priorWord && (
          <DeltaIndicator
            {...buildDelta(grandTotal, priorVal, isVolume, priorWord)}
          />
        )}
      </header>

      <div className="mb-7">
        <RangeTabs metric={metric} range={range} />
      </div>

      {grandTotal === 0 ? (
        <EmptyState
          kicker={`No ${isVolume ? 'volume' : 'sets'} yet`}
          headline={`Nothing logged ${rangeWord}`}
          sublabel="Switch to a wider range above, or scan a machine to log something fresh."
          cta={{ label: 'Open scanner', href: '/scan' }}
        />
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {sorted.map(([part, value]) => (
            <BodyPartRow
              key={part}
              label={BODY_PART_LABELS[part]}
              value={value}
              percent={grandTotal > 0 ? (value / grandTotal) * 100 : 0}
              metric={metric}
            />
          ))}
        </ul>
      )}

      <p className="mt-9 text-[10px] font-mono uppercase tracking-[0.18em] text-muted">
        Body parts are inferred from machine + exercise names. Anything we can&rsquo;t classify lands in <span className="text-ink">Other</span>.
      </p>
    </>
  );
}

function BodyPartRow({
  label,
  value,
  percent,
  metric,
}: {
  label: string;
  value: number;
  percent: number;
  metric: Metric;
}) {
  const percentLabel = `${Math.round(percent)}%`;
  return (
    <li className="py-4">
      <div className="flex items-baseline justify-between gap-4 mb-2.5">
        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-ink font-medium">
          {label}
        </p>
        <p className="text-sm tabular-nums">
          <span className="font-display text-ink">{formatTotal(value, metric)}</span>
          <span className="ml-2 text-[10px] font-mono uppercase tracking-[0.15em] text-muted">
            {percentLabel}
          </span>
        </p>
      </div>
      <div className="relative h-[3px] w-full rounded-full bg-line overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-accent rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(percent, value > 0 ? 1.5 : 0)}%` }}
          aria-hidden
        />
      </div>
    </li>
  );
}

function RangeTabs({ metric, range }: { metric: Metric; range: RangeKey }) {
  return (
    <div
      role="tablist"
      aria-label="Time range"
      className="inline-flex items-center gap-1 p-1 rounded-card bg-surface border border-line text-xs"
    >
      {RANGE_OPTIONS.map((opt) => {
        const active = opt.key === range;
        const cls = `px-3 py-1.5 rounded transition-colors ${
          active
            ? 'bg-accent text-accent-ink font-medium'
            : 'text-muted hover:text-ink'
        }`;
        if (active) {
          return (
            <span key={opt.key} role="tab" aria-selected="true" className={cls}>
              {opt.label}
            </span>
          );
        }
        return (
          <Link
            key={opt.key}
            role="tab"
            href={`/me/stats/breakdown?metric=${metric}&range=${opt.key}`}
            className={cls}
          >
            {opt.label}
          </Link>
        );
      })}
    </div>
  );
}

function buildDelta(
  current: number,
  prior: number,
  isVolume: boolean,
  priorLabel: string,
): Delta {
  if (current === prior) {
    return { value: 'No change', direction: 'flat', descriptor: priorLabel };
  }
  const diff = current - prior;
  if (prior === 0) {
    return {
      value: `+${isVolume ? formatTotal(Math.abs(diff), 'volume') + ' lbs' : Math.abs(diff)}`,
      direction: 'up',
      descriptor: priorLabel,
    };
  }
  const pct = Math.round((diff / prior) * 100);
  return {
    value: `${Math.abs(pct)}%`,
    direction: diff > 0 ? 'up' : 'down',
    descriptor: priorLabel,
  };
}

function formatTotal(n: number, metric: Metric): string {
  if (metric === 'sets') return String(n);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}k`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

function isMetric(v: string | undefined): v is Metric {
  return v === 'volume' || v === 'sets';
}

function isRange(v: string | undefined): v is RangeKey {
  return v !== undefined && ALLOWED_RANGES.has(v as RangeKey);
}
