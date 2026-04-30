'use server';

import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';

const COOKIE_NAME = 'reptag_user_id';
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function ensureUser(name: string): Promise<{ id: string; name: string }> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Name is required');

  const { data, error } = await supabase
    .from('users')
    .insert({ name: trimmed })
    .select('id, name')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to create user');

  const store = await cookies();
  store.set(COOKIE_NAME, data.id, {
    httpOnly: false,
    sameSite: 'lax',
    maxAge: ONE_YEAR,
    path: '/',
  });

  return data;
}

export async function logSet(input: {
  equipmentId: string;
  weight: number;
  reps: number;
  rpe?: number | null;
  note?: string | null;
  qrSlug: string;
}): Promise<void> {
  const store = await cookies();
  const userId = store.get(COOKIE_NAME)?.value;
  if (!userId) throw new Error('Not identified');

  if (!Number.isFinite(input.weight) || input.weight <= 0) throw new Error('Weight must be > 0');
  if (!Number.isInteger(input.reps) || input.reps <= 0) throw new Error('Reps must be a positive integer');

  const { error } = await supabase.from('sets').insert({
    user_id: userId,
    equipment_id: input.equipmentId,
    weight: input.weight,
    reps: input.reps,
    rpe: input.rpe ?? null,
    note: input.note ?? null,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/scan/${input.qrSlug}`);
}

export async function recordScan(equipmentId: string): Promise<void> {
  const store = await cookies();
  const userId = store.get(COOKIE_NAME)?.value ?? null;
  const hdrs = await headers();
  const ua = hdrs.get('user-agent');

  await supabase.from('scan_events').insert({
    equipment_id: equipmentId,
    user_id: userId,
    user_agent: ua,
  });
}
