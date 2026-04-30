import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { lifetimeTotals, prFor, progressionFor } from '@/lib/stats';
import { ProgressionChart } from './ProgressionChart';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'reptag_member_id';

type SetRow = {
  weight: number;
  reps: number;
  logged_at: string;
};

export default async function MachineStatsPage({
  params,
}: {
  params: Promise<{ equipmentId: string }>;
}) {
  const { equipmentId } = await params;

  const store = await cookies();
  const memberId = store.get(COOKIE_NAME)?.value;
  if (!memberId) {
    return (
      <main className="p-6 max-w-md mx-auto text-center">
        <h1 className="text-xl font-semibold mb-2">Sign in first</h1>
        <p className="text-neutral-400 text-sm mb-6">
          Scan a sticker to identify yourself, then come back.
        </p>
        <Link href="/scan" className="inline-block px-4 py-2 rounded-lg border border-neutral-700 text-sm">
          Open scanner
        </Link>
      </main>
    );
  }

  const { data: equipment } = await supabase
    .from('equipment')
    .select('id, name, machine_label, qr_slug')
    .eq('id', equipmentId)
    .maybeSingle();
  if (!equipment) notFound();

  const { data: setsRaw } = await supabase
    .from('sets')
    .select('weight, reps, logged_at')
    .eq('member_id', memberId)
    .eq('equipment_id', equipmentId)
    .order('logged_at', { ascending: true })
    .returns<SetRow[]>();

  const sets = setsRaw ?? [];
  const totals = lifetimeTotals(sets);
  const pr = prFor(sets);
  const progression = progressionFor(sets);

  return (
    <main className="p-6 max-w-2xl mx-auto pb-20">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wider text-neutral-500">Stats</p>
        <h1 className="text-3xl font-semibold tracking-tight">{equipment.name}</h1>
        {equipment.machine_label && (
          <p className="text-sm text-neutral-400">{equipment.machine_label}</p>
        )}
      </header>

      <section className="grid grid-cols-3 gap-3 mb-6">
        <Stat
          label="PR"
          value={pr ? `${fmtWeight(pr.weight)} × ${pr.reps}` : '—'}
          sub={pr ? new Date(pr.logged_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'no sets yet'}
        />
        <Stat label="Sets" value={String(totals.totalSets)} sub="all time" />
        <Stat label="Volume" value={fmtVol(totals.totalVolume)} sub="lbs moved" />
      </section>

      <section className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
        <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-2">
          Working set over time
        </h2>
        <ProgressionChart points={progression} />
      </section>

      <p className="mt-8">
        <Link
          href={`/scan/${equipment.qr_slug}`}
          className="block w-full text-center px-4 py-3 rounded-lg bg-white text-black font-medium"
        >
          Open this machine
        </Link>
      </p>

      <p className="mt-4 text-center">
        <Link href="/me/stats" className="text-sm underline text-neutral-400">
          ← All stats
        </Link>
      </p>
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
      <p className="text-xs uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-neutral-500">{sub}</p>
    </div>
  );
}

function fmtVol(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}k`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function fmtWeight(w: number): string {
  return Number.isInteger(w) ? String(w) : w.toFixed(1);
}
