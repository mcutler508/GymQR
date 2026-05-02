import { redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase-server';
import { dayKeyInTz } from '@/lib/timezone';
import type { EquipmentTableRow } from '@/lib/equipment-columns';
import type { EquipmentType } from '@/lib/supabase';
import { EquipmentListClient } from './EquipmentListClient';

export const dynamic = 'force-dynamic';

type EquipmentDbRow = {
  id: string;
  name: string;
  machine_label: string | null;
  qr_slug: string;
  status: 'active' | 'inactive';
  equipment_type: EquipmentType;
  exercises: string[];
  created_at: string;
};

type SetDbRow = {
  equipment_id: string;
  member_id: string | null;
  weight: number | null;
  reps: number | null;
  duration_seconds: number | null;
  logged_at: string;
};

type ScanDbRow = {
  equipment_id: string;
  scanned_at: string;
};

export default async function EquipmentList() {
  const supabase = await getServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect('/owner/sign-in');

  const { data: gym } = await supabase
    .from('gyms')
    .select('id, timezone')
    .eq('owner_id', userData.user.id)
    .maybeSingle<{ id: string; timezone: string | null }>();
  if (!gym) redirect('/owner');

  const timezone = gym.timezone ?? 'UTC';

  const [equipmentRes, setsRes, scansRes] = await Promise.all([
    supabase
      .from('equipment')
      .select('id, name, machine_label, qr_slug, status, equipment_type, exercises, created_at')
      .eq('gym_id', gym.id)
      .order('created_at', { ascending: true })
      .returns<EquipmentDbRow[]>(),
    supabase
      .from('sets')
      .select('equipment_id, member_id, weight, reps, duration_seconds, logged_at')
      .eq('gym_id', gym.id)
      .returns<SetDbRow[]>(),
    supabase
      .from('scan_events')
      .select('equipment_id, scanned_at')
      .eq('gym_id', gym.id)
      .order('scanned_at', { ascending: false })
      .returns<ScanDbRow[]>(),
  ]);

  const equipment = equipmentRes.data ?? [];
  const sets = setsRes.data ?? [];
  const scans = scansRes.data ?? [];

  // Aggregate per-equipment in one pass.
  const todayKey = dayKeyInTz(new Date().toISOString(), timezone);
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  type Agg = {
    setCount: number;
    members: Set<string>;
    todaySetCount: number;
    weekSetCount: number;
    lastSetAt: string | null;
    totalVolume: number;
    totalCardioSeconds: number;
  };
  const setAgg = new Map<string, Agg>();
  function getAgg(id: string): Agg {
    let a = setAgg.get(id);
    if (!a) {
      a = {
        setCount: 0,
        members: new Set<string>(),
        todaySetCount: 0,
        weekSetCount: 0,
        lastSetAt: null,
        totalVolume: 0,
        totalCardioSeconds: 0,
      };
      setAgg.set(id, a);
    }
    return a;
  }

  for (const s of sets) {
    const a = getAgg(s.equipment_id);
    a.setCount += 1;
    if (s.member_id) a.members.add(s.member_id);
    if (s.weight != null && s.reps != null) {
      a.totalVolume += Number(s.weight) * Number(s.reps);
    }
    if (s.duration_seconds != null) {
      a.totalCardioSeconds += Number(s.duration_seconds);
    }
    const ts = new Date(s.logged_at).getTime();
    if (!a.lastSetAt || ts > new Date(a.lastSetAt).getTime()) {
      a.lastSetAt = s.logged_at;
    }
    if (dayKeyInTz(s.logged_at, timezone) === todayKey) a.todaySetCount += 1;
    if (ts >= sevenDaysAgo) a.weekSetCount += 1;
  }

  const lastScanByEq = new Map<string, string>();
  for (const s of scans) {
    if (!lastScanByEq.has(s.equipment_id)) {
      lastScanByEq.set(s.equipment_id, s.scanned_at);
    }
  }

  const rows: EquipmentTableRow[] = equipment.map((e) => {
    const a = setAgg.get(e.id);
    return {
      id: e.id,
      name: e.name,
      machine_label: e.machine_label,
      qr_slug: e.qr_slug,
      status: e.status,
      equipment_type: e.equipment_type,
      exercises: e.exercises ?? [],
      created_at: e.created_at,
      setCount: a?.setCount ?? 0,
      uniqueMembers: a?.members.size ?? 0,
      todaySetCount: a?.todaySetCount ?? 0,
      weekSetCount: a?.weekSetCount ?? 0,
      lastSetAt: a?.lastSetAt ?? null,
      lastScanAt: lastScanByEq.get(e.id) ?? null,
      totalVolume: a?.totalVolume ?? 0,
      totalCardioSeconds: a?.totalCardioSeconds ?? 0,
    };
  });

  return <EquipmentListClient rows={rows} />;
}
