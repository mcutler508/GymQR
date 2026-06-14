import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';
import {
  MemberStatsClient,
  type ClientSet,
  type EquipmentMeta,
} from '@/app/me/stats/MemberStatsClient';
import type { EquipmentType } from '@/lib/supabase';
import type { GymTheme } from '@/app/scan/[qrSlug]/page';

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

export default async function MemberStatsPage() {
  const store = await cookies();
  const memberId = store.get(COOKIE_NAME)!.value;

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

  const memberName = member?.name ?? 'Member';
  const gymName = member?.gyms?.name ?? 'Gym';
  const timezone = member?.gyms?.timezone ?? 'UTC';

  const { data: setsRaw } = await supabase
    .from('sets')
    .select(
      'weight, reps, duration_seconds, distance_meters, logged_at, equipment_id, exercise_name, equipment(id, name, machine_label, equipment_type)',
    )
    .eq('member_id', memberId)
    .order('logged_at', { ascending: false })
    .returns<SetRow[]>();

  const setsRows = setsRaw ?? [];

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
    <MemberStatsClient
      memberName={memberName}
      gymName={gymName}
      themeClassNames={HEADER_CLASSES}
      sets={sets}
      equipment={equipment}
      timezone={timezone}
    />
  );
}
