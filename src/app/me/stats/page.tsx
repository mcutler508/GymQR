import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { MemberStatsClient, type ClientSet, type EquipmentMeta } from './MemberStatsClient';
import type { GymTheme } from '@/app/scan/[qrSlug]/page';
import type { EquipmentType } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'reptag_member_id';

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

const HEADER_CLASSES = [
  'font-display tracking-tight leading-none',
  'halogen:text-4xl halogen:font-medium',
  'concrete:text-5xl concrete:font-black concrete:uppercase concrete:leading-[0.9]',
  'locker:text-3xl locker:font-semibold',
  'athletic:text-4xl athletic:font-black athletic:italic athletic:uppercase',
].join(' ');

export default async function MyStatsPage() {
  const store = await cookies();
  const memberId = store.get(COOKIE_NAME)?.value;
  if (!memberId) return <Unidentified />;

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

  const setsRows = setsRaw ?? [];

  // Distinct equipment metadata for the client (drop the joined object so the
  // serialized payload doesn't carry it on every set).
  const equipmentById = new Map<string, EquipmentMeta>();
  for (const s of setsRows) {
    if (!s.equipment || equipmentById.has(s.equipment.id)) continue;
    equipmentById.set(s.equipment.id, {
      id: s.equipment.id,
      name: s.equipment.name,
      machine_label: s.equipment.machine_label,
      equipment_type: s.equipment.equipment_type,
    });
  }
  const equipment = Array.from(equipmentById.values());

  const sets: ClientSet[] = setsRows.map((s) => ({
    weight: s.weight,
    reps: s.reps,
    duration_seconds: s.duration_seconds,
    distance_meters: s.distance_meters,
    logged_at: s.logged_at,
    equipment_id: s.equipment_id,
    exercise_name: s.exercise_name,
  }));

  return (
    <div data-theme={theme} className="min-h-screen bg-canvas text-ink">
      <main className="p-6 max-w-2xl mx-auto pb-20">
        <MemberStatsClient
          memberName={member.name}
          gymName={member.gyms?.name ?? 'Gym'}
          themeClassNames={HEADER_CLASSES}
          sets={sets}
          equipment={equipment}
          timezone={timezone}
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
