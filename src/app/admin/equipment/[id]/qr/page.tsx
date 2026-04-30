import { notFound } from 'next/navigation';
import { supabase, type Equipment } from '@/lib/supabase';
import { QrClient } from './QrClient';

export const dynamic = 'force-dynamic';

export default async function QrPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: equipment } = await supabase
    .from('equipment')
    .select('id, qr_slug, name, machine_label, gym_name, status')
    .eq('id', id)
    .maybeSingle<Equipment>();

  if (!equipment) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const scanUrl = baseUrl
    ? `${baseUrl.replace(/\/+$/, '')}/scan/${equipment.qr_slug}`
    : `/scan/${equipment.qr_slug}`;

  return <QrClient equipment={equipment} initialScanUrl={scanUrl} />;
}
