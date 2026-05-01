'use server';

import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { createMember, signInMember, setPasscode } from '@/lib/auth-member';

const COOKIE_NAME = 'reptag_member_id';
const ONE_YEAR = 60 * 60 * 24 * 365;

async function setMemberCookie(memberId: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, memberId, {
    httpOnly: false,
    sameSite: 'lax',
    maxAge: ONE_YEAR,
    path: '/',
  });
}

export async function createMemberAction(input: {
  gymId: string;
  name: string;
  passcode: string;
}): Promise<{ id: string; name: string }> {
  const m = await createMember(input);
  await setMemberCookie(m.id);
  return { id: m.id, name: m.name };
}

export async function signInMemberAction(input: {
  gymId: string;
  name: string;
  passcode: string;
}): Promise<{ id: string; name: string; needsPasscode?: boolean }> {
  try {
    const m = await signInMember(input);
    await setMemberCookie(m.id);
    return { id: m.id, name: m.name };
  } catch (e) {
    // Migrated v1 user with no passcode yet — find them, set the cookie, ask
    // them to set a passcode on the next screen.
    if (e instanceof Error && e.message === 'PASSCODE_NOT_SET') {
      const { data } = await supabase
        .from('members')
        .select('id, name')
        .eq('gym_id', input.gymId)
        .ilike('name', input.name.trim())
        .maybeSingle();
      if (data) {
        await setMemberCookie(data.id);
        return { id: data.id, name: data.name, needsPasscode: true };
      }
    }
    throw e;
  }
}

export async function setPasscodeAction(input: { passcode: string }): Promise<void> {
  const store = await cookies();
  const memberId = store.get(COOKIE_NAME)?.value;
  if (!memberId) throw new Error('Not signed in');
  await setPasscode({ memberId, passcode: input.passcode });
}

export async function logSet(input: {
  equipmentId: string;
  gymId: string;
  weight?: number | null;
  reps?: number | null;
  rpe?: number | null;
  note?: string | null;
  exerciseName?: string | null;
  durationSeconds?: number | null;
  distanceMeters?: number | null;
  qrSlug: string;
}): Promise<void> {
  const store = await cookies();
  const memberId = store.get(COOKIE_NAME)?.value;
  if (!memberId) throw new Error('Not identified');

  // Re-fetch the equipment row so we can validate the inputs against the
  // server-side type. Don't trust whatever the client posted.
  const { data: eq } = await supabase
    .from('equipment')
    .select('id, equipment_type, exercises')
    .eq('id', input.equipmentId)
    .maybeSingle<{
      id: string;
      equipment_type: 'strength_single' | 'strength_multi' | 'cardio';
      exercises: string[];
    }>();
  if (!eq) throw new Error('Equipment not found');

  if (eq.equipment_type === 'cardio') {
    const dur = Number(input.durationSeconds);
    if (!Number.isFinite(dur) || dur <= 0) throw new Error('Enter a duration.');
    let distance: number | null = null;
    if (input.distanceMeters != null && input.distanceMeters !== 0) {
      const m = Number(input.distanceMeters);
      if (!Number.isFinite(m) || m < 0) throw new Error('Distance must be a positive number.');
      distance = m;
    }

    const { error } = await supabase.from('sets').insert({
      member_id: memberId,
      equipment_id: input.equipmentId,
      gym_id: input.gymId,
      weight: null,
      reps: null,
      rpe: null,
      note: input.note ?? null,
      exercise_name: null,
      duration_seconds: Math.round(dur),
      distance_meters: distance,
    });
    if (error) throw new Error(error.message);
    revalidatePath(`/scan/${input.qrSlug}`);
    return;
  }

  // Strength path (single or multi).
  const w = Number(input.weight);
  const r = Number(input.reps);
  if (!Number.isFinite(w) || w <= 0) throw new Error('Weight must be > 0');
  if (!Number.isInteger(r) || r <= 0) throw new Error('Reps must be a positive integer');

  let exerciseName: string | null = null;
  if (eq.equipment_type === 'strength_multi') {
    const candidate = (input.exerciseName ?? '').trim();
    if (!candidate) throw new Error('Pick an exercise.');
    const match = (eq.exercises ?? []).find(
      (e) => e.toLowerCase() === candidate.toLowerCase(),
    );
    if (!match) throw new Error('That exercise isn’t configured for this machine.');
    exerciseName = match;
  }
  // strength_single: ignore any client-sent exerciseName.

  const { error } = await supabase.from('sets').insert({
    member_id: memberId,
    equipment_id: input.equipmentId,
    gym_id: input.gymId,
    weight: w,
    reps: r,
    rpe: input.rpe ?? null,
    note: input.note ?? null,
    exercise_name: exerciseName,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/scan/${input.qrSlug}`);
}

export async function recordScan(input: {
  equipmentId: string;
  gymId: string;
}): Promise<void> {
  const store = await cookies();
  const memberId = store.get(COOKIE_NAME)?.value ?? null;
  const hdrs = await headers();
  const ua = hdrs.get('user-agent');

  await supabase.from('scan_events').insert({
    equipment_id: input.equipmentId,
    gym_id: input.gymId,
    member_id: memberId,
    user_agent: ua,
  });
}

export async function signOutMember(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
