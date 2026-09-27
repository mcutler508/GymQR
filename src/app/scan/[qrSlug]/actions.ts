'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';
import {
  createMember,
  signInMember,
  setPasscode,
  requestPasswordReset,
} from '@/lib/auth-member';
import {
  setMemberCookie,
  clearMemberCookie,
  readMemberCookie,
} from '@/lib/member-cookie';
import { sendEmail, buildResetEmail } from '@/lib/email';
import { toResult, type ActionResult } from '@/lib/action-result';

export async function createMemberAction(input: {
  gymId: string;
  name: string;
  email: string;
  passcode: string;
}): Promise<ActionResult<{ id: string; name: string }>> {
  return toResult(async () => {
    const m = await createMember(input);
    await setMemberCookie(m.id);
    return { id: m.id, name: m.name };
  });
}

export async function signInMemberAction(input: {
  gymId: string;
  name: string;
  passcode: string;
}): Promise<ActionResult<{ id: string; name: string; needsPasscode?: boolean }>> {
  return toResult(async () => {
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
          .ilike('name', input.name.trim().replace(/([\\%_])/g, '\\$1'))
          .maybeSingle();
        if (data) {
          await setMemberCookie(data.id);
          return { id: data.id, name: data.name, needsPasscode: true };
        }
      }
      throw e;
    }
  });
}

export async function setPasscodeAction(input: {
  passcode: string;
}): Promise<ActionResult<void>> {
  return toResult(async () => {
    const memberId = await readMemberCookie();
    if (!memberId) throw new Error('Not signed in');
    await setPasscode({ memberId, passcode: input.passcode });
  });
}

/**
 * Kick off self-serve reset. Deliberately returns the same shape whether or
 * not the email matches a real member — the UI shows a generic "check your
 * inbox" message so a stranger can't probe the gym's email list.
 */
export async function requestResetAction(input: {
  gymId: string;
  email: string;
}): Promise<ActionResult<void>> {
  return toResult(async () => {
    const result = await requestPasswordReset(input);
    if (result.sent) {
      const { data: member } = await supabase
        .from('members')
        .select('name, gyms!inner(name)')
        .eq('id', result.memberId)
        .maybeSingle<{ name: string; gyms: { name: string } | null }>();

      const gymName = member?.gyms?.name ?? 'your gym';
      const memberName = member?.name ?? 'there';
      const resetUrl = `${appOrigin()}/me/reset/${result.token}`;
      const built = buildResetEmail({ memberName, gymName, resetUrl });
      await sendEmail({ to: input.email, ...built });
    }
  });
}

export async function logSet(input: LogSetInput): Promise<ActionResult<LoggedSet>> {
  return toResult(() => logSetInner(input));
}

type LogSetInput = {
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
};

