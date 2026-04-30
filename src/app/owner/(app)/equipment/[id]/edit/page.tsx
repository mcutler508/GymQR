import { notFound, redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase-server';
import { EditEquipmentForm } from './EditEquipmentForm';

export const dynamic = 'force-dynamic';

export default async function EditEquipmentPage({
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
    .select('id')
    .eq('owner_id', userData.user.id)
    .maybeSingle();
  if (!gym) redirect('/owner');

  const { data: equipment } = await supabase
    .from('equipment')
    .select('id, name, machine_label, qr_slug, status, gym_id')
    .eq('id', id)
    .eq('gym_id', gym.id)
    .maybeSingle();

  if (!equipment) notFound();

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight">Edit equipment</h1>
      <p className="mt-2 text-sm text-neutral-400 font-mono">{equipment.qr_slug}</p>
      <div className="mt-8">
        <EditEquipmentForm
          id={equipment.id}
          initial={{
            name: equipment.name,
            machineLabel: equipment.machine_label ?? '',
            status: equipment.status,
          }}
        />
      </div>
    </div>
  );
}
