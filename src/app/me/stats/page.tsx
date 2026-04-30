import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  lifetimeTotals,
  weeklyStreak,
  prFor,
  progressionFor,
} from '@/lib/stats';
import { Sparkline } from './Sparkline';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'reptag_member_id';

type SetRow = {
  weight: number;
  reps: number;
  logged_at: string;
  equipment_id: string;
  equipment: { id: string; name: string; machine_label: string | null } | null;
};

export default async function MyStatsPage() {
  const store = await cookies();
  const memberId = store.get(COOKIE_NAME)?.value;
  if (!memberId) {
    return <Unidentified />;
  }

  const { data: member } = await supabase
    .from('members')
    .select('id, name, gym_id, gyms(name)')
    .eq('id', memberId)
    .maybeSingle<{ id: string; name: string; gym_id: string; gyms: { name: string } | null }>();

  if (!member) {
    // Cookie points at a deleted member — clear it on the next request via redirect.
    redirect('/');
  }

  const { data: setsRaw } = await supabase
    .from('sets')
    .select('weight, reps, logged_at, equipment_id, equipment(id, name, machine_label)')
    .eq('member_id', memberId)
    .order('logged_at', { ascending: false })
    .returns<SetRow[]>();

  const sets = setsRaw ?? [];
  const totals = lifetimeTotals(sets);
  const streak = weeklyStreak(sets);

  // Group by equipment for the per-machine cards.
  const byEquipment = new Map<string, { name: string; label: string | null; sets: SetRow[] }>();
  for (const s of sets) {
    const id = s.equipment_id;
    const eqName = s.equipment?.name ?? 'Unknown';
    const eqLabel = s.equipment?.machine_label ?? null;
    if (!byEquipment.has(id)) {
      byEquipment.set(id, { name: eqName, label: eqLabel, sets: [] });
    }
    byEquipment.get(id)!.sets.push(s);
  }

  const machines = Array.from(byEquipment.entries())
    .map(([id, group]) => {
      const pr = prFor(group.sets);
      const progression = progressionFor(group.sets);
      return {
        id,
        name: group.name,
        label: group.label,
        setCount: group.sets.length,
        pr,
        progression,
        lastLogged: group.sets[0]?.logged_at ?? null,
      };
    })
    .sort((a, b) => (a.lastLogged && b.lastLogged ? (a.lastLogged < b.lastLogged ? 1 : -1) : 0));

  return (
    <main className="p-6 max-w-2xl mx-auto pb-20">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">{member.name}</h1>
        <p className="text-sm text-neutral-400">{member.gyms?.name ?? 'Gym'}</p>
      </header>

      <section className="grid grid-cols-2 gap-3 mb-6">
        <Stat label="Lifetime volume" value={fmtVol(totals.totalVolume)} sub="lbs moved" />
        <Stat label="Workouts" value={String(totals.workoutDays)} sub="days logged" />
        <Stat label="This week" value={`${streak} / 7`} sub="days active" />
        <Stat label="Total sets" value={String(totals.totalSets)} sub="all time" />
      </section>

      <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-3">
        Per-machine
      </h2>

      {machines.length === 0 ? (
        <p className="text-sm text-neutral-400">
          No sets logged yet. Scan a QR sticker to get started.
        </p>
      ) : (
        <ul className="space-y-3">
          {machines.map((m) => (
            <li key={m.id}>
              <Link
                href={`/me/stats/${m.id}`}
                className="block p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{m.name}</p>
                    <p className="text-xs text-neutral-500">
                      {[m.label, `${m.setCount} sets`].filter(Boolean).join(' · ')}
                    </p>
                    {m.pr && (
                      <p className="text-sm text-neutral-300 mt-2 tabular-nums">
                        PR <span className="font-semibold">{fmtWeight(m.pr.weight)} × {m.pr.reps}</span>
                      </p>
                    )}
                  </div>
                  <Sparkline points={m.progression.map((p) => p.weight)} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 text-center">
        <Link href="/scan" className="text-sm underline text-neutral-400">
          ← Back to scanner
        </Link>
      </p>
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
      <p className="text-xs uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-neutral-500">{sub}</p>
    </div>
  );
}

function Unidentified() {
  return (
    <main className="p-6 max-w-md mx-auto text-center">
      <h1 className="text-xl font-semibold mb-2">Sign in first</h1>
      <p className="text-neutral-400 text-sm mb-6">
        Scan a QR sticker on a machine to identify yourself, then come back here for stats.
      </p>
      <Link
        href="/scan"
        className="inline-block px-4 py-2 rounded-lg border border-neutral-700 text-sm"
      >
        Open scanner
      </Link>
    </main>
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
