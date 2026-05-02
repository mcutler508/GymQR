import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerClient } from '@/lib/supabase-server';
import { BulkPrintClient } from './BulkPrintClient';

export const dynamic = 'force-dynamic';

type EquipmentRow = {
  id: string;
  qr_slug: string;
  name: string;
  machine_label: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function BulkPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids: idsParam } = await searchParams;

  const supabase = await getServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect('/owner/sign-in');

  const { data: gym } = await supabase
    .from('gyms')
    .select('id, name, theme, tagline, tagline_position')
    .eq('owner_id', userData.user.id)
    .maybeSingle<{
      id: string;
      name: string;
      theme: string | null;
      tagline: string | null;
      tagline_position: 'top' | 'bottom' | null;
    }>();
  if (!gym) redirect('/owner');

  const ids = (idsParam ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => UUID_RE.test(s));

  if (ids.length === 0) {
    return (
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">Print stickers</h1>
        <p className="mt-3 text-sm text-neutral-400">
          No equipment selected. Go back and pick at least one.
        </p>
        <Link
          href="/owner/equipment"
          className="inline-block mt-4 px-4 py-2 rounded-lg border border-neutral-700 text-sm"
        >
          ← Back to equipment
        </Link>
      </div>
    );
  }

  const { data: equipmentRes } = await supabase
    .from('equipment')
    .select('id, qr_slug, name, machine_label')
    .in('id', ids)
    .eq('gym_id', gym.id)
    .returns<EquipmentRow[]>();

  const found = equipmentRes ?? [];
  // Preserve the order in which the user selected them.
  const ordered = ids
    .map((id) => found.find((e) => e.id === id))
    .filter((e): e is EquipmentRow => Boolean(e));

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const stickers = ordered.map((e) => ({
    id: e.id,
    qrSlug: e.qr_slug,
    name: e.name,
    machineLabel: e.machine_label,
    scanUrl: baseUrl
      ? `${baseUrl.replace(/\/+$/, '')}/scan/${e.qr_slug}`
      : `/scan/${e.qr_slug}`,
  }));

  return (
    <BulkPrintClient
      stickers={stickers}
      gymName={gym.name}
      gymTheme={gym.theme ?? 'halogen'}
      tagline={gym.tagline ?? ''}
      taglinePosition={gym.tagline_position ?? 'bottom'}
    />
  );
}
