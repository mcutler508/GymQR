import { cookies } from 'next/headers';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { lifetimeTotals, prFor, weeklyStreak } from '@/lib/stats';
import { filterByRange } from '@/lib/member-range';
import type { GymTheme } from '@/app/scan/[qrSlug]/page';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'reptag_member_id';

type DashboardSet = {
  weight: number | null;
  reps: number | null;
  duration_seconds: number | null;
  logged_at: string;
  equipment_id: string;
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
      'weight, reps, duration_seconds, logged_at, equipment_id, equipment(name)',
    )
    .eq('member_id', memberId)
    .order('logged_at', { ascending: false })
    .limit(500)
    .returns<DashboardSet[]>();

  const sets = setsRaw ?? [];
  const monthSets = filterByRange(sets, 'month', timezone);
  const monthTotals = lifetimeTotals(monthSets, timezone);
  const pr = prFor(sets);
  const streak = weeklyStreak(sets, timezone);
  const lastSet = sets[0] ?? null;

  const greeting = greetingFor();
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
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] opacity-70 font-medium">
              Primary action
            </p>
            <p
              className={[
                'mt-1.5 font-display leading-none',
                'halogen:text-2xl halogen:font-medium',
                'concrete:text-3xl concrete:font-black concrete:uppercase',
                'locker:text-xl locker:font-semibold',
                'athletic:text-2xl athletic:font-black athletic:italic athletic:uppercase',
              ].join(' ')}
            >
              Scan a machine
            </p>
            <p className="mt-2 text-sm opacity-80">Tap a sticker · log a set in seconds.</p>
          </div>
          <ScanGlyph />
        </div>
      </Link>

      {hasAnySets && (
        <>
          <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted font-medium mb-3">
            This month
          </h2>
          <section className="grid grid-cols-3 gap-x-4 gap-y-2 mb-9">
            <DashboardStat label="Sets" value={String(monthTotals.totalSets)} />
            <DashboardStat
              label="Workouts"
              value={String(monthTotals.workoutDays)}
              suffix={monthTotals.workoutDays === 1 ? 'day' : 'days'}
            />
            <DashboardStat
              label="Streak"
              value={streak >= 1 ? String(streak) : '—'}
              suffix={streak >= 1 ? (streak === 1 ? 'day' : 'days') : undefined}
            />
          </section>

          {(lastSet || pr) && (
            <section className="mb-9">
              <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted font-medium mb-3">
                Latest
              </h2>
              <dl className="divide-y divide-line border-t border-line">
                {lastSet && (
                  <RowItem
                    term="Last machine"
                    primary={lastSet.equipment?.name ?? 'Unknown machine'}
                    secondary={relativeTime(lastSet.logged_at)}
                  />
                )}
                {pr && (
                  <RowItem
                    term="Lifetime PR"
                    primary={`${fmtWeight(pr.weight)} × ${pr.reps}`}
                    secondary={absoluteDate(pr.logged_at)}
                    accent
                  />
                )}
              </dl>
            </section>
          )}
        </>
      )}

      <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted font-medium mb-3">
        More
      </h2>
      <ul className="divide-y divide-line border-t border-line border-b">
        <SecondaryLink href="/me/stats" label="View all stats" sub="Volume, sets, PRs, machine breakdowns" />
        <SecondaryLink href="/me/history" label="Recent history" sub="Sessions grouped by workout" />
        <SecondaryLink href="/me/profile" label="Profile" sub="Name, gym, sign out" />
      </ul>
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
      {suffix && (
        <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.15em] text-muted">{suffix}</p>
      )}
    </div>
  );
}

function RowItem({
  term,
  primary,
  secondary,
  accent,
}: {
  term: string;
  primary: string;
  secondary?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">{term}</dt>
      <dd className="text-right">
        <p className={`font-display text-base tabular-nums ${accent ? 'text-accent' : 'text-ink'}`}>
          {primary}
        </p>
        {secondary && <p className="mt-0.5 text-[10px] font-mono uppercase tracking-[0.15em] text-muted">{secondary}</p>}
      </dd>
    </div>
  );
}

function SecondaryLink({ href, label, sub }: { href: string; label: string; sub: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center justify-between gap-4 py-4 transition-colors hover:bg-surface-2 -mx-2 px-2 rounded-sm"
      >
        <div className="min-w-0">
          <p className="font-medium text-ink">{label}</p>
          <p className="mt-0.5 text-[10px] font-mono uppercase tracking-[0.15em] text-muted">{sub}</p>
        </div>
        <span className="text-muted-strong text-lg">→</span>
      </Link>
    </li>
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

function fmtWeight(w: number): string {
  return Number.isInteger(w) ? String(w) : w.toFixed(1);
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return absoluteDate(iso);
}

function absoluteDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function greetingFor(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
