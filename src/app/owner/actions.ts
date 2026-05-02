'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getServerClient } from '@/lib/supabase-server';
import { generateQrSlug } from '@/lib/qr';
import { isValidTimezone } from '@/lib/timezone';
import { normalizeExerciseList } from '@/lib/exercise-catalog';
import type { EquipmentType } from '@/lib/supabase';

const VALID_EQUIPMENT_TYPES: EquipmentType[] = [
  'strength_single',
  'strength_multi',
  'cardio',
];

/* ---------------------------- auth actions ---------------------------- */

export async function signUpOwner(input: {
  email: string;
  password: string;
  gymName: string;
  timezone?: string;
}): Promise<{ ok: true; needsEmailConfirm: boolean } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  const gymName = input.gymName.trim();
  if (!email || !input.password || !gymName) {
    return { ok: false, error: 'All fields are required.' };
  }
  if (input.password.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters.' };
  }

  // Trust browser-detected TZ, but verify it parses. Fall back to UTC if not.
  const timezone =
    input.timezone && isValidTimezone(input.timezone) ? input.timezone : 'UTC';

  const supabase = await getServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
  });
  if (error) return { ok: false, error: error.message };
  if (!data.user) return { ok: false, error: 'Sign-up failed: no user returned.' };

  // Whether email confirmation is on or off, the user row exists. Create the
  // gym now so it's ready when they sign in (even if confirmation is required).
  const gymSlug = slugifyGymName(gymName);
  const { error: gymErr } = await supabase
    .from('gyms')
    .insert({
      name: gymName,
      slug: await uniqueGymSlug(supabase, gymSlug),
      owner_id: data.user.id,
      timezone,
    });
  if (gymErr) return { ok: false, error: `Created account, but couldn't create gym: ${gymErr.message}` };

  // If session is null, email confirmation is required.
  return { ok: true, needsEmailConfirm: !data.session };
}

