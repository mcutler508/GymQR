import { cookies } from 'next/headers';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { latestPrEvent, lifetimeTotals, weeklyStreak } from '@/lib/stats';
import { filterByRange } from '@/lib/member-range';
import { formatLocal } from '@/lib/timezone';
import { fmtWeight } from '@/lib/format';
import type { GymTheme } from '@/app/scan/[qrSlug]/page';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'reptag_member_id';

type DashboardSet = {
  weight: number | null;
  reps: number | null;
  duration_seconds: number | null;
  logged_at: string;
  equipment_id: string;
  exercise_name: string | null;
  equipment: { name: string } | null;
};

export default async function MemberDashboard() {
  const store = await cookies();
  // Layout already gated on the cookie; this is for the DB call.
  const memberId = store.get(COOKIE_NAME)!.value;

  const { data: member } = await supabase
    .from('members')
    .select('name, gym_id, gyms(name, timezone)')
    .eq('id', memberId)
    .maybeSingle<{ name: string; gym_id: string; gyms: { name: string; timezone: string; theme: GymTheme } | null }>();

  const memberName = member?.name ?? 'Member';
  const timezone = member?.gyms?.timezone ?? 'UTC';

  const { data: setsRaw } = await supabase
    .from('sets')
    .select(
      'weight, reps, duration_seconds, logged_at, equipment_id, exercise_name, equipment(name)',
    )
    .eq('member_id', memberId)
    .order('logged_at', { ascending: false })
    .limit(500)
    .returns<DashboardSet[]>();

  const sets = setsRaw ?? [];
  const monthSets = filterByRange(sets, 'month', timezone);
  const monthTotals = lifetimeTotals(monthSets, timezone);
  const daysThisWeek = weeklyStreak(sets, timezone);
  const pr = latestPrEvent(sets);
  const lastSet = sets[0] ?? null;

  const nameByEquipment = new Map<string, string>();
  for (const s of sets) {
    if (s.equipment && !nameByEquipment.has(s.equipment_id)) {
      nameByEquipment.set(s.equipment_id, s.equipment.name);
    }
  }
  const prMachine = pr
    ? [nameByEquipment.get(pr.equipment_id) ?? 'Machine', pr.exercise_name].filter(Boolean).join(' · ')
    : null;

  const greeting = greetingFor(timezone);
  const hasAnySets = sets.length > 0;

  return (
    <>
      <header className="mb-7">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted font-medium mb-1.5">
          {greeting} · {memberName}
        </p>
        <h1
          className={[
            'font-display tracking-tight leading-none',
            'halogen:text-4xl halogen:font-medium',
            'concrete:text-5xl concrete:font-black concrete:uppercase concrete:leading-[0.9]',
            'locker:text-3xl locker:font-semibold',
            'athletic:text-4xl athletic:font-black athletic:italic athletic:uppercase',
          ].join(' ')}
        >
          {hasAnySets ? 'Ready to lift?' : 'Let’s log your first set.'}
        </h1>
      </header>

      <Link
        href="/scan"
        className={[
          'group block relative overflow-hidden mb-9 rounded-card bg-accent text-accent-ink',
          'px-6 py-7 transition-transform active:scale-[0.99]',
          'concrete:rounded-none',
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p
              className={[
                'font-display leading-none',
                'halogen:text-3xl halogen:font-medium',
                'concrete:text-4xl concrete:font-black concrete:uppercase',
                'locker:text-2xl locker:font-semibold',
                'athletic:text-3xl athletic:font-black athletic:italic athletic:uppercase',
              ].join(' ')}
            >
              Scan a machine
            </p>
            <p className="mt-2 text-sm opacity-80">Point at a sticker · log a set in seconds.</p>
          </div>
          <ScanGlyph />
        </div>
      </Link>

      {hasAnySets && (
        <>
          <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted font-medium mb-3">
            This month
          </h2>
          <section className="mb-9 rounded-card bg-surface p-5">
            <div className="grid grid-cols-3 gap-x-4 gap-y-2">
              <DashboardStat label="Sets" value={String(monthTotals.totalSets)} />
              <DashboardStat
                label="Workouts"
                value={String(monthTotals.workoutDays)}
                suffix={monthTotals.workoutDays === 1 ? 'day' : 'days'}
              />
              <DashboardStat
                label="This week"
                value={daysThisWeek >= 1 ? String(daysThisWeek) : '—'}
                suffix={daysThisWeek >= 1 ? `of 7 days` : undefined}
              />
            </div>
          </section>

          {(lastSet || pr) && (
            <section className="mb-9">
              <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted font-medium mb-3">
                Latest
              </h2>
              <div className="divide-y divide-line border-y border-line">
                {lastSet && (
                  <RowItem
                    term="Last machine"
                    href={`/me/stats/${lastSet.equipment_id}`}
                    primary={lastSet.equipment?.name ?? 'Unknown machine'}
                    secondary={relativeTime(lastSet.logged_at, timezone)}
                  />
                )}
                {pr && (
                  <RowItem
                    term="Latest PR"
                    href={`/me/stats/${pr.equipment_id}`}
                    primary={`${fmtWeight(pr.weight)} × ${pr.reps}`}
                    secondary={`${prMachine} · ${formatLocal(pr.logged_at, timezone, 'MMM d')}`}
                    accent
                  />
                )}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}

function DashboardStat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div>
      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted font-medium">{label}</p>
      <p
        className={[
          'mt-1.5 font-display tabular-nums leading-none text-ink',
          'halogen:text-2xl halogen:font-medium',
          'concrete:text-3xl concrete:font-black',
          'locker:text-xl locker:font-semibold',
          'athletic:text-2xl athletic:font-black athletic:italic',
        ].join(' ')}
      >
        {value}
      </p>
      {suffix && <p className="mt-1 text-xs text-muted-strong">{suffix}</p>}
    </div>
  );
}

function RowItem({
  term,
  primary,
  secondary,
  accent,
  href,
}: {
  term: string;
  primary: string;
  secondary?: string;
  accent?: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-4 py-3.5 -mx-2 px-2 rounded-sm transition-colors hover:bg-surface-2"
    >
      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted shrink-0">{term}</span>
      <div className="min-w-0 text-right">
        <p className={`font-display text-lg tabular-nums ${accent ? 'text-accent' : 'text-ink'}`}>
          {primary}
        </p>
        {secondary && <p className="mt-0.5 text-xs text-muted-strong truncate">{secondary}</p>}
      </div>
    </Link>
  );
}

function ScanGlyph() {
  return (
    <svg
      width={56}
      height={56}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0 opacity-90"
    >
      <path d="M4 8V6a2 2 0 0 1 2-2h2" />
      <path d="M20 8V6a2 2 0 0 0-2-2h-2" />
      <path d="M4 16v2a2 2 0 0 0 2 2h2" />
      <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
      <rect x="8" y="8" width="8" height="8" rx="1" />
    </svg>
  );
}

function relativeTime(iso: string, timezone: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return formatLocal(iso, timezone, 'MMM d');
}

/** Server runs in UTC — greet by the gym's clock, not Vercel's. */
function greetingFor(timezone: string): string {
  const h = Number(formatLocal(new Date().toISOString(), timezone, 'H'));
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
