'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Equipment, Set } from '@/lib/supabase';
import { describeSuggestion, type Suggestion } from '@/lib/suggested-target';
import { ensureUser, logSet } from './actions';

type Props = {
  equipment: Equipment;
  identified: boolean;
  recentSets: Set[];
  suggestion: Suggestion;
};

export function ScanClient({ equipment, identified, recentSets, suggestion }: Props) {
  if (!identified) {
    return <NamePrompt equipment={equipment} />;
  }
  return <LogView equipment={equipment} recentSets={recentSets} suggestion={suggestion} />;
}

function NamePrompt({ equipment }: { equipment: Equipment }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      try {
        const u = await ensureUser(name);
        try {
          localStorage.setItem('reptag_user_id', u.id);
          localStorage.setItem('reptag_user_name', u.name);
        } catch {
          // localStorage can fail in private mode; cookie is the source of truth.
        }
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Could not save name');
      }
    });
  }

  return (
    <main className="p-6 max-w-md mx-auto">
      <Header equipment={equipment} />
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block text-sm text-neutral-400">What&apos;s your name?</label>
        <input
          type="text"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full px-4 py-4 text-lg rounded-lg bg-neutral-900 border border-neutral-800 focus:border-neutral-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="w-full px-4 py-4 text-lg font-semibold rounded-lg bg-white text-black disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Continue'}
        </button>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <p className="text-xs text-neutral-500 mt-2">
          Saved on this device only — no email needed for the demo.
        </p>
      </form>
    </main>
  );
}

function LogView({
  equipment,
  recentSets,
  suggestion,
}: {
  equipment: Equipment;
  recentSets: Set[];
  suggestion: Suggestion;
}) {
  const router = useRouter();
  const last = recentSets[0];
  const lastSession = recentSets.length
    ? groupBySession(recentSets)[0]
    : null;
  const [weight, setWeight] = useState<string>(
    suggestion.kind === 'first-time' ? '' : String(suggestion.weight),
  );
  const [reps, setReps] = useState<string>(
    suggestion.kind === 'first-time' ? '' : String(suggestion.reps),
  );
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [justLogged, setJustLogged] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const w = Number(weight);
    const r = Number(reps);
    if (!Number.isFinite(w) || w <= 0) return setErr('Enter a valid weight.');
    if (!Number.isInteger(r) || r <= 0) return setErr('Enter a valid rep count.');

    startTransition(async () => {
      try {
        await logSet({
          equipmentId: equipment.id,
          weight: w,
          reps: r,
          qrSlug: equipment.qr_slug,
        });
        setJustLogged(true);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Could not save set');
      }
    });
  }

  return (
    <main className="p-4 max-w-md mx-auto pb-32">
      <Header equipment={equipment} />

      {/* Last session card */}
      <section className="mt-6 p-4 rounded-xl bg-neutral-900 border border-neutral-800">
        <h2 className="text-xs uppercase tracking-wider text-neutral-500">Last Time</h2>
        {lastSession ? (
          <ul className="mt-2 space-y-1 text-lg">
            {lastSession.sets.map((s) => (
              <li key={s.id} className="tabular-nums">
                {fmtWeight(s.weight)} × {s.reps}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-neutral-400 text-sm">No history on this machine yet.</p>
        )}
      </section>

      {/* Suggested target */}
      <section className="mt-3 p-4 rounded-xl bg-neutral-900 border border-neutral-800">
        <h2 className="text-xs uppercase tracking-wider text-neutral-500">Suggested Today</h2>
        <p className="mt-1 text-lg">{describeSuggestion(suggestion)}</p>
      </section>

      {/* Log form */}
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">Weight</span>
            <input
              type="text"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="lbs"
              className="w-full px-4 py-4 text-2xl tabular-nums rounded-lg bg-neutral-900 border border-neutral-800 focus:border-neutral-500 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">Reps</span>
            <input
              type="text"
              inputMode="numeric"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              placeholder="reps"
              className="w-full px-4 py-4 text-2xl tabular-nums rounded-lg bg-neutral-900 border border-neutral-800 focus:border-neutral-500 focus:outline-none"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full px-4 py-5 text-lg font-semibold rounded-lg bg-white text-black disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save Set'}
        </button>
        {err && <p className="text-sm text-red-400">{err}</p>}
        {justLogged && !pending && !err && (
          <p className="text-sm text-emerald-400">Set saved.</p>
        )}
      </form>

      {/* Recent history */}
      {recentSets.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-2">Recent History</h2>
          <ul className="space-y-2">
            {groupBySession(recentSets).map((group) => (
              <li key={group.day} className="text-sm">
                <span className="text-neutral-500">{fmtDay(group.day)}</span>{' '}
                <span className="tabular-nums">
                  {group.sets.map((s) => `${fmtWeight(s.weight)} × ${s.reps}`).join(', ')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {last && (
        <p className="mt-8 text-xs text-neutral-600 text-center">
          Logged as {getName()} · clear browser data to switch identity
        </p>
      )}
    </main>
  );
}

function Header({ equipment }: { equipment: Equipment }) {
  return (
    <header>
      <h1 className="text-3xl font-semibold tracking-tight">{equipment.name}</h1>
      <p className="text-sm text-neutral-400">
        {[equipment.machine_label, equipment.gym_name].filter(Boolean).join(' · ')}
      </p>
    </header>
  );
}

function fmtWeight(w: number): string {
  return Number.isInteger(w) ? String(w) : w.toFixed(1);
}

function fmtDay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getName(): string {
  if (typeof window === 'undefined') return 'you';
  return localStorage.getItem('reptag_user_name') ?? 'you';
}

function groupBySession(sets: Set[]): Array<{ day: string; sets: Set[] }> {
  const groups: Record<string, Set[]> = {};
  for (const s of sets) {
    const day = s.logged_at.slice(0, 10);
    (groups[day] ??= []).push(s);
  }
  return Object.entries(groups)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, sets]) => ({ day, sets }));
}
