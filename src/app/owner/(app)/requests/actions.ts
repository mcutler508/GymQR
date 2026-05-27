'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getServerClient } from '@/lib/supabase-server';

async function getOwnerGymId(): Promise<string | null> {
  const supabase = await getServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const { data: gym } = await supabase
    .from('gyms')
    .select('id')
    .eq('owner_id', userData.user.id)
    .maybeSingle<{ id: string }>();
  return gym?.id ?? null;
}

export async function approveRequest(input: { id: string }): Promise<void> {
  const supabase = await getServerClient();
  const gymId = await getOwnerGymId();
  if (!gymId) redirect('/owner/sign-in');

  const { data: req } = await supabase
    .from('equipment_requests')
    .select('id, name, status')
    .eq('id', input.id)
    .eq('gym_id', gymId)
    .maybeSingle<{ id: string; name: string; status: string }>();
  if (!req) return;

  // Redirect to the new-equipment form with name prefilled. The form passes
  // requestId back to createEquipment which marks the request approved on
  // success — that way an aborted form leaves the request pending.
  const params = new URLSearchParams({ name: req.name, requestId: req.id });
  redirect(`/owner/equipment/new?${params.toString()}`);
}

export async function dismissRequest(input: { id: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await getServerClient();
  const gymId = await getOwnerGymId();
  if (!gymId) return { ok: false, error: 'Not signed in.' };

  const { error } = await supabase
    .from('equipment_requests')
    .update({ status: 'dismissed', resolved_at: new Date().toISOString() })
    .eq('id', input.id)
    .eq('gym_id', gymId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/owner/requests');
  revalidatePath('/owner');
  return { ok: true };
}
