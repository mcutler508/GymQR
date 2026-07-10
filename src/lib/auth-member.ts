import bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import { supabase } from '@/lib/supabase';

const BCRYPT_ROUNDS = 10;

// Passcode lockout policy.
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// Reset token policy.
const RESET_TOKEN_TTL_MINUTES = 30;

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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validateEmail(email: string): void {
  // Deliberately permissive — the DB unique index enforces per-gym uniqueness
  // and reset flow verifies delivery. We only reject obvious junk here.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Enter a valid email address.');
  }
}

// PostgREST `.ilike()` treats `%` and `_` as wildcards. A member named
// "mike_c" must not match "mikexc". Escape those chars before we hand a raw
// user input to the query builder.
function escapeIlike(input: string): string {
  return input.replace(/([\\%_])/g, '\\$1');
}

function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Create a new member in the given gym. Throws on name or email collision. */
export async function createMember(input: {
  gymId: string;
  name: string;
  email: string;
  passcode: string;
}): Promise<Member> {
  validatePasscode(input.passcode);
  const name = normalizeName(input.name);
  if (!name) throw new Error('Name is required.');
  const email = normalizeEmail(input.email);
  validateEmail(email);

  const passcode_hash = await bcrypt.hash(input.passcode, BCRYPT_ROUNDS);

  const { data, error } = await supabase
    .from('members')
    .insert({ gym_id: input.gymId, name, email, passcode_hash })
    .select('id, gym_id, name, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      // Postgres unique-violation. Two indexes can trip this: the name index
      // and the email index. Message reflects whichever the DB names in its
      // constraint string, falling back to a friendlier default.
      if (error.message.includes('members_gym_email_idx')) {
        throw new Error('Someone at this gym already uses that email.');
      }
      throw new Error(`Someone at this gym is already named "${name}". Try adding an initial.`);
    }
    throw new Error(error.message);
  }
  return data as Member;
}

/**
 * Sign in an existing member by name + passcode.
 *
 * Enforces a 5-strikes / 15-minute lockout on the (member, passcode) pair to
 * turn the 4-digit passcode from a "brute-force in seconds" liability into a
 * "brute-force in months" one.
 *
 * Special-cases v1-migrated members with no passcode_hash by throwing
 * `PASSCODE_NOT_SET` — the caller funnels these into the set-passcode flow.
 */
export async function signInMember(input: {
  gymId: string;
  name: string;
  passcode: string;
}): Promise<Member> {
  validatePasscode(input.passcode);
  const name = normalizeName(input.name);

  const { data, error } = await supabase
    .from('members')
    .select(
      'id, gym_id, name, passcode_hash, created_at, failed_attempts, locked_until',
    )
    .eq('gym_id', input.gymId)
    .ilike('name', escapeIlike(name))
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('No member found with that name at this gym.');

  if (!data.passcode_hash) {
    throw new Error('PASSCODE_NOT_SET');
  }

  const now = new Date();
  if (data.locked_until && new Date(data.locked_until) > now) {
    const minsLeft = Math.max(
      1,
      Math.ceil((new Date(data.locked_until).getTime() - now.getTime()) / 60000),
    );
    throw new Error(
      `Too many wrong tries. Try again in ${minsLeft} minute${minsLeft === 1 ? '' : 's'}, or reset your passcode.`,
    );
  }

  const ok = await bcrypt.compare(input.passcode, data.passcode_hash);
  if (!ok) {
    const nextAttempts = (data.failed_attempts ?? 0) + 1;
    const shouldLock = nextAttempts >= MAX_FAILED_ATTEMPTS;
    await supabase
      .from('members')
      .update({
        failed_attempts: shouldLock ? 0 : nextAttempts,
        locked_until: shouldLock
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString()
          : null,
      })
      .eq('id', data.id);
    if (shouldLock) {
      throw new Error(
        `Too many wrong tries. Locked for ${LOCKOUT_MINUTES} minutes, or reset your passcode.`,
      );
    }
    throw new Error('Wrong passcode.');
  }

  // Success — clear any accumulated counter and lockout.
  if ((data.failed_attempts ?? 0) > 0 || data.locked_until) {
    await supabase
      .from('members')
      .update({ failed_attempts: 0, locked_until: null })
      .eq('id', data.id);
  }

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
 * - The owner's "Reset passcode" action in central command — that call wipes
 *   the existing hash so the next sign-in attempt funnels into this flow.
 * - The self-serve reset flow (via `resetPasscodeWithToken`) after a valid
 *   reset token is presented.
 */
export async function setPasscode(input: {
  memberId: string;
  passcode: string;
}): Promise<void> {
  validatePasscode(input.passcode);
  const passcode_hash = await bcrypt.hash(input.passcode, BCRYPT_ROUNDS);
  const { error } = await supabase
    .from('members')
    .update({
      passcode_hash,
      failed_attempts: 0,
      locked_until: null,
    })
    .eq('id', input.memberId);
  if (error) throw new Error(error.message);
}

/**
 * Kick off a self-serve passcode reset. Looks up the member by (gym, email),
 * generates a one-time token, stores its SHA-256 hash + expiry, and returns
 * the raw token so the caller can email it.
 *
 * If the email doesn't match a member we still return successfully with
 * `sent: false` — never leak whether an address is on file to a random caller.
 */
export async function requestPasswordReset(input: {
  gymId: string;
  email: string;
}): Promise<{ sent: true; memberId: string; token: string } | { sent: false }> {
  const email = normalizeEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { sent: false };
  }

  const { data } = await supabase
    .from('members')
    .select('id')
    .eq('gym_id', input.gymId)
    .ilike('email', escapeIlike(email))
    .maybeSingle();

  if (!data) return { sent: false };

  const token = randomBytes(24).toString('hex');
  const token_hash = hashResetToken(token);
  const expires = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000).toISOString();

  const { error } = await supabase
    .from('members')
    .update({ reset_token: token_hash, reset_expires_at: expires })
    .eq('id', data.id);
  if (error) throw new Error(error.message);

  return { sent: true, memberId: data.id, token };
}

/**
 * Consume a reset token. Validates hash + expiry, updates the passcode, and
 * clears the token so it cannot be reused. Returns the member on success so
 * the caller can set the identity cookie and land them straight in-app.
 */
export async function resetPasscodeWithToken(input: {
  token: string;
  passcode: string;
}): Promise<Member> {
  validatePasscode(input.passcode);
  if (!input.token || typeof input.token !== 'string') {
    throw new Error('Invalid reset link.');
  }

  const token_hash = hashResetToken(input.token);

  const { data, error } = await supabase
    .from('members')
    .select('id, gym_id, name, created_at, reset_expires_at')
    .eq('reset_token', token_hash)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('This reset link is invalid or has already been used.');
  if (!data.reset_expires_at || new Date(data.reset_expires_at) < new Date()) {
    throw new Error('This reset link has expired. Request a new one.');
  }

  const passcode_hash = await bcrypt.hash(input.passcode, BCRYPT_ROUNDS);
  const { error: updErr } = await supabase
    .from('members')
    .update({
      passcode_hash,
      reset_token: null,
      reset_expires_at: null,
      failed_attempts: 0,
      locked_until: null,
    })
    .eq('id', data.id);
  if (updErr) throw new Error(updErr.message);

  return {
    id: data.id,
    gym_id: data.gym_id,
    name: data.name,
    created_at: data.created_at,
  };
}
