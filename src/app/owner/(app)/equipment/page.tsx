import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  name: string;
  machine_label: string | null;
  qr_slug: string;
  status: 'active' | 'inactive';
};

export default async function EquipmentList() {
  const supabase = await getServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect('/owner/sign-in');

  const { data: gym } = await supabase
    .from('gyms')
    .select('id')
    .eq('owner_id', userData.user.id)
    .maybeSingle();
  if (!gym) redirect('/owner');

  const [equipmentRes, setsRes, scansRes] = await Promise.all([
    supabase
      .from('equipment')
      .select('id, name, machine_label, qr_slug, status')
      .eq('gym_id', gym.id)
      .order('created_at', { ascending: true })
      .returns<Row[]>(),
    supabase
      .from('sets')
      .select('equipment_id')
      .eq('gym_id', gym.id),
    supabase
      .from('scan_events')
      .select('equipment_id, scanned_at')
      .eq('gym_id', gym.id)
      .order('scanned_at', { ascending: false }),
  ]);

  const rows = equipmentRes.data ?? [];

  const setsByEq = new Map<string, number>();
  for (const s of setsRes.data ?? []) {
    setsByEq.set(s.equipment_id, (setsByEq.get(s.equipment_id) ?? 0) + 1);
  }

  const lastScanByEq = new Map<string, string>();
  for (const s of scansRes.data ?? []) {
    if (!lastScanByEq.has(s.equipment_id)) {
      lastScanByEq.set(s.equipment_id, s.scanned_at);
    }
  }

  return (
    <div>
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Equipment</h1>
        <Link
          href="/owner/equipment/new"
          className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium"
        >
          + New equipment
        </Link>
      </header>

      {rows.length === 0 && (
        <p className="text-sm text-neutral-400">
          No equipment yet. Click <span className="text-neutral-200">New equipment</span> to add your first machine.
        </p>
      )}

      <ul className="space-y-3">
        {rows.map((e) => {
          const setCount = setsByEq.get(e.id) ?? 0;
          const lastScan = lastScanByEq.get(e.id);
          return (
            <li
              key={e.id}
              className="p-4 rounded-xl bg-neutral-900 border border-neutral-800"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium">
                    {e.name}
                    {e.status === 'inactive' && (
                      <span className="ml-2 text-xs uppercase tracking-wider text-neutral-500">
                        inactive
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-neutral-400">{e.machine_label ?? '—'}</p>
                  <p className="text-xs text-neutral-600 mt-1 font-mono truncate">{e.qr_slug}</p>
                  <div className="flex gap-3 mt-2 text-xs text-neutral-500">
                    <span>
                      <span className="text-neutral-300 tabular-nums">{setCount}</span> sets
                    </span>
                    <span>
                      Last scan{' '}
                      <span className="text-neutral-300">
                        {lastScan ? fmtRelative(lastScan) : '—'}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Link
                    href={`/owner/equipment/${e.id}/qr`}
                    className="px-3 py-1.5 text-sm rounded-md bg-white text-black font-medium text-center"
                  >
                    Print QR
                  </Link>
                  <Link
                    href={`/owner/equipment/${e.id}/edit`}
                    className="px-3 py-1.5 text-sm rounded-md border border-neutral-700 text-center"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function fmtRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.round((now - t) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 60 * 60) return `${Math.round(diffSec / 60)}m ago`;
  if (diffSec < 60 * 60 * 24) return `${Math.round(diffSec / 3600)}h ago`;
  if (diffSec < 60 * 60 * 24 * 7) return `${Math.round(diffSec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
