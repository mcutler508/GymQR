import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { supabase, type Set } from '@/lib/supabase';
import { suggestTarget } from '@/lib/suggested-target';
import { ScanClient } from './ScanClient';
import { recordScan } from './actions';

const COOKIE_NAME = 'reptag_member_id';

export const dynamic = 'force-dynamic';

export type GymTheme = 'halogen' | 'concrete' | 'locker-room' | 'athletic';

type EquipmentJoin = {
  id: string;
  qr_slug: string;
  name: string;
  machine_label: string | null;
  gym_id: string;
  status: 'active' | 'inactive';
  gyms: { name: string; theme: GymTheme } | null;
};

export default async function ScanPage({
  params,
}: {
  params: Promise<{ qrSlug: string }>;
}) {
  const { qrSlug } = await params;

  const { data: equipment, error } = await supabase
    .from('equipment')
    .select('id, qr_slug, name, machine_label, gym_id, status, gyms(name, theme)')
    .eq('qr_slug', qrSlug)
    .maybeSingle<EquipmentJoin>();

  if (error) {
    return (
      <main className="p-6 max-w-md mx-auto text-center bg-canvas text-ink min-h-screen">
        <h1 className="text-xl font-semibold mb-2 mt-12">Something went wrong</h1>
        <p className="text-muted text-sm">{error.message}</p>
      </main>
    );
  }

  if (!equipment) notFound();

  const theme: GymTheme = equipment.gyms?.theme ?? 'halogen';

  if (equipment.status === 'inactive') {
    return (
      <div data-theme={theme} className="min-h-screen bg-canvas text-ink">
        <main className="p-6 max-w-md mx-auto text-center pt-16">
          <h1 className="text-xl font-semibold mb-2">Equipment unavailable</h1>
          <p className="text-muted text-sm">
            This machine is offline. Ask a staff member if it should be active.
          </p>
        </main>
      </div>
    );
  }

  await recordScan({ equipmentId: equipment.id, gymId: equipment.gym_id });

  const store = await cookies();
  const memberId = store.get(COOKIE_NAME)?.value ?? null;

  let recentSets: Set[] = [];
  let memberName: string | null = null;
  let needsPasscode = false;

  if (memberId) {
    const [setsRes, memberRes] = await Promise.all([
      supabase
        .from('sets')
        .select('id, member_id, equipment_id, gym_id, weight, reps, rpe, note, logged_at')
        .eq('member_id', memberId)
        .eq('equipment_id', equipment.id)
        .order('logged_at', { ascending: false })
        .limit(10),
      supabase
        .from('members')
        .select('name, passcode_hash')
        .eq('id', memberId)
        .maybeSingle(),
    ]);

    recentSets = (setsRes.data ?? []) as Set[];
    if (memberRes.data) {
      memberName = memberRes.data.name;
      needsPasscode = !memberRes.data.passcode_hash;
    } else {
      memberName = null;
    }
  }

  const suggestion = suggestTarget(recentSets[0]);
  const gymName = equipment.gyms?.name ?? 'Gym';

  return (
    <div data-theme={theme} className="min-h-screen bg-canvas text-ink">
      <ScanClient
        equipment={{
          id: equipment.id,
          qr_slug: equipment.qr_slug,
          name: equipment.name,
          machine_label: equipment.machine_label,
          gym_id: equipment.gym_id,
          status: equipment.status,
        }}
        gymName={gymName}
        identified={!!memberId && !!memberName}
        needsPasscode={needsPasscode}
        memberName={memberName}
        recentSets={recentSets}
        suggestion={suggestion}
      />
    </div>
  );
}
