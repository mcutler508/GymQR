import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { lifetimeTotals, prFor, progressionFor } from '@/lib/stats';
import {
  cardioBest,
  cardioProgressionFor,
  cardioTotals,
  formatDuration,
  formatMiles,
} from '@/lib/cardio';
import { ProgressionChart } from './ProgressionChart';
import { CardioProgressionChart } from './CardioProgressionChart';
import { KpiTile } from '@/app/me/stats/_components/KpiTile';
import type { EquipmentType } from '@/lib/supabase';
import { fmtVol, fmtWeight } from '@/lib/format';
import { formatLocal } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'reptag_member_id';

type SetRow = {
  weight: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  logged_at: string;
  exercise_name: string | null;
};

export default async function MachineStatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ equipmentId: string }>;
  searchParams: Promise<{ exercise?: string }>;
}) {
  const { equipmentId } = await params;
  const { exercise: exerciseParam } = await searchParams;

  const store = await cookies();
  // Shell layout already gated on the cookie.
  const memberId = store.get(COOKIE_NAME)!.value;

  const equipmentRes = await supabase
    .from('equipment')
    .select(
      'id, name, machine_label, qr_slug, gym_id, equipment_type, exercises, gyms(timezone)',
    )
    .eq('id', equipmentId)
    .maybeSingle<{
      id: string;
      name: string;
      machine_label: string | null;
      qr_slug: string;
      gym_id: string;
      equipment_type: EquipmentType;
      exercises: string[];
      gyms: { timezone: string } | null;
    }>();

  if (!equipmentRes.data) notFound();
  const equipment = equipmentRes.data;
  const timezone = equipment.gyms?.timezone ?? 'UTC';
  const isMulti = equipment.equipment_type === 'strength_multi';
  const isCardio = equipment.equipment_type === 'cardio';

  const activeExercise: string | null =
    isMulti && exerciseParam
      ? equipment.exercises.find(
          (e) => e.toLowerCase() === exerciseParam.toLowerCase(),
        ) ?? null
      : null;

  const { data: setsRaw } = await supabase
    .from('sets')
    .select('weight, reps, duration_seconds, distance_meters, logged_at, exercise_name')
    .eq('member_id', memberId)
    .eq('equipment_id', equipmentId)
    .order('logged_at', { ascending: true })
    .returns<SetRow[]>();

  const allSets = setsRaw ?? [];
  const sets = activeExercise
    ? allSets.filter((s) => s.exercise_name === activeExercise)
    : allSets;

  const totals = lifetimeTotals(sets, timezone);
  const pr = prFor(sets);
  const progression = progressionFor(sets, timezone);
  const cBest = isCardio ? cardioBest(sets) : null;
  const cTotals = isCardio ? cardioTotals(sets) : null;
  const cProgression = isCardio ? cardioProgressionFor(sets, timezone) : [];

  const shortDate = (iso: string) => formatLocal(iso, timezone, 'MMM d');

  return (
    <>
      <Link
        href="/me/stats"
        className="-ml-2 mb-4 inline-flex min-h-11 items-center gap-1 px-2 text-sm text-muted-strong hover:text-ink"
      >
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Stats
      </Link>
      <header className="mb-6">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted font-medium">
          {[isCardio ? 'Cardio' : null, equipment.machine_label].filter(Boolean).join(' · ') || 'Machine'}
        </p>
        <h1
          className={[
            'mt-1.5 font-display tracking-tight leading-none',
            'halogen:text-4xl halogen:font-medium',
            'concrete:text-5xl concrete:font-black concrete:uppercase concrete:leading-[0.9]',
            'locker:text-3xl locker:font-semibold',
            'athletic:text-4xl athletic:font-black athletic:italic athletic:uppercase',
          ].join(' ')}
        >
          {equipment.name}
        </h1>
        {activeExercise && (
          <p className="mt-2 text-sm text-accent font-medium">{activeExercise}</p>
        )}
      </header>

      {isMulti && equipment.exercises.length > 0 && (
        <section className="mb-6">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted font-medium mb-2">
            Exercise
          </p>
          <div className="flex flex-wrap gap-2">
            <ExerciseChip
              href={`/me/stats/${equipment.id}`}
              label="All"
              active={!activeExercise}
            />
            {equipment.exercises.map((ex) => (
              <ExerciseChip
                key={ex}
                href={`/me/stats/${equipment.id}?exercise=${encodeURIComponent(ex)}`}
                label={ex}
                active={activeExercise === ex}
              />
            ))}
          </div>
        </section>
      )}

      {isCardio && cBest && cTotals ? (
        <>
          <section className="grid grid-cols-3 gap-x-4 gap-y-7 mb-8">
            <KpiTile
              label="Longest"
              value={
                cBest.longestDurationSeconds > 0
                  ? formatDuration(cBest.longestDurationSeconds)
                  : '—'
              }
              sublabel={
                cBest.longestDurationLoggedAt
                  ? shortDate(cBest.longestDurationLoggedAt)
                  : 'no sessions yet'
              }
              accent={cBest.longestDurationSeconds > 0}
            />
            <KpiTile
              label="Farthest"
              value={
                cBest.longestDistanceMeters > 0
                  ? `${formatMiles(cBest.longestDistanceMeters)} mi`
                  : '—'
              }
              sublabel={
                cBest.longestDistanceLoggedAt
                  ? shortDate(cBest.longestDistanceLoggedAt)
                  : 'no distance yet'
              }
            />
            <KpiTile
              label="Total time"
              value={
                cTotals.totalDurationSeconds > 0
                  ? formatDuration(cTotals.totalDurationSeconds)
                  : '—'
              }
              sublabel={`${cTotals.totalSessions} ${cTotals.totalSessions === 1 ? 'session' : 'sessions'}`}
            />
          </section>

          <section className="mb-8">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted font-medium mb-2">
              Duration over time
            </p>
            <CardioProgressionChart points={cProgression} />
          </section>
        </>
      ) : (
        <>
          <section className="grid grid-cols-3 gap-x-4 gap-y-7 mb-8">
            <KpiTile
              label="PR"
              value={pr ? `${fmtWeight(pr.weight)} × ${pr.reps}` : '—'}
              sublabel={
                pr
                  ? shortDate(pr.logged_at)
                  : 'no sets yet'
              }
              accent={!!pr}
            />
            <KpiTile label="Sets" value={String(totals.totalSets)} sublabel="all time" />
            <KpiTile label="Volume" value={fmtVol(totals.totalVolume)} sublabel="lbs moved" />
          </section>

          <section className="mb-8">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted font-medium mb-2">
              Working set over time
            </p>
            <ProgressionChart points={progression} />
          </section>
        </>
      )}

      <Link
        href={`/scan/${equipment.qr_slug}`}
        className={[
          'mt-8 flex min-h-14 w-full items-center justify-center px-4 rounded font-semibold bg-accent text-accent-ink',
          'concrete:font-black concrete:uppercase concrete:tracking-[0.05em]',
          'athletic:font-black athletic:italic athletic:uppercase',
        ].join(' ')}
      >
        Log on this machine
      </Link>
    </>
  );
}

function ExerciseChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        'inline-flex min-h-11 items-center px-4 rounded-full text-sm border transition-colors',
        active
          ? 'bg-accent text-accent-ink border-accent font-medium'
          : 'bg-surface text-ink border-line hover:border-muted',
      ].join(' ')}
    >
      {label}
    </Link>
  );
}


