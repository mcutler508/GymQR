import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { lifetimeTotals, prFor, progressionFor } from '@/lib/stats';
import { ProgressionChart } from './ProgressionChart';
import type { GymTheme } from '@/app/scan/[qrSlug]/page';
import type { EquipmentType } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'reptag_member_id';

type SetRow = {
  weight: number | null;
  reps: number | null;
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
  const memberId = store.get(COOKIE_NAME)?.value;
  if (!memberId) {
    return (
      <main className="p-6 max-w-md mx-auto text-center bg-canvas text-ink min-h-screen pt-16">
        <h1 className="text-xl font-semibold mb-2">Sign in first</h1>
        <p className="text-muted text-sm mb-6">
          Scan a sticker to identify yourself, then come back.
        </p>
        <Link href="/scan" className="inline-block px-4 py-2 rounded border border-line text-sm">
          Open scanner
        </Link>
      </main>
    );
  }

  const equipmentRes = await supabase
    .from('equipment')
    .select(
      'id, name, machine_label, qr_slug, gym_id, equipment_type, exercises, gyms(theme, timezone)',
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
      gyms: { theme: GymTheme; timezone: string } | null;
    }>();

  if (!equipmentRes.data) notFound();
  const equipment = equipmentRes.data;
  const theme: GymTheme = equipment.gyms?.theme ?? 'halogen';
  const timezone = equipment.gyms?.timezone ?? 'UTC';
  const isMulti = equipment.equipment_type === 'strength_multi';

  // Resolve the active exercise tag (if any) and validate against the
  // equipment's configured list, case-insensitively.
  const activeExercise: string | null =
    isMulti && exerciseParam
      ? equipment.exercises.find(
          (e) => e.toLowerCase() === exerciseParam.toLowerCase(),
        ) ?? null
      : null;

  const { data: setsRaw } = await supabase
    .from('sets')
    .select('weight, reps, logged_at, exercise_name')
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

  return (
    <div data-theme={theme} className="min-h-screen bg-canvas text-ink">
      <main className="p-6 max-w-2xl mx-auto pb-20">
        <header className="mb-6">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted font-medium">Stats</p>
          <h1
            className={[
              'mt-1 font-display tracking-tight leading-none',
              'halogen:text-4xl halogen:font-medium',
              'concrete:text-5xl concrete:font-black concrete:uppercase concrete:leading-[0.9]',
              'locker:text-3xl locker:font-semibold',
              'athletic:text-4xl athletic:font-black athletic:italic athletic:uppercase',
            ].join(' ')}
          >
            {equipment.name}
          </h1>
          {equipment.machine_label && (
            <p className="mt-2 text-sm text-muted">{equipment.machine_label}</p>
          )}
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

        <section className="grid grid-cols-3 gap-3 mb-6">
          <Stat
            label="PR"
            value={pr ? `${fmtWeight(pr.weight)} × ${pr.reps}` : '—'}
            sub={pr ? new Date(pr.logged_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'no sets yet'}
            accent
          />
          <Stat label="Sets" value={String(totals.totalSets)} sub="all time" />
          <Stat label="Volume" value={fmtVol(totals.totalVolume)} sub="lbs moved" />
        </section>

        <section className="p-4 rounded-card bg-surface border border-line">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted font-medium mb-2">
            Working set over time
          </p>
          <ProgressionChart points={progression} />
        </section>

        <p className="mt-8">
          <Link
            href={`/scan/${equipment.qr_slug}`}
            className={[
              'block w-full text-center px-4 py-3 rounded font-medium bg-accent text-accent-ink',
              'concrete:font-black concrete:uppercase concrete:tracking-[0.05em]',
              'athletic:font-black athletic:italic athletic:uppercase',
            ].join(' ')}
          >
            Open this machine
          </Link>
        </p>

        <p className="mt-4 text-center">
          <Link href="/me/stats" className="text-sm underline text-muted">
            ← All stats
          </Link>
        </p>
      </main>
    </div>
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
        'px-3 py-1.5 rounded-full text-sm border transition',
        active
          ? 'bg-accent text-accent-ink border-accent font-medium'
          : 'bg-surface text-ink border-line hover:border-muted',
      ].join(' ')}
    >
      {label}
    </Link>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className="p-3 rounded-card bg-surface border border-line">
      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted font-medium">{label}</p>
      <p
        className={[
          'mt-1 font-display tabular-nums',
          accent ? 'text-accent' : 'text-ink',
          'halogen:text-xl halogen:font-medium',
          'concrete:text-2xl concrete:font-black',
          'locker:text-lg locker:font-semibold',
          'athletic:text-xl athletic:font-black athletic:italic',
        ].join(' ')}
      >
        {value}
      </p>
      <p className="text-xs text-muted">{sub}</p>
    </div>
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
