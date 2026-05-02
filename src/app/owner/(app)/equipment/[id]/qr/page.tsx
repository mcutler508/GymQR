import { notFound, redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase-server';
import type { Equipment } from '@/lib/supabase';
import { QrClient } from './QrClient';

export const dynamic = 'force-dynamic';

export default async function OwnerQrPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const { data: equipment } = await supabase
    .from('equipment')
    .select('id, qr_slug, name, machine_label, gym_id, status')
    .eq('id', id)
    .eq('gym_id', gym.id)
    .maybeSingle<Equipment>();

  if (!equipment) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const scanUrl = baseUrl
    ? `${baseUrl.replace(/\/+$/, '')}/scan/${equipment.qr_slug}`
    : `/scan/${equipment.qr_slug}`;

  return (
    <QrClient
      equipment={equipment}
      initialScanUrl={scanUrl}
      gymName={gym.name}
      gymTheme={gym.theme ?? 'halogen'}
      tagline={gym.tagline ?? ''}
      taglinePosition={gym.tagline_position ?? 'bottom'}
    />
  );
}
