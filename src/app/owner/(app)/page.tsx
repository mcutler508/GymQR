import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function OwnerDashboard() {
  const supabase = await getServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect('/owner/sign-in');

  const { data: gym } = await supabase
    .from('gyms')
    .select('id, name, slug')
    .eq('owner_id', userData.user.id)
    .maybeSingle();

  if (!gym) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-400">
          No gym is linked to this account. Contact support — this shouldn&apos;t happen after sign-up.
        </p>
      </div>
    );
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayIso = startOfToday.toISOString();

  const [
    { count: equipmentCount },
    { count: memberCount },
    { count: todayScans },
    { count: todaySets },
  ] = await Promise.all([
    supabase.from('equipment').select('id', { count: 'exact', head: true }).eq('gym_id', gym.id),
    supabase.from('members').select('id', { count: 'exact', head: true }).eq('gym_id', gym.id),
    supabase
      .from('scan_events')
      .select('id', { count: 'exact', head: true })
      .eq('gym_id', gym.id)
      .gte('scanned_at', todayIso),
    supabase
      .from('sets')
      .select('id', { count: 'exact', head: true })
      .eq('gym_id', gym.id)
      .gte('logged_at', todayIso),
  ]);

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">{gym.name}</h1>
        <p className="text-sm text-neutral-500 mt-1">central command</p>
      </header>

      <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-3">Today</h2>
      <div className="grid grid-cols-2 gap-3 mb-8">
        <Stat label="Scans" value={todayScans ?? 0} />
        <Stat label="Sets logged" value={todaySets ?? 0} />
      </div>

      <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-3">All-time</h2>
      <div className="grid grid-cols-2 gap-3 mb-10">
        <Stat label="Equipment" value={equipmentCount ?? 0} href="/owner/equipment" />
        <Stat label="Members" value={memberCount ?? 0} href="/owner/members" />
      </div>

      <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-3">Quick actions</h2>
      <div className="space-y-2">
        <Link
          href="/owner/equipment/new"
          className="block p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700"
        >
          <p className="font-medium">Add a piece of equipment</p>
          <p className="text-sm text-neutral-400 mt-1">
            Generates a QR code you can print and stick on the machine.
          </p>
        </Link>
        <Link
          href="/owner/equipment"
          className="block p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700"
        >
          <p className="font-medium">Manage equipment</p>
          <p className="text-sm text-neutral-400 mt-1">
            View, edit, deactivate, or reprint stickers.
          </p>
        </Link>
        <Link
          href="/owner/members"
          className="block p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700"
        >
          <p className="font-medium">Members</p>
          <p className="text-sm text-neutral-400 mt-1">
            See who&apos;s active and reset passcodes when needed.
          </p>
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href?: string }) {
  const inner = (
    <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition">
      <p className="text-xs uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
