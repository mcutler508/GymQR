'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getServerClient } from '@/lib/supabase-server';
import { generateQrSlug } from '@/lib/qr';

/* ---------------------------- auth actions ---------------------------- */

export async function signUpOwner(input: {
  email: string;
  password: string;
  gymName: string;
}): Promise<{ ok: true; needsEmailConfirm: boolean } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  const gymName = input.gymName.trim();
  if (!email || !input.password || !gymName) {
    return { ok: false, error: 'All fields are required.' };
  }
  if (input.password.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters.' };
  }

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
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await getServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: 'Not signed in.' };

  const name = input.name.trim();
  if (!name) return { ok: false, error: 'Equipment name is required.' };

  const { error } = await supabase
    .from('equipment')
    .update({
      name,
      machine_label: input.machineLabel.trim() || null,
      status: input.status,
    })
    .eq('id', input.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/owner/equipment');
  revalidatePath(`/owner/equipment/${input.id}/edit`);
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
