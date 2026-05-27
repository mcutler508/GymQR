'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';

const COOKIE_NAME = 'reptag_member_id';

export async function requestEquipment(input: {
  name: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: 'Tell us the machine name.' };
  if (name.length > 80) return { ok: false, error: 'Keep it under 80 characters.' };

  const store = await cookies();
  const memberId = store.get(COOKIE_NAME)?.value;
  if (!memberId) {
    return {
      ok: false,
      error: 'Sign in by scanning any machine in your gym first, then request from /scan.',
    };
  }

  const { data: member } = await supabase
    .from('members')
    .select('gym_id')
    .eq('id', memberId)
    .maybeSingle<{ gym_id: string }>();
  if (!member) return { ok: false, error: 'We couldn’t find your member record.' };

  const { error } = await supabase.from('equipment_requests').insert({
    gym_id: member.gym_id,
    member_id: memberId,
    name,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/owner/requests');
  revalidatePath('/owner');
  return { ok: true };
}
