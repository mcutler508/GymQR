import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  lifetimeTotals,
  weeklyStreak,
  weeklyBuckets,
  prFor,
  progressionFor,
} from '@/lib/stats';
import { cardioBest } from '@/lib/cardio';
import { MemberStatsClient } from './MemberStatsClient';
import type { MachineStat, ExerciseStat } from './MachineCardsView';
import type { MemberStatRow } from '@/lib/member-stats-columns';
import type { GymTheme } from '@/app/scan/[qrSlug]/page';
import type { EquipmentType } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'reptag_member_id';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

type SetRow = {
  weight: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
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
      'weight, reps, duration_seconds, distance_meters, logged_at, equipment_id, exercise_name, equipment(id, name, machine_label, equipment_type)',
    )
    .eq('member_id', memberId)
    .order('logged_at', { ascending: false })
    .returns<SetRow[]>();

  const sets = setsRaw ?? [];
  const totals = lifetimeTotals(sets, timezone);
  const streak = weeklyStreak(sets, timezone);
  const buckets = weeklyBuckets(sets, timezone, 10);
  const hasCardio = sets.some((s) => s.duration_seconds != null);

  // Group all sets by equipment for the cards view shape.
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
      let cardio = null;

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
      } else if (group.equipmentType === 'cardio') {
        cardio = cardioBest(group.sets);
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
        cardio,
      };
    })
    .sort((a, b) => (a.lastLogged && b.lastLogged ? (a.lastLogged < b.lastLogged ? 1 : -1) : 0));

  // Fan out into one row per equipment×exercise for the table view.
  const now = Date.now();
  const rows: MemberStatRow[] = [];
  for (const [id, group] of byEquipment.entries()) {
    if (group.equipmentType === 'strength_multi') {
      const byEx = new Map<string, SetRow[]>();
      for (const s of group.sets) {
        const key = s.exercise_name ?? '__unlabeled__';
        if (!byEx.has(key)) byEx.set(key, []);
        byEx.get(key)!.push(s);
      }
      for (const [exKey, exSets] of byEx.entries()) {
        const exerciseName = exKey === '__unlabeled__' ? null : exKey;
        rows.push(rowFromSets({
          rowId: `${id}::${exKey}`,
          equipmentId: id,
          name: group.name,
          label: group.label,
          equipmentType: group.equipmentType,
          exerciseName,
          sets: exSets,
          now,
        }));
      }
    } else {
      rows.push(rowFromSets({
        rowId: id,
        equipmentId: id,
        name: group.name,
        label: group.label,
        equipmentType: group.equipmentType,
        exerciseName: null,
        sets: group.sets,
        now,
      }));
    }
  }

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

        <MemberStatsClient
          machines={machines}
          rows={rows}
          buckets={buckets}
          hasCardio={hasCardio}
        />

        <p className="mt-10 text-center">
          <Link href="/scan" className="text-sm underline text-muted">
            ← Back to scanner
          </Link>
        </p>
      </main>
    </div>
  );
}

function rowFromSets(input: {
  rowId: string;
  equipmentId: string;
  name: string;
  label: string | null;
  equipmentType: EquipmentType;
  exerciseName: string | null;
  sets: SetRow[];
  now: number;
}): MemberStatRow {
  const pr = prFor(input.sets);
  let totalVolume = 0;
  let weekSetCount = 0;
  let monthSetCount = 0;
  let lastLoggedAt: string | null = null;
  for (const s of input.sets) {
    if (s.weight != null && s.reps != null) {
      totalVolume += Number(s.weight) * Number(s.reps);
    }
    const t = new Date(s.logged_at).getTime();
    if (input.now - t <= WEEK_MS) weekSetCount += 1;
    if (input.now - t <= MONTH_MS) monthSetCount += 1;
    if (!lastLoggedAt || s.logged_at > lastLoggedAt) lastLoggedAt = s.logged_at;
  }

  let longestCardioSeconds = 0;
  let longestCardioMeters = 0;
  if (input.equipmentType === 'cardio') {
    const best = cardioBest(input.sets);
    longestCardioSeconds = best.longestDurationSeconds;
    longestCardioMeters = best.longestDistanceMeters;
  }

  return {
    id: input.rowId,
    equipmentId: input.equipmentId,
    machineName: input.name,
    machineLabel: input.label,
    equipmentType: input.equipmentType,
    exerciseName: input.exerciseName,
    setCount: input.sets.length,
    prWeight: pr?.weight ?? null,
    prReps: pr?.reps ?? null,
    lastLoggedAt,
    totalVolume,
    longestCardioSeconds,
    longestCardioMeters,
    weekSetCount,
    monthSetCount,
  };
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
