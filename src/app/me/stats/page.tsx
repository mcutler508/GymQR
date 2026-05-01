import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  lifetimeTotals,
  weeklyStreak,
  prFor,
  progressionFor,
  type ProgressionPoint,
  type PR,
} from '@/lib/stats';
import { Sparkline } from './Sparkline';
import type { GymTheme } from '@/app/scan/[qrSlug]/page';
import type { EquipmentType } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'reptag_member_id';

type SetRow = {
  weight: number | null;
  reps: number | null;
  logged_at: string;
  equipment_id: string;
  exercise_name: string | null;
  equipment: {
    id: string;
    name: string;
    machine_label: string | null;
    equipment_type: EquipmentType;
  } | null;
};

type ExerciseStat = {
  name: string | null; // null = single-type bucket
  setCount: number;
  pr: PR;
  lastLogged: string | null;
};

type MachineStat = {
  id: string;
  name: string;
  label: string | null;
  equipmentType: EquipmentType;
  setCount: number;
  pr: PR;
  progression: ProgressionPoint[];
  lastLogged: string | null;
  exercises: ExerciseStat[]; // only populated for multi-type
};

export default async function MyStatsPage() {
  const store = await cookies();
  const memberId = store.get(COOKIE_NAME)?.value;
  if (!memberId) {
    return <Unidentified />;
  }

  const { data: member } = await supabase
    .from('members')
    .select('id, name, gym_id, gyms(name, theme, timezone)')
    .eq('id', memberId)
    .maybeSingle<{
      id: string;
      name: string;
      gym_id: string;
      gyms: { name: string; theme: GymTheme; timezone: string } | null;
    }>();

  if (!member) {
    redirect('/');
  }

  const theme: GymTheme = member.gyms?.theme ?? 'halogen';
  const timezone = member.gyms?.timezone ?? 'UTC';

  const { data: setsRaw } = await supabase
    .from('sets')
    .select(
      'weight, reps, logged_at, equipment_id, exercise_name, equipment(id, name, machine_label, equipment_type)',
    )
    .eq('member_id', memberId)
    .order('logged_at', { ascending: false })
    .returns<SetRow[]>();

  const sets = setsRaw ?? [];
  const totals = lifetimeTotals(sets, timezone);
  const streak = weeklyStreak(sets, timezone);

  const byEquipment = new Map<
    string,
    {
      name: string;
      label: string | null;
      equipmentType: EquipmentType;
      sets: SetRow[];
    }
  >();
  for (const s of sets) {
    const id = s.equipment_id;
    if (!byEquipment.has(id)) {
      byEquipment.set(id, {
        name: s.equipment?.name ?? 'Unknown',
        label: s.equipment?.machine_label ?? null,
        equipmentType: s.equipment?.equipment_type ?? 'strength_single',
        sets: [],
      });
    }
    byEquipment.get(id)!.sets.push(s);
  }

  const machines: MachineStat[] = Array.from(byEquipment.entries())
    .map(([id, group]) => {
      const pr = prFor(group.sets);
      const progression = progressionFor(group.sets, timezone);

      let exercises: ExerciseStat[] = [];
      if (group.equipmentType === 'strength_multi') {
        const byEx = new Map<string, SetRow[]>();
        for (const s of group.sets) {
          const key = s.exercise_name ?? '(unlabeled)';
          if (!byEx.has(key)) byEx.set(key, []);
          byEx.get(key)!.push(s);
        }
        exercises = Array.from(byEx.entries())
          .map(([name, exSets]) => ({
            name: name === '(unlabeled)' ? null : name,
            setCount: exSets.length,
            pr: prFor(exSets),
            lastLogged: exSets[0]?.logged_at ?? null,
          }))
          .sort((a, b) => {
            if (!a.lastLogged) return 1;
            if (!b.lastLogged) return -1;
            return a.lastLogged < b.lastLogged ? 1 : -1;
          });
      }

      return {
        id,
        name: group.name,
        label: group.label,
        equipmentType: group.equipmentType,
        setCount: group.sets.length,
        pr,
        progression,
        lastLogged: group.sets[0]?.logged_at ?? null,
        exercises,
      };
    })
    .sort((a, b) => (a.lastLogged && b.lastLogged ? (a.lastLogged < b.lastLogged ? 1 : -1) : 0));

  return (
    <div data-theme={theme} className="min-h-screen bg-canvas text-ink">
      <main className="p-6 max-w-2xl mx-auto pb-20">
        <header className="mb-6">
          <h1
            className={[
              'font-display tracking-tight leading-none',
              'halogen:text-4xl halogen:font-medium',
              'concrete:text-5xl concrete:font-black concrete:uppercase concrete:leading-[0.9]',
              'locker:text-3xl locker:font-semibold',
              'athletic:text-4xl athletic:font-black athletic:italic athletic:uppercase',
            ].join(' ')}
          >
            {member.name}
          </h1>
          <p className="mt-2 text-sm text-muted">{member.gyms?.name ?? 'Gym'}</p>
        </header>

        <section className="grid grid-cols-2 gap-3 mb-6">
          <Stat label="Lifetime volume" value={fmtVol(totals.totalVolume)} sub="lbs moved" />
          <Stat label="Workouts" value={String(totals.workoutDays)} sub="days logged" />
          <Stat label="This week" value={`${streak} / 7`} sub="days active" />
          <Stat label="Total sets" value={String(totals.totalSets)} sub="all time" />
        </section>

        <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted font-medium mb-3">
          Per-machine
        </h2>

        {machines.length === 0 ? (
          <p className="text-sm text-muted">
            No sets logged yet. Scan a QR sticker to get started.
          </p>
        ) : (
          <ul className="space-y-3">
            {machines.map((m) => (
              <li key={m.id}>
                {m.equipmentType === 'strength_multi' ? (
                  <MultiMachineCard machine={m} />
                ) : (
                  <SingleMachineCard machine={m} />
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-10 text-center">
          <Link href="/scan" className="text-sm underline text-muted">
            ← Back to scanner
          </Link>
        </p>
      </main>
    </div>
  );
}

function SingleMachineCard({ machine }: { machine: MachineStat }) {
  return (
    <Link
      href={`/me/stats/${machine.id}`}
      className="block p-4 rounded-card bg-surface border border-line hover:border-muted transition"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium">{machine.name}</p>
          <p className="text-xs text-muted">
            {[machine.label, `${machine.setCount} sets`].filter(Boolean).join(' · ')}
          </p>
          {machine.pr && (
            <p className="text-sm text-muted-strong mt-2 tabular-nums">
              PR{' '}
              <span className="font-semibold text-ink">
                {fmtWeight(machine.pr.weight)} × {machine.pr.reps}
              </span>
            </p>
          )}
        </div>
        <Sparkline points={machine.progression.map((p) => p.weight)} />
      </div>
    </Link>
  );
}

function MultiMachineCard({ machine }: { machine: MachineStat }) {
  return (
    <div className="p-4 rounded-card bg-surface border border-line">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium">
            {machine.name}
            <span className="ml-2 text-[10px] font-mono uppercase tracking-[0.15em] px-1.5 py-0.5 rounded bg-line text-muted-strong align-middle">
              Multi
            </span>
          </p>
          <p className="text-xs text-muted">
            {[machine.label, `${machine.setCount} sets across ${machine.exercises.length} exercises`]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </div>

      <ul className="mt-3 divide-y divide-line">
        {machine.exercises.map((ex) => {
          const exHref = ex.name
            ? `/me/stats/${machine.id}?exercise=${encodeURIComponent(ex.name)}`
            : `/me/stats/${machine.id}`;
          return (
            <li key={ex.name ?? '(unlabeled)'}>
              <Link
                href={exHref}
                className="flex items-center justify-between gap-4 py-2 hover:opacity-80 transition"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {ex.name ?? '(unlabeled)'}
                  </p>
                  <p className="text-xs text-muted">
                    {ex.setCount} {ex.setCount === 1 ? 'set' : 'sets'}
                  </p>
                </div>
                {ex.pr ? (
                  <p className="text-sm tabular-nums shrink-0">
                    <span className="text-muted text-xs">PR </span>
                    <span className="font-semibold">
                      {fmtWeight(ex.pr.weight)} × {ex.pr.reps}
                    </span>
                  </p>
                ) : (
                  <span className="text-xs text-muted">no PR yet</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="p-4 rounded-card bg-surface border border-line">
      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted font-medium">{label}</p>
      <p
        className={[
          'mt-1 font-display tabular-nums',
          'halogen:text-3xl halogen:font-medium',
          'concrete:text-4xl concrete:font-black',
          'locker:text-2xl locker:font-semibold',
          'athletic:text-3xl athletic:font-black athletic:italic',
        ].join(' ')}
      >
        {value}
      </p>
      <p className="text-xs text-muted">{sub}</p>
    </div>
  );
}

function Unidentified() {
  return (
    <main className="p-6 max-w-md mx-auto text-center bg-canvas text-ink min-h-screen pt-16">
      <h1 className="text-xl font-semibold mb-2">Sign in first</h1>
      <p className="text-muted text-sm mb-6">
        Scan a QR sticker on a machine to identify yourself, then come back here for stats.
      </p>
      <Link
        href="/scan"
        className="inline-block px-4 py-2 rounded border border-line text-sm"
      >
        Open scanner
      </Link>
    </main>
  );
}

function fmtVol(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}k`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function fmtWeight(w: number): string {
  return Number.isInteger(w) ? String(w) : w.toFixed(1);
}
