import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';

const BCRYPT_ROUNDS = 10;

export type Member = {
  id: string;
  gym_id: string;
  name: string;
  created_at: string;
};

function validatePasscode(passcode: string): asserts passcode is string {
  if (!/^\d{4}$/.test(passcode)) {
    throw new Error('Passcode must be exactly 4 digits.');
  }
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/** Create a new member in the given gym. Throws on name collision. */
export async function createMember(input: {
  gymId: string;
  name: string;
  passcode: string;
}): Promise<Member> {
  validatePasscode(input.passcode);
  const name = normalizeName(input.name);
  if (!name) throw new Error('Name is required.');

  const passcode_hash = await bcrypt.hash(input.passcode, BCRYPT_ROUNDS);

  const { data, error } = await supabase
    .from('members')
    .insert({ gym_id: input.gymId, name, passcode_hash })
    .select('id, gym_id, name, created_at')
    .single();

  if (error) {
    // Postgres unique-violation code on (gym_id, lower(name))
    if (error.code === '23505') {
      throw new Error(`Someone at this gym is already named "${name}". Try adding an initial.`);
    }
    throw new Error(error.message);
  }
  return data as Member;
}

/** Sign in an existing member by name + passcode. Returns member or throws. */
export async function signInMember(input: {
  gymId: string;
  name: string;
  passcode: string;
}): Promise<Member> {
  validatePasscode(input.passcode);
  const name = normalizeName(input.name);

  // Case-insensitive match on (gym_id, name).
  const { data, error } = await supabase
    .from('members')
    .select('id, gym_id, name, passcode_hash, created_at')
    .eq('gym_id', input.gymId)
    .ilike('name', name)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('No member found with that name at this gym.');

  // Migrated v1 users have no passcode yet — treat as "first time, set one."
  if (!data.passcode_hash) {
    throw new Error('PASSCODE_NOT_SET');
  }

  const ok = await bcrypt.compare(input.passcode, data.passcode_hash);
  if (!ok) throw new Error('Wrong passcode.');

  return {
    id: data.id,
    gym_id: data.gym_id,
    name: data.name,
    created_at: data.created_at,
  };
}

/**
 * Set or replace a member's passcode. Used by:
 * - The "set passcode" path for members migrated from v1 with no passcode.
 * - The owner's "Reset passcode" action in central command (Phase E) — that
 *   call wipes the existing hash so the next sign-in attempt funnels into this
 *   set-passcode flow.
 */
export async function setPasscode(input: {
  memberId: string;
  passcode: string;
}): Promise<void> {
  validatePasscode(input.passcode);
  const passcode_hash = await bcrypt.hash(input.passcode, BCRYPT_ROUNDS);
  const { error } = await supabase
    .from('members')
    .update({ passcode_hash })
    .eq('id', input.memberId);
  if (error) throw new Error(error.message);
}
