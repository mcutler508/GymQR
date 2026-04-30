import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { supabase, type Equipment, type Set } from '@/lib/supabase';
import { suggestTarget } from '@/lib/suggested-target';
import { ScanClient } from './ScanClient';
import { recordScan } from './actions';

const COOKIE_NAME = 'reptag_user_id';

export const dynamic = 'force-dynamic';

export default async function ScanPage({
  params,
}: {
  params: Promise<{ qrSlug: string }>;
}) {
  const { qrSlug } = await params;

  const { data: equipment, error } = await supabase
    .from('equipment')
    .select('id, qr_slug, name, machine_label, gym_name, status')
    .eq('qr_slug', qrSlug)
    .maybeSingle<Equipment>();

  if (error) {
    return (
      <main className="p-6 max-w-md mx-auto text-center">
        <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
        <p className="text-neutral-400 text-sm">{error.message}</p>
      </main>
    );
  }

  if (!equipment) notFound();

  if (equipment.status === 'inactive') {
    return (
      <main className="p-6 max-w-md mx-auto text-center">
        <h1 className="text-xl font-semibold mb-2">Equipment unavailable</h1>
        <p className="text-neutral-400 text-sm">
          This machine is offline. Ask a staff member if it should be active.
        </p>
      </main>
    );
  }

  // Fire-and-forget scan event (non-blocking for the user, but awaited so the
  // request finishes before the response stream closes — Vercel will kill loose
  // promises otherwise).
  await recordScan(equipment.id);

  const store = await cookies();
  const userId = store.get(COOKIE_NAME)?.value ?? null;

  let recentSets: Set[] = [];
  if (userId) {
    const { data } = await supabase
      .from('sets')
      .select('id, user_id, equipment_id, weight, reps, rpe, note, logged_at')
      .eq('user_id', userId)
      .eq('equipment_id', equipment.id)
      .order('logged_at', { ascending: false })
      .limit(10);
    recentSets = (data ?? []) as Set[];
  }

  const suggestion = suggestTarget(recentSets[0]);

  return (
    <ScanClient
      equipment={equipment}
      identified={!!userId}
      recentSets={recentSets}
      suggestion={suggestion}
    />
  );
}
