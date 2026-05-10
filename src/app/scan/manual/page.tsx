import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { GymTheme } from '../[qrSlug]/page';
import { ManualLookup } from './ManualLookup';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'reptag_member_id';

type EquipmentRow = {
  id: string;
  name: string;
  machine_label: string | null;
  qr_slug: string;
};

export default async function ManualLookupPage() {
  const store = await cookies();
  const memberId = store.get(COOKIE_NAME)?.value;

  // Anonymous visitors have no gym to scope to. Bounce them back to /scan
  // where they'll either get the camera or first-time identity flow.
  if (!memberId) {
    redirect('/scan');
  }

  const { data: member } = await supabase
    .from('members')
    .select('gym_id, gyms(theme, name)')
    .eq('id', memberId)
    .maybeSingle<{
      gym_id: string;
      gyms: { theme: GymTheme; name: string } | null;
    }>();

  if (!member) {
    redirect('/scan');
  }

  const theme: GymTheme = member.gyms?.theme ?? 'halogen';
  const gymName = member.gyms?.name ?? 'Gym';

  const { data: equipmentRows } = await supabase
    .from('equipment')
    .select('id, name, machine_label, qr_slug')
    .eq('gym_id', member.gym_id)
    .eq('status', 'active')
    .order('name', { ascending: true });

  const equipment: EquipmentRow[] = (equipmentRows ?? []) as EquipmentRow[];

  return (
    <div data-theme={theme} className="min-h-screen bg-canvas text-ink">
      <main className="p-4 max-w-md mx-auto pb-16">
        <header className="pt-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            {gymName}
          </p>
          <h1 className="mt-1 text-2xl font-display font-medium tracking-tight">
            Find a machine
          </h1>
          <p className="mt-2 text-sm text-muted">
            QR damaged? Type a name or machine code to find it.
          </p>
        </header>

        <ManualLookup equipment={equipment} />

        <Link
          href="/scan"
          className="mt-8 block w-full text-center text-sm text-muted underline"
        >
          ← Back to scanner
        </Link>
      </main>
    </div>
  );
}
