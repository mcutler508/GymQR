'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Equipment, Set } from '@/lib/supabase';
import { describeSuggestion, type Suggestion } from '@/lib/suggested-target';
import {
  createMemberAction,
  signInMemberAction,
  setPasscodeAction,
  logSet,
  signOutMember,
} from './actions';

type Props = {
  equipment: Equipment;
  gymName: string;
  identified: boolean;
  needsPasscode: boolean;
  memberName: string | null;
  recentSets: Set[];
  suggestion: Suggestion;
};

export function ScanClient(props: Props) {
  if (!props.identified) {
    return <IdentityPrompt equipment={props.equipment} gymName={props.gymName} />;
  }
  if (props.needsPasscode) {
    return <SetPasscodePrompt equipment={props.equipment} gymName={props.gymName} memberName={props.memberName} />;
  }
  return (
    <LogView
      equipment={props.equipment}
      gymName={props.gymName}
      memberName={props.memberName}
      recentSets={props.recentSets}
      suggestion={props.suggestion}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Identity: create OR sign in (toggle)                                */
/* ------------------------------------------------------------------ */

function IdentityPrompt({
  equipment,
  gymName,
}: {
  equipment: Equipment;
  gymName: string;
}) {
  const [mode, setMode] = useState<'create' | 'signin'>('create');
  return (
    <main className="p-6 max-w-md mx-auto">
      <Header equipment={equipment} gymName={gymName} />
      <div className="mt-6 inline-flex p-1 rounded bg-surface border border-line text-sm">
        <button
          type="button"
          onClick={() => setMode('create')}
          className={`px-3 py-1.5 rounded-sm transition ${
            mode === 'create' ? 'bg-accent text-accent-ink font-medium' : 'text-muted'
          }`}
        >
          First time
        </button>
        <button
          type="button"
          onClick={() => setMode('signin')}
          className={`px-3 py-1.5 rounded-sm transition ${
            mode === 'signin' ? 'bg-accent text-accent-ink font-medium' : 'text-muted'
          }`}
        >
          Returning
        </button>
      </div>
      {mode === 'create' ? (
        <CreateForm equipment={equipment} />
      ) : (
        <SignInForm equipment={equipment} />
      )}
    </main>
  );
}

function CreateForm({ equipment }: { equipment: Equipment }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    if (!/^\d{4}$/.test(passcode)) return setErr('Passcode must be exactly 4 digits.');
    if (passcode !== confirm) return setErr('Passcodes don’t match.');
    startTransition(async () => {
      try {
        const m = await createMemberAction({
          gymId: equipment.gym_id,
          name,
          passcode,
        });
        try {
          localStorage.setItem('reptag_member_id', m.id);
          localStorage.setItem('reptag_member_name', m.name);
        } catch {
          /* private mode */
        }
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Could not create account.');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <Field label="Your name" value={name} onChange={setName} placeholder="e.g. Mike" autoFocus />
      <PasscodeField label="Choose a 4-digit passcode" value={passcode} onChange={setPasscode} />
      <PasscodeField label="Confirm passcode" value={confirm} onChange={setConfirm} />
      <PrimaryButton type="submit" disabled={pending || !name.trim() || !passcode || !confirm}>
        {pending ? 'Creating…' : 'Continue'}
      </PrimaryButton>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <p className="text-xs text-muted">
        Your name + 4-digit passcode let you pull up your history on any phone.
      </p>
    </form>
  );
}

function SignInForm({ equipment }: { equipment: Equipment }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    if (!/^\d{4}$/.test(passcode)) return setErr('Passcode must be exactly 4 digits.');
    startTransition(async () => {
      try {
        const m = await signInMemberAction({
          gymId: equipment.gym_id,
          name,
          passcode,
        });
        try {
          localStorage.setItem('reptag_member_id', m.id);
          localStorage.setItem('reptag_member_name', m.name);
        } catch {
          /* */
        }
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Could not sign in.');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <Field label="Your name" value={name} onChange={setName} placeholder="e.g. Mike" autoFocus />
      <PasscodeField label="4-digit passcode" value={passcode} onChange={setPasscode} />
      <PrimaryButton type="submit" disabled={pending || !name.trim() || !passcode}>
        {pending ? 'Signing in…' : 'Continue'}
      </PrimaryButton>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <p className="text-xs text-muted">Forgot your passcode? Ask gym staff to reset it.</p>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Set passcode (used when a v1-migrated member has no passcode_hash)  */
/* ------------------------------------------------------------------ */

function SetPasscodePrompt({
  equipment,
  gymName,
  memberName,
}: {
  equipment: Equipment;
  gymName: string;
  memberName: string | null;
}) {
  const router = useRouter();
  const [passcode, setPasscode] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    if (!/^\d{4}$/.test(passcode)) return setErr('Passcode must be exactly 4 digits.');
    if (passcode !== confirm) return setErr('Passcodes don’t match.');
    startTransition(async () => {
      try {
        await setPasscodeAction({ passcode });
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Could not save passcode.');
      }
    });
  }

  return (
    <main className="p-6 max-w-md mx-auto">
      <Header equipment={equipment} gymName={gymName} />
      <div className="mt-6 p-4 rounded-card bg-surface border border-line">
        <p className="text-sm text-muted-strong">
          Welcome back{memberName ? `, ${memberName}` : ''}. Set a 4-digit passcode so you can log in
          from any phone.
        </p>
      </div>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <PasscodeField label="Choose a 4-digit passcode" value={passcode} onChange={setPasscode} autoFocus />
        <PasscodeField label="Confirm passcode" value={confirm} onChange={setConfirm} />
        <PrimaryButton type="submit" disabled={pending || !passcode || !confirm}>
          {pending ? 'Saving…' : 'Save passcode'}
        </PrimaryButton>
        {err && <p className="text-sm text-red-400">{err}</p>}
      </form>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Log view                                                            */
/* ------------------------------------------------------------------ */

function LogView({
  equipment,
  gymName,
  memberName,
  recentSets,
  suggestion,
}: {
  equipment: Equipment;
  gymName: string;
  memberName: string | null;
  recentSets: Set[];
  suggestion: Suggestion;
}) {
  const router = useRouter();
  const lastSession = recentSets.length ? groupBySession(recentSets)[0] : null;
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
          gymId: equipment.gym_id,
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

  function onSignOut() {
    startTransition(async () => {
      await signOutMember();
      try {
        localStorage.removeItem('reptag_member_id');
        localStorage.removeItem('reptag_member_name');
      } catch {
        /* */
      }
      router.refresh();
    });
  }

  return (
    <main className="p-4 max-w-md mx-auto pb-32">
      <Header equipment={equipment} gymName={gymName} />

      <section className="mt-6 p-4 rounded-card bg-surface border border-line">
        <Kicker>Last Time</Kicker>
        {lastSession ? (
          <ul className="mt-2 space-y-1 text-lg">
            {lastSession.sets.map((s) => (
              <li key={s.id} className="tabular-nums">
                {fmtWeight(s.weight)} × {s.reps}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-muted text-sm">No history on this machine yet.</p>
        )}
      </section>

      <section className="mt-3 p-4 rounded-card bg-surface border border-line">
        <Kicker>Suggested Today</Kicker>
        <SuggestedNum suggestion={suggestion} />
      </section>

      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <NumericInput label="Weight" value={weight} onChange={setWeight} mode="decimal" />
          <NumericInput label="Reps" value={reps} onChange={setReps} mode="numeric" />
        </div>
        <PrimaryButton type="submit" disabled={pending} large>
          {pending ? 'Saving…' : 'Save Set'}
        </PrimaryButton>
        {err && <p className="text-sm text-red-400">{err}</p>}
        {justLogged && !pending && !err && (
          <p className="text-sm text-emerald-400">Set saved.</p>
        )}
      </form>

      <section className="mt-6 flex gap-3">
        <Link
          href="/scan"
          className="flex-1 px-4 py-3 rounded bg-surface border border-line text-center text-sm font-medium hover:border-muted transition"
        >
          Scan another machine
        </Link>
        <Link
          href="/me/stats"
          className="flex-1 px-4 py-3 rounded bg-surface border border-line text-center text-sm font-medium hover:border-muted transition"
        >
          My Stats
        </Link>
      </section>

      {recentSets.length > 0 && (
        <section className="mt-8">
          <Kicker className="mb-2">Recent History</Kicker>
          <ul className="space-y-2">
            {groupBySession(recentSets).map((group) => (
              <li key={group.day} className="text-sm">
                <span className="text-muted">{fmtDay(group.day)}</span>{' '}
                <span className="tabular-nums">
                  {group.sets.map((s) => `${fmtWeight(s.weight)} × ${s.reps}`).join(', ')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-8 text-xs text-muted text-center">
        Logged as {memberName ?? 'you'} ·{' '}
        <button type="button" onClick={onSignOut} className="underline">
          sign out
        </button>
      </p>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Themed components                                                   */
/* ------------------------------------------------------------------ */

function Header({ equipment, gymName }: { equipment: Equipment; gymName: string }) {
  return (
    <header className="pt-2">
      <h1
        className={[
          'font-display tracking-tight leading-none',
          // Halogen — editorial serif, regular weight, large
          'halogen:text-5xl halogen:font-medium halogen:tracking-[-0.02em]',
          // Concrete — condensed black, ALL CAPS, huge
          'concrete:text-6xl concrete:font-black concrete:uppercase concrete:leading-[0.85] concrete:tracking-[-0.005em]',
          // Locker Room — Inter semibold
          'locker:text-4xl locker:font-semibold locker:tracking-[-0.025em]',
          // Athletic — Inter italic black uppercase
          'athletic:text-5xl athletic:font-black athletic:italic athletic:uppercase athletic:leading-[0.92] athletic:tracking-[-0.04em]',
        ].join(' ')}
      >
        {equipment.name}
      </h1>
      <p
        className={[
          'mt-2 text-sm text-muted',
          'concrete:font-mono concrete:uppercase concrete:tracking-[0.1em] concrete:text-xs',
          'athletic:font-mono athletic:uppercase athletic:tracking-[0.1em] athletic:text-xs',
        ].join(' ')}
      >
        {[equipment.machine_label, gymName].filter(Boolean).join(' · ')}
      </p>
    </header>
  );
}

function Kicker({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={[
        'block font-mono text-[10px] tracking-[0.2em] uppercase text-muted font-medium',
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}

function SuggestedNum({ suggestion }: { suggestion: Suggestion }) {
  if (suggestion.kind === 'first-time') {
    return <p className="mt-1 text-lg text-muted-strong">{describeSuggestion(suggestion)}</p>;
  }
  return (
    <div className="mt-1 flex items-baseline gap-3 flex-wrap">
      <span
        className={[
          'font-display text-accent leading-none',
          'halogen:text-5xl halogen:italic halogen:font-medium halogen:tracking-[-0.025em]',
          'concrete:text-6xl concrete:font-black concrete:tracking-[-0.005em]',
          'locker:text-4xl locker:font-semibold locker:tracking-[-0.025em]',
          'athletic:text-6xl athletic:italic athletic:font-black athletic:tracking-[-0.04em]',
        ].join(' ')}
      >
        {suggestion.weight} × {suggestion.reps}
      </span>
      <span className="text-xs text-muted">{describeSubLabel(suggestion)}</span>
    </div>
  );
}

function describeSubLabel(s: Suggestion): string {
  if (s.kind === 'increase-weight') return 'Add five, hold reps. Chase the PR.';
  if (s.kind === 'add-rep') return 'Same weight, push for one more.';
  return '';
}

function PrimaryButton({
  children,
  disabled,
  type = 'button',
  large,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  type?: 'submit' | 'button';
  large?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={[
        'w-full rounded font-semibold transition disabled:opacity-50',
        'bg-accent text-accent-ink hover:opacity-90',
        large ? 'px-4 py-5 text-lg' : 'px-4 py-4 text-base',
        // Theme-specific casing/style
        'concrete:font-black concrete:uppercase concrete:tracking-[0.05em]',
        'athletic:font-black athletic:italic athletic:uppercase athletic:tracking-[0.03em]',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-sm text-muted mb-1">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full px-4 py-4 text-lg rounded bg-surface border border-line text-ink placeholder:text-muted focus:border-accent focus:outline-none"
      />
    </label>
  );
}

function NumericInput({
  label,
  value,
  onChange,
  mode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mode: 'decimal' | 'numeric';
}) {
  return (
    <label className="block">
      <Kicker className="mb-1">{label}</Kicker>
      <input
        type="text"
        inputMode={mode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={mode === 'decimal' ? 'lbs' : 'reps'}
        className={[
          'w-full px-4 py-4 tabular-nums rounded bg-surface border border-line text-ink',
          'focus:border-accent focus:outline-none placeholder:text-muted',
          'text-2xl font-display',
          'concrete:text-3xl concrete:font-black',
          'athletic:font-black athletic:italic',
        ].join(' ')}
      />
    </label>
  );
}

function PasscodeField({
  label,
  value,
  onChange,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-sm text-muted mb-1">{label}</span>
      <input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        pattern="\d{4}"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
        placeholder="••••"
        autoFocus={autoFocus}
        className="w-full px-4 py-4 text-2xl tracking-[0.4em] tabular-nums rounded bg-surface border border-line text-ink focus:border-accent focus:outline-none placeholder:text-muted"
      />
    </label>
  );
}

function fmtWeight(w: number): string {
  return Number.isInteger(w) ? String(w) : w.toFixed(1);
}

function fmtDay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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