async function logSetInner(input: LogSetInput): Promise<LoggedSet> {
  const memberId = await readMemberCookie();
  if (!memberId) throw new Error('Not identified');

  // Re-fetch the equipment row so we can validate the inputs against the
  // server-side type. Don't trust whatever the client posted.
  const [{ data: eq }, { data: member }] = await Promise.all([
    supabase
      .from('equipment')
      .select('id, gym_id, equipment_type, exercises')
      .eq('id', input.equipmentId)
      .maybeSingle<{
        id: string;
        gym_id: string;
        equipment_type: 'strength_single' | 'strength_multi' | 'cardio';
        exercises: string[];
      }>(),
    supabase.from('members').select('gym_id').eq('id', memberId).maybeSingle<{ gym_id: string }>(),
  ]);
  if (!eq) throw new Error('Equipment not found');
  if (!member || member.gym_id !== eq.gym_id) {
    throw new Error('You’re signed in at a different gym. Sign in here to log this machine.');
  }

  if (eq.equipment_type === 'cardio') {
    const dur = Number(input.durationSeconds);
    if (!Number.isFinite(dur) || dur <= 0) throw new Error('Enter a duration.');
    let distance: number | null = null;
    if (input.distanceMeters != null && input.distanceMeters !== 0) {
      const m = Number(input.distanceMeters);
      if (!Number.isFinite(m) || m < 0) throw new Error('Distance must be a positive number.');
      distance = m;
    }

    const { data: inserted, error } = await supabase
      .from('sets')
      .insert({
        member_id: memberId,
        equipment_id: input.equipmentId,
        gym_id: eq.gym_id,
        weight: null,
        reps: null,
        rpe: null,
        note: input.note ?? null,
        exercise_name: null,
        duration_seconds: Math.round(dur),
        distance_meters: distance,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    revalidatePath(`/scan/${input.qrSlug}`);
    return { id: inserted.id, isPr: false };
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

  // PR check runs before the insert: it's a PR when the member has history on
  // this machine (+ exercise) and nothing prior matches or beats it.
  const isPr = await beatsPriorBest({
    memberId,
    equipmentId: input.equipmentId,
    exerciseName,
    weight: w,
    reps: r,
  });

  const { data: inserted, error } = await supabase
    .from('sets')
    .insert({
      member_id: memberId,
      equipment_id: input.equipmentId,
      gym_id: eq.gym_id,
      weight: w,
      reps: r,
      rpe: input.rpe ?? null,
      note: input.note ?? null,
      exercise_name: exerciseName,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/scan/${input.qrSlug}`);
  return { id: inserted.id, isPr };
}

export type LoggedSet = { id: string; isPr: boolean };

async function beatsPriorBest(input: {
  memberId: string;
  equipmentId: string;
  exerciseName: string | null;
  weight: number;
  reps: number;
}): Promise<boolean> {
  const scoped = () => {
    let q = supabase
      .from('sets')
      .select('id', { head: true, count: 'exact' })
      .eq('member_id', input.memberId)
      .eq('equipment_id', input.equipmentId)
      .not('weight', 'is', null);
    q = input.exerciseName ? q.eq('exercise_name', input.exerciseName) : q;
    return q;
  };
  const [prior, matchOrBetter] = await Promise.all([
    scoped(),
    scoped().or(
      `weight.gt.${input.weight},and(weight.eq.${input.weight},reps.gte.${input.reps})`,
    ),
  ]);
  return (prior.count ?? 0) > 0 && (matchOrBetter.count ?? 0) === 0;
}

/**
 * Undo / delete for the member's own set. Scoped by member_id so a forged id
 * can't touch anyone else's history.
 */
export async function deleteSet(input: {
  setId: string;
  qrSlug: string;
}): Promise<ActionResult<void>> {
  return toResult(async () => {
    const memberId = await readMemberCookie();
    if (!memberId) throw new Error('Not identified');
    const { error } = await supabase
      .from('sets')
      .delete()
      .eq('id', input.setId)
      .eq('member_id', memberId);
    if (error) throw new Error(error.message);
    revalidatePath(`/scan/${input.qrSlug}`);
  });
}

// A "scan" should mean a real arrival at the machine — one row per engagement,
// not one per render. The page's Server Component re-runs on revalidatePath
// (every set logged), refreshes, back-navigation, dev double-render, etc., so
// we dedupe here against a recent window scoped to the same member+equipment.
// Twelve hours covers a typical workout/visit; a return trip the next day
// counts again.
const SCAN_DEDUPE_WINDOW_MS = 12 * 60 * 60 * 1000;

export async function recordScan(input: {
  equipmentId: string;
  gymId: string;
}): Promise<void> {
  const memberId = await readMemberCookie();
  const hdrs = await headers();
  const ua = hdrs.get('user-agent');

  const sinceIso = new Date(Date.now() - SCAN_DEDUPE_WINDOW_MS).toISOString();

  let dedupeQuery = supabase
    .from('scan_events')
    .select('id', { head: true, count: 'exact' })
    .eq('gym_id', input.gymId)
    .eq('equipment_id', input.equipmentId)
    .gte('scanned_at', sinceIso);

  // For identified members, dedupe by member. For anonymous taps, fall back to
  // user-agent so two unrelated phones at the same machine still count, but
  // the same phone refreshing doesn't.
  if (memberId) {
    dedupeQuery = dedupeQuery.eq('member_id', memberId);
  } else if (ua) {
    dedupeQuery = dedupeQuery.is('member_id', null).eq('user_agent', ua);
  } else {
    dedupeQuery = dedupeQuery.is('member_id', null);
  }

  const { count } = await dedupeQuery;
  if ((count ?? 0) > 0) return;

  await supabase.from('scan_events').insert({
    equipment_id: input.equipmentId,
    gym_id: input.gymId,
    member_id: memberId,
    user_agent: ua,
  });
}

export async function signOutMember(): Promise<void> {
  await clearMemberCookie();
}

function appOrigin(): string {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env.replace(/\/$/, '');
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}