export async function signInOwner(input: {
  email: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  if (!email || !input.password) return { ok: false, error: 'Email and password required.' };

  const supabase = await getServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: input.password,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signOutOwner(): Promise<void> {
  const supabase = await getServerClient();
  await supabase.auth.signOut();
  redirect('/owner/sign-in');
}

/* ---------------------------- equipment actions ---------------------------- */

export async function createEquipment(input: {
  name: string;
  machineLabel: string;
  equipmentType?: EquipmentType;
  exercises?: string[];
}): Promise<{ ok: true; id: string; qrSlug: string } | { ok: false; error: string }> {
  const supabase = await getServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { ok: false, error: 'Not signed in.' };

  const { data: gym } = await supabase
    .from('gyms')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();
  if (!gym) return { ok: false, error: 'No gym found for this owner.' };

  const name = input.name.trim();
  const machineLabel = input.machineLabel.trim();
  if (!name) return { ok: false, error: 'Equipment name is required.' };

  const equipmentType: EquipmentType =
    input.equipmentType && VALID_EQUIPMENT_TYPES.includes(input.equipmentType)
      ? input.equipmentType
      : 'strength_single';

  // Only multi-exercise equipment carries a list. Single-exercise = the
  // equipment IS the exercise; cardio = no per-set exercise tagging in v1.
  const exercises =
    equipmentType === 'strength_multi'
      ? normalizeExerciseList(input.exercises ?? [])
      : [];

  if (equipmentType === 'strength_multi' && exercises.length === 0) {
    return { ok: false, error: 'Add at least one exercise for a multi-exercise machine.' };
  }

  // One retry on slug collision (vanishingly unlikely with 4-char suffix, but
  // unique constraint will yell if it happens).
  for (let attempt = 0; attempt < 2; attempt++) {
    const qrSlug = generateQrSlug(name, machineLabel || null);
    const { data, error } = await supabase
      .from('equipment')
      .insert({
        name,
        machine_label: machineLabel || null,
        qr_slug: qrSlug,
        gym_id: gym.id,
        equipment_type: equipmentType,
        exercises,
      })
      .select('id, qr_slug')
      .single();

    if (!error && data) {
      revalidatePath('/owner/equipment');
      revalidatePath('/owner');
      return { ok: true, id: data.id, qrSlug: data.qr_slug };
    }
    if (error?.code === '23505' && attempt === 0) continue; // collision; retry
    return { ok: false, error: error?.message ?? 'Insert failed.' };
  }
  return { ok: false, error: 'Could not generate a unique slug.' };
}

export async function updateEquipment(input: {
  id: string;
  name: string;
  machineLabel: string;
  status: 'active' | 'inactive';
  equipmentType?: EquipmentType;
  exercises?: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await getServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: 'Not signed in.' };

  const name = input.name.trim();
  if (!name) return { ok: false, error: 'Equipment name is required.' };

  // Re-fetch the prior row to detect a single→multi conversion. Owners can
  // only update their own gym's equipment (RLS enforces ownership chain), so
  // a missing row here means the id was bogus or not theirs.
  const { data: prior } = await supabase
    .from('equipment')
    .select('id, name, equipment_type')
    .eq('id', input.id)
    .maybeSingle<{ id: string; name: string; equipment_type: EquipmentType }>();
  if (!prior) return { ok: false, error: 'Equipment not found.' };

  const equipmentType: EquipmentType =
    input.equipmentType && VALID_EQUIPMENT_TYPES.includes(input.equipmentType)
      ? input.equipmentType
      : prior.equipment_type;

  let exercises =
    equipmentType === 'strength_multi'
      ? normalizeExerciseList(input.exercises ?? [])
      : [];

  // Single → Multi conversion: keep the prior name as a default exercise so
  // historical sets (auto-tagged below) still show up under a chip the member
  // can pick.
  const isConvertingToMulti =
    prior.equipment_type === 'strength_single' && equipmentType === 'strength_multi';
  if (isConvertingToMulti && !exercises.some((e) => e.toLowerCase() === prior.name.toLowerCase())) {
    exercises = [prior.name, ...exercises];
  }

  if (equipmentType === 'strength_multi' && exercises.length === 0) {
    return { ok: false, error: 'Add at least one exercise for a multi-exercise machine.' };
  }

  const { error } = await supabase
    .from('equipment')
    .update({
      name,
      machine_label: input.machineLabel.trim() || null,
      status: input.status,
      equipment_type: equipmentType,
      exercises,
    })
    .eq('id', input.id);
  if (error) return { ok: false, error: error.message };

  // Auto-tag historical sets so PR continuity survives the conversion.
  if (isConvertingToMulti) {
    const { error: tagErr } = await supabase
      .from('sets')
      .update({ exercise_name: prior.name })
      .eq('equipment_id', input.id)
      .is('exercise_name', null);
    if (tagErr) return { ok: false, error: `Saved equipment, but couldn't tag history: ${tagErr.message}` };
  }

  revalidatePath('/owner/equipment');
  revalidatePath(`/owner/equipment/${input.id}/edit`);
  return { ok: true };
}

/**
 * Hard-deletes equipment. The `sets` and `scan_events` FKs cascade, so this
 * also removes every member's logged history on this machine. RLS enforces
 * ownership; the prior-fetch is just an existence check.
 */
export async function deleteEquipment(input: {
  id: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await getServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: 'Not signed in.' };

  const { data: prior } = await supabase
    .from('equipment')
    .select('id')
    .eq('id', input.id)
    .maybeSingle();
  if (!prior) return { ok: false, error: 'Equipment not found.' };

  const { error } = await supabase.from('equipment').delete().eq('id', input.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/owner/equipment');
  revalidatePath('/owner');
  return { ok: true };
}

/* ---------------------------- branding actions ---------------------------- */

const VALID_THEMES = ['halogen', 'concrete', 'locker-room', 'athletic'] as const;
type GymTheme = (typeof VALID_THEMES)[number];

export async function updateGymTheme(input: {
  theme: GymTheme;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!VALID_THEMES.includes(input.theme)) {
    return { ok: false, error: 'Invalid theme.' };
  }
  const supabase = await getServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: 'Not signed in.' };

  const { error } = await supabase
    .from('gyms')
    .update({ theme: input.theme })
    .eq('owner_id', userData.user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/owner/branding');
  revalidatePath('/owner');
  return { ok: true };
}

export async function updateGymName(input: {
  name: string;
}): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: 'Gym name is required.' };
  if (name.length > 80) return { ok: false, error: 'Gym name is too long (max 80 characters).' };

  const supabase = await getServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: 'Not signed in.' };

  const { error } = await supabase
    .from('gyms')
    .update({ name })
    .eq('owner_id', userData.user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/owner/branding');
  revalidatePath('/owner');
  return { ok: true, name };
}

const VALID_TAGLINE_POSITIONS = ['top', 'bottom'] as const;
type TaglinePosition = (typeof VALID_TAGLINE_POSITIONS)[number];

export async function updateGymTagline(input: {
  tagline: string;
  position: TaglinePosition;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const tagline = input.tagline.trim();
  if (tagline.length > 120) {
    return { ok: false, error: 'Tagline is too long (max 120 characters).' };
  }
  if (!VALID_TAGLINE_POSITIONS.includes(input.position)) {
    return { ok: false, error: 'Invalid tagline position.' };
  }

  const supabase = await getServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: 'Not signed in.' };

  const { error } = await supabase
    .from('gyms')
    .update({ tagline, tagline_position: input.position })
    .eq('owner_id', userData.user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/owner/branding');
  revalidatePath('/owner');
  return { ok: true };
}

export async function updateGymTimezone(input: {
  timezone: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isValidTimezone(input.timezone)) {
    return { ok: false, error: 'Invalid timezone.' };
  }
  const supabase = await getServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: 'Not signed in.' };

  const { error } = await supabase
    .from('gyms')
    .update({ timezone: input.timezone })
    .eq('owner_id', userData.user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/owner/branding');
  revalidatePath('/owner');
  return { ok: true };
}

/* ---------------------------- member actions ---------------------------- */

/**
 * Owner-initiated passcode reset. Nulls the member's passcode_hash so the next
 * sign-in attempt drops them into the SetPasscodePrompt flow (where they
 * choose a new passcode).
 *
 * Verifies the member belongs to the owner's gym before clearing.
 */
export async function resetMemberPasscode(input: {
  memberId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await getServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: 'Not signed in.' };

  const { data: gym } = await supabase
    .from('gyms')
    .select('id')
    .eq('owner_id', userData.user.id)
    .maybeSingle();
  if (!gym) return { ok: false, error: 'No gym linked to this account.' };

  // Verify the member is in the owner's gym before clearing.
  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('id', input.memberId)
    .eq('gym_id', gym.id)
    .maybeSingle();
  if (!member) return { ok: false, error: 'Member not found in your gym.' };

  const { error } = await supabase
    .from('members')
    .update({ passcode_hash: null })
    .eq('id', input.memberId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/owner/members');
  return { ok: true };
}

/* ---------------------------- helpers ---------------------------- */

function slugifyGymName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

async function uniqueGymSlug(
  supabase: Awaited<ReturnType<typeof getServerClient>>,
  base: string,
): Promise<string> {
  if (!base) base = 'gym';
  const { data: existing } = await supabase
    .from('gyms')
    .select('slug')
    .ilike('slug', `${base}%`);
  const taken = new Set((existing ?? []).map((g) => g.slug));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}
