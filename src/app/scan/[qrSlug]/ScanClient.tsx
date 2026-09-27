'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Equipment, Set } from '@/lib/supabase';
import { suggestFromSessions, describeSuggestion, type Suggestion } from '@/lib/suggested-target';
import {
  describeCardioSuggestion,
  formatDuration,
  formatMiles,
  metersToMiles,
  milesToMeters,
  suggestCardioTarget,
  type CardioSuggestion,
} from '@/lib/cardio';
import { groupIntoSessions } from '@/lib/stats';
import { formatLocal } from '@/lib/timezone';
import { fmtWeight } from '@/lib/format';
import {
  createMemberAction,
  signInMemberAction,
  setPasscodeAction,
  requestResetAction,
  logSet,
  deleteSet,
  signOutMember,
  type LoggedSet,
} from './actions';

type Session = { startedAt: string; endedAt: string; sets: Set[] };

/** Same window `groupIntoSessions` uses — sets within 2h are one workout. */
const SESSION_GAP_MS = 2 * 60 * 60 * 1000;
/** Rest timer buzzes once when this many seconds have passed. */
const REST_TARGET_SECONDS = 90;
const UNDO_WINDOW_MS = 6000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = {
  equipment: Equipment;
  gymName: string;
  gymTimezone: string;
  identified: boolean;
  needsPasscode: boolean;
  memberName: string | null;
  recentSets: Set[];
};

export function ScanClient(props: Props) {
  if (!props.identified) {
    return <IdentityPrompt equipment={props.equipment} gymName={props.gymName} />;
  }
  if (props.needsPasscode) {
    return <SetPasscodePrompt equipment={props.equipment} gymName={props.gymName} memberName={props.memberName} />;
  }
  if (props.equipment.equipment_type === 'cardio') {
    return (
      <CardioLogView
        equipment={props.equipment}
        gymName={props.gymName}
        gymTimezone={props.gymTimezone}
        memberName={props.memberName}
        recentSets={props.recentSets}
      />
    );
  }
  return (
    <LogView
      equipment={props.equipment}
      gymName={props.gymName}
      gymTimezone={props.gymTimezone}
      memberName={props.memberName}
      recentSets={props.recentSets}
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
  const [mode, setMode] = useState<'create' | 'signin' | 'forgot'>('create');
  const [knownName, setKnownName] = useState('');

  // A name remembered on this phone means they've been here before — open on
  // "Returning" with the name filled so they only type the passcode.
  useEffect(() => {
    try {
      const n = localStorage.getItem('reptag_member_name');
      if (n) {
        setKnownName(n);
        setMode('signin');
      }
    } catch {
      /* private mode */
    }
  }, []);

  return (
    <main className="px-5 pt-4 pb-10 max-w-md mx-auto">
      <Header equipment={equipment} gymName={gymName} brand />
      <div
        role="tablist"
        aria-label="Account"
        className="mt-6 grid grid-cols-2 p-1 rounded bg-surface border border-line text-sm"
      >
        <SegmentButton active={mode === 'create'} onClick={() => setMode('create')}>
          First time
        </SegmentButton>
        <SegmentButton
          active={mode === 'signin' || mode === 'forgot'}
          onClick={() => setMode('signin')}
        >
          Returning
        </SegmentButton>
      </div>
      {mode === 'create' && <CreateForm equipment={equipment} />}
      {mode === 'signin' && (
        <SignInForm
          key={knownName}
          equipment={equipment}
          initialName={knownName}
          onForgot={() => setMode('forgot')}
        />
      )}
      {mode === 'forgot' && (
        <ForgotPasscodeForm
          equipment={equipment}
          onBack={() => setMode('signin')}
        />
      )}
      <p className="mt-14 text-center text-[10px] font-mono uppercase tracking-[0.28em] text-muted">
        Powered by RepetoIQ
      </p>
    </main>
  );
}

function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        'min-h-11 rounded-sm transition-colors',
        active ? 'bg-accent text-accent-ink font-semibold' : 'text-muted-strong',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function CreateForm({ equipment }: { equipment: Equipment }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [reveal, setReveal] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    if (!EMAIL_RE.test(email.trim())) return setErr('Enter a valid email address.');
    if (!/^\d{4}$/.test(passcode)) return setErr('Passcode must be exactly 4 digits.');
    startTransition(async () => {
      try {
        const m = await createMemberAction({
          gymId: equipment.gym_id,
          name,
          email,
          passcode,
        });
        rememberName(m.name);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Could not create account.');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-5">
      <Field label="Your name" value={name} onChange={setName} placeholder="e.g. Mike" autoFocus autoComplete="given-name" />
      <Field
        label="Email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        type="email"
        autoComplete="email"
      />
      <PinInput
        label="Choose a 4-digit passcode"
        value={passcode}
        onChange={setPasscode}
        reveal={reveal}
        onToggleReveal={() => setReveal((r) => !r)}
      />
      <PrimaryButton
        type="submit"
        disabled={pending || !name.trim() || !email.trim() || passcode.length !== 4}
      >
        {pending ? 'Creating…' : 'Continue'}
      </PrimaryButton>
      <ErrorText err={err} />
      <p className="text-xs text-muted-strong">
        Name + passcode lets you sign in from any phone. Email is only used if you forget your
        passcode.
      </p>
    </form>
  );
}

function SignInForm({
  equipment,
  initialName,
  onForgot,
}: {
  equipment: Equipment;
  initialName: string;
  onForgot: () => void;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState(initialName);
  const [passcode, setPasscode] = useState('');
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  // Auto-submit on the 4th digit — no reach for the button.
  useEffect(() => {
    if (passcode.length === 4 && name.trim()) formRef.current?.requestSubmit();
    // Only the passcode reaching 4 digits should fire this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passcode]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setErr(null);
    if (!/^\d{4}$/.test(passcode)) return setErr('Passcode must be exactly 4 digits.');
    startTransition(async () => {
      try {
        const m = await signInMemberAction({
          gymId: equipment.gym_id,
          name,
          passcode,
        });
        rememberName(m.name);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Could not sign in.');
        setPasscode('');
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="mt-6 space-y-5">
      <Field
        label="Your name"
        value={name}
        onChange={setName}
        placeholder="e.g. Mike"
        autoFocus={!initialName}
        autoComplete="given-name"
      />
      <PinInput label="4-digit passcode" value={passcode} onChange={setPasscode} autoFocus={!!initialName} />
      <PrimaryButton type="submit" disabled={pending || !name.trim() || passcode.length !== 4}>
        {pending ? 'Signing in…' : 'Continue'}
      </PrimaryButton>
      <ErrorText err={err} />
      <button
        type="button"
        onClick={onForgot}
        className="min-h-11 w-full text-center text-sm text-muted-strong underline underline-offset-4"
      >
        Forgot your passcode? Reset it by email
      </button>
    </form>
  );
}

function ForgotPasscodeForm({
  equipment,
  onBack,
}: {
  equipment: Equipment;
  onBack: () => void;
}) {
  const [email, setEmail] = useState('');
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    if (!EMAIL_RE.test(email.trim())) return setErr('Enter a valid email address.');
    startTransition(async () => {
      try {
        await requestResetAction({ gymId: equipment.gym_id, email });
        setSent(true);
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Could not send reset email.');
      }
    });
  }

  if (sent) {
    return (
      <div className="mt-6 space-y-4">
        <div className="p-4 rounded-card bg-surface border border-line">
          <p className="text-sm text-muted-strong">
            If that email is on file at this gym, we sent a reset link. Open it on your phone —
            the link expires in 30 minutes.
          </p>
        </div>
        <SecondaryButton onClick={onBack}>Back to sign in</SecondaryButton>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-5">
      <Field
        label="Email on file"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        type="email"
        autoComplete="email"
        autoFocus
      />
      <PrimaryButton type="submit" disabled={pending || !email.trim()}>
        {pending ? 'Sending…' : 'Send reset link'}
      </PrimaryButton>
      <ErrorText err={err} />
      <button
        type="button"
        onClick={onBack}
        className="min-h-11 w-full text-center text-sm text-muted-strong underline underline-offset-4"
      >
        Back to sign in
      </button>
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
  const [reveal, setReveal] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    if (!/^\d{4}$/.test(passcode)) return setErr('Passcode must be exactly 4 digits.');
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
    <main className="px-5 pt-4 pb-10 max-w-md mx-auto">
      <Header equipment={equipment} gymName={gymName} brand />
      <div className="mt-6 p-4 rounded-card bg-surface border border-line">
        <p className="text-sm text-muted-strong">
          Welcome back{memberName ? `, ${memberName}` : ''}. Set a 4-digit passcode so you can log in
          from any phone.
        </p>
      </div>
      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <PinInput
          label="Choose a 4-digit passcode"
          value={passcode}
          onChange={setPasscode}
          autoFocus
          reveal={reveal}
          onToggleReveal={() => setReveal((r) => !r)}
        />
        <PrimaryButton type="submit" disabled={pending || passcode.length !== 4}>
          {pending ? 'Saving…' : 'Save passcode'}
        </PrimaryButton>
        <ErrorText err={err} />
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
  gymTimezone,
  memberName,
  recentSets,
}: {
  equipment: Equipment;
  gymName: string;
  gymTimezone: string;
  memberName: string | null;
  recentSets: Set[];
}) {
  const isMulti = equipment.equipment_type === 'strength_multi';
  useWakeLock();

  // Default chip = the exercise this member used most recently on this
  // equipment, falling back to the first chip if they haven't logged here.
  const initialExercise = useMemo<string | null>(() => {
    if (!isMulti) return null;
    const lastTagged = recentSets.find((s) => s.exercise_name);
    if (lastTagged?.exercise_name) return lastTagged.exercise_name;
    return equipment.exercises[0] ?? null;
  }, [isMulti, recentSets, equipment.exercises]);

  const [selectedExercise, setSelectedExercise] = useState<string | null>(initialExercise);

  const filteredSets = useMemo<Set[]>(() => {
    if (!isMulti) return recentSets;
    if (!selectedExercise) return [];
    return recentSets.filter((s) => s.exercise_name === selectedExercise);
  }, [isMulti, recentSets, selectedExercise]);

  const { today, prior } = useMemo(() => splitSessions(filteredSets), [filteredSets]);
  const lastSession = prior.length > 0 ? prior[prior.length - 1] : null;

  // Frozen for the session: driven only by prior sessions, so logging set 1
  // doesn't move the target for sets 2 and 3.
  const suggestion = useMemo<Suggestion>(
    () => suggestFromSessions(prior.map((s) => s.sets)),
    [prior],
  );

  const prefill = useMemo(() => {
    const lastToday = today?.sets[today.sets.length - 1];
    if (lastToday?.weight != null && lastToday.reps != null) {
      return { weight: fmtWeight(Number(lastToday.weight)), reps: String(lastToday.reps) };
    }
    if (suggestion.kind === 'first-time') return { weight: '', reps: '' };
    return { weight: fmtWeight(suggestion.weight), reps: String(suggestion.reps) };
  }, [today, suggestion]);

  const [weight, setWeight] = useState<string>(prefill.weight);
  const [reps, setReps] = useState<string>(prefill.reps);

  // When the member taps a different exercise chip, load that exercise's
  // numbers (today's last set, else its target).
  useEffect(() => {
    setWeight(prefill.weight);
    setReps(prefill.reps);
    // Tied to chip selection, not to every refresh after a save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExercise]);

  const loop = useLogLoop(equipment.qr_slug, { rest: true });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    loop.setErr(null);
    if (isMulti && !selectedExercise) return loop.setErr('Pick an exercise first.');
    const w = Number(weight);
    const r = Number(reps);
    if (!Number.isFinite(w) || w <= 0) return loop.setErr('Enter a valid weight.');
    if (!Number.isInteger(r) || r <= 0) return loop.setErr('Enter a valid rep count.');
    loop.save(`${fmtWeight(w)} × ${r}`, () =>
      logSet({
        equipmentId: equipment.id,
        gymId: equipment.gym_id,
        weight: w,
        reps: r,
        exerciseName: isMulti ? selectedExercise : null,
        qrSlug: equipment.qr_slug,
      }),
    );
  }

  return (
    <main className="px-5 pt-4 max-w-md mx-auto pb-48">
      <Header equipment={equipment} gymName={gymName} />

      {isMulti && (
        <section className="mt-5">
          <Kicker className="mb-2">Exercise</Kicker>
          <div className="flex flex-wrap gap-2">
            {equipment.exercises.map((ex) => {
              const on = selectedExercise === ex;
              return (
                <button
                  key={ex}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSelectedExercise(ex)}
                  className={[
                    'min-h-11 px-4 rounded-full text-sm border transition-colors',
                    on
                      ? 'bg-accent text-accent-ink border-accent font-semibold'
                      : 'bg-surface text-ink border-line hover:border-muted',
                  ].join(' ')}
                >
                  {ex}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <LastTimeCard
        session={lastSession}
        timezone={gymTimezone}
        empty={isMulti ? 'No history on this exercise yet.' : 'No history on this machine yet.'}
        format={fmtStrength}
      />

      <section className="mt-3 p-4 rounded-card bg-surface border border-line">
        <Kicker>Target today</Kicker>
        <SuggestedNum suggestion={suggestion} />
      </section>

      <form id="log-form" onSubmit={onSubmit} className="mt-6 space-y-4">
        <Stepper label="Weight" unit="lbs" value={weight} onChange={setWeight} step={5} mode="decimal" />
        <Stepper label="Reps" value={reps} onChange={setReps} step={1} mode="numeric" />
        <ErrorText err={loop.err} />
      </form>

      <TodayList
        session={today}
        freshId={loop.freshId}
        format={fmtStrength}
        onDelete={loop.remove}
        pending={loop.pending}
      />

      <RecentHistory sessions={prior.slice(0, -1)} timezone={gymTimezone} format={fmtStrength} />

      <LogFooter memberName={memberName} />

      <ActionBar
        saveLabel={loop.pending ? 'Saving…' : 'Save set'}
        pending={loop.pending}
        showNext={!!today}
        toast={loop.toast}
        onUndo={loop.undo}
        onDismissToast={loop.dismissToast}
        restSince={loop.restSince}
        onDismissRest={loop.clearRest}
      />
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Cardio log view                                                     */
/* ------------------------------------------------------------------ */

function CardioLogView({
  equipment,
  gymName,
  gymTimezone,
  memberName,
  recentSets,
}: {
  equipment: Equipment;
  gymName: string;
  gymTimezone: string;
  memberName: string | null;
  recentSets: Set[];
}) {
  useWakeLock();

  const cardioSets = useMemo<Set[]>(
    () => recentSets.filter((s) => s.duration_seconds != null),
    [recentSets],
  );
  const { today, prior } = useMemo(() => splitSessions(cardioSets), [cardioSets]);
  const lastSession = prior.length > 0 ? prior[prior.length - 1] : null;

  const suggestion = useMemo<CardioSuggestion>(() => {
    const last = lastSession?.sets[lastSession.sets.length - 1];
    if (!last) return suggestCardioTarget(undefined);
    return suggestCardioTarget({
      duration_seconds: last.duration_seconds,
      distance_meters: last.distance_meters,
    });
  }, [lastSession]);

  // Pre-fill from today's last session if there is one, else the suggestion.
  const [initial] = useState(() => {
    const lastToday = today?.sets[today.sets.length - 1];
    const dur =
      lastToday?.duration_seconds ??
      (suggestion.kind === 'add-time' ? suggestion.durationSeconds : null);
    const dist =
      lastToday?.distance_meters ??
      (suggestion.kind === 'add-time' ? suggestion.distanceMeters : null);
    return {
      min: dur != null ? String(Math.floor(Number(dur) / 60)) : '',
      sec: dur != null ? String(Number(dur) % 60).padStart(2, '0') : '',
      miles: dist != null ? metersToMiles(Number(dist)).toFixed(2) : '',
    };
  });

  const [minutes, setMinutes] = useState<string>(initial.min);
  const [seconds, setSeconds] = useState<string>(initial.sec);
  const [miles, setMiles] = useState<string>(initial.miles);
  const loop = useLogLoop(equipment.qr_slug, { rest: false });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    loop.setErr(null);
    const m = minutes === '' ? 0 : Number(minutes);
    const s = seconds === '' ? 0 : Number(seconds);
    if (!Number.isFinite(m) || m < 0 || !Number.isInteger(m)) {
      return loop.setErr('Enter whole minutes.');
    }
    if (!Number.isFinite(s) || s < 0 || s >= 60 || !Number.isInteger(s)) {
      return loop.setErr('Seconds must be 0–59.');
    }
    const total = m * 60 + s;
    if (total <= 0) return loop.setErr('Enter a duration greater than zero.');

    let distanceMeters: number | null = null;
    if (miles.trim() !== '') {
      const mi = Number(miles);
      if (!Number.isFinite(mi) || mi < 0) return loop.setErr('Enter a valid distance.');
      if (mi > 0) distanceMeters = milesToMeters(mi);
    }

    const label = distanceMeters
      ? `${formatDuration(total)} · ${formatMiles(distanceMeters)} mi`
      : formatDuration(total);
    loop.save(label, () =>
      logSet({
        equipmentId: equipment.id,
        gymId: equipment.gym_id,
        durationSeconds: total,
        distanceMeters,
        qrSlug: equipment.qr_slug,
      }),
    );
  }

  return (
    <main className="px-5 pt-4 max-w-md mx-auto pb-48">
      <Header equipment={equipment} gymName={gymName} />

      <LastTimeCard
        session={lastSession}
        timezone={gymTimezone}
        empty="No history on this machine yet."
        format={fmtCardio}
      />

      <section className="mt-3 p-4 rounded-card bg-surface border border-line">
        <Kicker>Target today</Kicker>
        <CardioSuggestionDisplay suggestion={suggestion} />
      </section>

      <form id="log-form" onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <Kicker className="mb-1.5">Duration</Kicker>
          <div className="flex items-center gap-2">
            <NumericInputBare
              value={minutes}
              onChange={setMinutes}
              placeholder="min"
              mode="numeric"
              ariaLabel="Minutes"
            />
            <span className="text-2xl font-display tabular-nums text-muted">:</span>
            <NumericInputBare
              value={seconds}
              onChange={setSeconds}
              placeholder="sec"
              mode="numeric"
              ariaLabel="Seconds"
            />
          </div>
        </div>
        <div>
          <Kicker className="mb-1.5">Distance (optional)</Kicker>
          <div className="flex items-center gap-2">
            <NumericInputBare
              value={miles}
              onChange={setMiles}
              placeholder="0.0"
              mode="decimal"
              ariaLabel="Distance in miles"
            />
            <span className="text-sm text-muted-strong">mi</span>
          </div>
        </div>
        <ErrorText err={loop.err} />
      </form>

      <TodayList
        session={today}
        freshId={loop.freshId}
        format={fmtCardio}
        onDelete={loop.remove}
        pending={loop.pending}
      />

      <RecentHistory sessions={prior.slice(0, -1)} timezone={gymTimezone} format={fmtCardio} />

      <LogFooter memberName={memberName} />

      <ActionBar
        saveLabel={loop.pending ? 'Saving…' : 'Save session'}
        pending={loop.pending}
        showNext={!!today}
        toast={loop.toast}
        onUndo={loop.undo}
        onDismissToast={loop.dismissToast}
        restSince={null}
        onDismissRest={loop.clearRest}
      />
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Log loop: save / undo / delete / rest timer                         */
/* ------------------------------------------------------------------ */

type Toast = { id: string; label: string; isPr: boolean };

function useLogLoop(qrSlug: string, { rest }: { rest: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [restSince, setRestSince] = useState<number | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), UNDO_WINDOW_MS);
    return () => clearTimeout(t);
  }, [toast]);

  function save(label: string, run: () => Promise<LoggedSet>) {
    setErr(null);
    startTransition(async () => {
      try {
        const res = await run();
        haptic(res.isPr ? [12, 60, 12] : 10);
        setToast({ id: res.id, label, isPr: res.isPr });
        setFreshId(res.id);
        if (rest) setRestSince(Date.now());
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Could not save');
      }
    });
  }

  function remove(setId: string) {
    setErr(null);
    startTransition(async () => {
      try {
        await deleteSet({ setId, qrSlug });
        setToast((t) => (t?.id === setId ? null : t));
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Could not delete');
      }
    });
  }

  return {
    pending,
    err,
    setErr,
    toast,
    freshId,
    restSince,
    save,
    remove,
    undo: () => {
      if (!toast) return;
      remove(toast.id);
      setRestSince(null);
    },
    dismissToast: () => setToast(null),
    clearRest: () => setRestSince(null),
  };
}

/** Keeps the screen awake while the log view is open (re-acquired on return). */
function useWakeLock() {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    async function acquire() {
      if (document.visibilityState !== 'visible') return;
      try {
        const next = await navigator.wakeLock.request('screen');
        if (cancelled) void next.release();
        else lock = next;
      } catch {
        /* low battery / not allowed — fine */
      }
    }
    const onVisible = () => void acquire();
    void acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release().catch(() => {});
    };
  }, []);
}

function haptic(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported (iOS) */
  }
}

/**
 * Splits a member's sets into the in-progress session (last set within the
 * session gap of now) and completed prior sessions, oldest → newest.
 */
function splitSessions(sets: Set[]): { today: Session | null; prior: Session[] } {
  const sessions = groupIntoSessions(sets, 2);
  const last = sessions[sessions.length - 1];
  if (last && Date.now() - new Date(last.endedAt).getTime() <= SESSION_GAP_MS) {
    return { today: last, prior: sessions.slice(0, -1) };
  }
  return { today: null, prior: sessions };
}

/* ------------------------------------------------------------------ */
/* Log view sections                                                   */
/* ------------------------------------------------------------------ */

function LastTimeCard({
  session,
  timezone,
  empty,
  format,
}: {
  session: Session | null;
  timezone: string;
  empty: string;
  format: (s: Set) => string;
}) {
  return (
    <section className="mt-6 p-4 rounded-card bg-surface border border-line">
      <div className="flex items-baseline justify-between gap-2">
        <Kicker>Last time</Kicker>
        {session && (
          <span className="text-xs text-muted-strong tabular-nums">
            {formatLocal(session.startedAt, timezone, 'EEE MMM d')}
          </span>
        )}
      </div>
      {session ? (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xl font-display tabular-nums">
          {session.sets.map((s) => (
            <li key={s.id}>{format(s)}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-muted-strong text-sm">{empty}</p>
      )}
    </section>
  );
}

function TodayList({
  session,
  freshId,
  format,
  onDelete,
  pending,
}: {
  session: Session | null;
  freshId: string | null;
  format: (s: Set) => string;
  onDelete: (id: string) => void;
  pending: boolean;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  if (!session) return null;
  // Newest on top: the set you just did is the one you want to see.
  const rows = session.sets.map((s, i) => ({ s, n: i + 1 })).reverse();
  return (
    <section className="mt-8">
      <Kicker className="mb-2">
        Today · {session.sets.length} {session.sets.length === 1 ? 'set' : 'sets'}
      </Kicker>
      <ul className="divide-y divide-line border-y border-line">
        {rows.map(({ s, n }) => (
          <li
            key={s.id}
            className={[
              'flex items-center justify-between gap-3 min-h-14',
              s.id === freshId ? 'animate-set-in' : '',
            ].join(' ')}
          >
            <span className="flex items-baseline gap-3">
              <span className="w-5 text-xs text-muted tabular-nums">{n}</span>
              <span className="text-lg font-display tabular-nums">{format(s)}</span>
            </span>
            {confirmId === s.id ? (
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setConfirmId(null);
                    onDelete(s.id);
                  }}
                  className="min-h-11 px-3 text-sm font-semibold text-danger"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmId(null)}
                  className="min-h-11 px-3 text-sm text-muted-strong"
                >
                  Keep
                </button>
              </span>
            ) : (
              <button
                type="button"
                aria-label={`Remove set ${n}`}
                onClick={() => setConfirmId(s.id)}
                className="h-11 w-11 -mr-2 flex items-center justify-center text-muted hover:text-ink"
              >
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function RecentHistory({
  sessions,
  timezone,
  format,
}: {
  sessions: Session[];
  timezone: string;
  format: (s: Set) => string;
}) {
  if (sessions.length === 0) return null;
  const rows = [...sessions].reverse().slice(0, 6);
  return (
    <section className="mt-8">
      <Kicker className="mb-2">Earlier</Kicker>
      <ul className="divide-y divide-line border-y border-line">
        {rows.map((session) => (
          <li key={session.startedAt} className="flex items-start justify-between gap-4 py-3">
            <span className="shrink-0 text-xs text-muted-strong tabular-nums pt-1">
              {formatLocal(session.startedAt, timezone, 'MMM d')}
            </span>
            <span className="flex flex-wrap justify-end gap-1.5">
              {session.sets.map((s) => (
                <span
                  key={s.id}
                  className="px-2 py-0.5 rounded-sm bg-surface-2 text-sm tabular-nums"
                >
                  {format(s)}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function LogFooter({ memberName }: { memberName: string | null }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

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
    <div className="mt-10 flex items-center justify-center gap-1 text-xs text-muted-strong">
      <span>{memberName ?? 'You'}</span>
      <span aria-hidden>·</span>
      <Link href="/me/stats" className="min-h-11 inline-flex items-center px-2 underline underline-offset-4">
        My stats
      </Link>
      <span aria-hidden>·</span>
      <button type="button" onClick={onSignOut} className="min-h-11 px-2 underline underline-offset-4">
        Sign out
      </button>
    </div>
  );
}

/**
 * Sticky bottom bar: Save (primary) + Next machine (once today has a set),
 * with the undo toast and rest timer stacked above it. Lives in the thumb zone
 * and never gets covered by scroll position.
 */
function ActionBar({
  saveLabel,
  pending,
  showNext,
  toast,
  onUndo,
  onDismissToast,
  restSince,
  onDismissRest,
}: {
  saveLabel: string;
  pending: boolean;
  showNext: boolean;
  toast: Toast | null;
  onUndo: () => void;
  onDismissToast: () => void;
  restSince: number | null;
  onDismissRest: () => void;
}) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/90 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="relative mx-auto max-w-md px-5 pt-3 pb-3">
        {toast && (
          <div
            role="status"
            className="animate-toast-in absolute inset-x-5 bottom-full mb-3 flex items-center justify-between gap-3 rounded-card bg-surface border border-line pl-4 pr-1 shadow-lg shadow-black/30"
          >
            <span className="flex items-center gap-2 min-w-0 py-2">
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-success" aria-hidden>
                <path d="M5 12l5 5L20 7" />
              </svg>
              <span className="text-sm truncate">
                Saved <span className="font-semibold tabular-nums">{toast.label}</span>
              </span>
              {toast.isPr && (
                <span className="shrink-0 rounded-sm bg-accent px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-accent-ink">
                  New PR
                </span>
              )}
            </span>
            <span className="flex shrink-0">
              <button
                type="button"
                onClick={onUndo}
                disabled={pending}
                className="min-h-11 px-3 text-sm font-semibold text-accent"
              >
                Undo
              </button>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={onDismissToast}
                className="h-11 w-9 flex items-center justify-center text-muted"
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </span>
          </div>
        )}

        {restSince != null && <RestTimer since={restSince} onDismiss={onDismissRest} />}

        <div className="flex gap-2">
          <PrimaryButton type="submit" form="log-form" disabled={pending} large>
            {saveLabel}
          </PrimaryButton>
          {showNext && (
            <Link
              href="/scan"
              className="shrink-0 flex flex-col items-center justify-center gap-0.5 px-4 rounded bg-surface border border-line text-xs font-medium text-ink hover:border-muted transition-colors"
            >
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 8V6a2 2 0 0 1 2-2h2" />
                <path d="M20 8V6a2 2 0 0 0-2-2h-2" />
                <path d="M4 16v2a2 2 0 0 0 2 2h2" />
                <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
                <path d="M4 12h16" />
              </svg>
              Next
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function RestTimer({ since, onDismiss }: { since: number; onDismiss: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const buzzed = useRef(false);

  useEffect(() => {
    buzzed.current = false;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [since]);

  const elapsed = Math.max(0, Math.floor((now - since) / 1000));
  const ready = elapsed >= REST_TARGET_SECONDS;
  useEffect(() => {
    if (ready && !buzzed.current) {
      buzzed.current = true;
      haptic([80, 80, 80]);
    }
  }, [ready]);

  return (
    <div className="mb-2 flex items-center justify-between">
      <span className="flex items-baseline gap-2">
        <Kicker>Rest</Kicker>
        <span
          className={`font-display text-lg tabular-nums ${ready ? 'text-accent' : 'text-ink'}`}
          aria-live="off"
        >
          {formatDuration(elapsed)}
        </span>
        {ready && <span className="text-xs text-muted-strong">Ready when you are</span>}
      </span>
      <button
        type="button"
        onClick={onDismiss}
        className="min-h-9 px-2 text-xs text-muted-strong underline underline-offset-4"
      >
        Hide
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Themed components                                                   */
/* ------------------------------------------------------------------ */

function Header({
  equipment,
  gymName,
  brand,
}: {
  equipment: Equipment;
  gymName: string;
  /** Show the RepetoIQ mark — only on sign-in screens, where trust matters. */
  brand?: boolean;
}) {
  return (
    <header className="pt-2">
      {brand && (
        <Image
          src="/repetoIQicon.png"
          alt="RepetoIQ"
          width={32}
          height={32}
          className="mb-5 h-8 w-8"
        />
      )}
      <Kicker className="mb-2 truncate">
        {[equipment.machine_label, gymName].filter(Boolean).join(' · ')}
      </Kicker>
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
    </header>
  );
}

function Kicker({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={[
        'block font-mono text-[10px] tracking-[0.2em] uppercase text-muted-strong font-medium',
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}

const BIG_NUMBER = [
  'font-display text-accent leading-none tabular-nums',
  'halogen:text-5xl halogen:italic halogen:font-medium halogen:tracking-[-0.025em]',
  'concrete:text-6xl concrete:font-black concrete:tracking-[-0.005em]',
  'locker:text-4xl locker:font-semibold locker:tracking-[-0.025em]',
  'athletic:text-6xl athletic:italic athletic:font-black athletic:tracking-[-0.04em]',
].join(' ');

function SuggestedNum({ suggestion }: { suggestion: Suggestion }) {
  if (suggestion.kind === 'first-time') {
    return <p className="mt-1 text-lg text-muted-strong">{describeSuggestion(suggestion)}</p>;
  }
  return (
    <div className="mt-2">
      <p className="flex items-baseline gap-2">
        <span className={BIG_NUMBER}>
          {fmtWeight(suggestion.weight)} × {suggestion.reps}
        </span>
        <span className="text-sm text-muted-strong">lbs</span>
      </p>
      <p className="mt-2 text-sm text-muted-strong">{describeSubLabel(suggestion)}</p>
    </div>
  );
}

function describeSubLabel(s: Suggestion): string {
  if (s.kind === 'increase-weight') return 'Add five, hold reps. Chase the PR.';
  if (s.kind === 'add-rep') return 'Same weight, push for one more.';
  if (s.kind === 'deload')
    return `Same top set ${s.stalledSessions} sessions running. Drop ~10% and rebuild.`;
  return '';
}

function CardioSuggestionDisplay({ suggestion }: { suggestion: CardioSuggestion }) {
  if (suggestion.kind === 'first-time') {
    return <p className="mt-1 text-lg text-muted-strong">{describeCardioSuggestion(suggestion)}</p>;
  }
  return (
    <div className="mt-2">
      <p className="flex items-baseline gap-3 flex-wrap">
        <span className={BIG_NUMBER}>{formatDuration(suggestion.durationSeconds)}</span>
        {suggestion.distanceMeters != null && (
          <span className="text-sm text-muted-strong">
            {formatMiles(suggestion.distanceMeters)} mi
          </span>
        )}
      </p>
      <p className="mt-2 text-sm text-muted-strong">Hold the pace, push the time.</p>
    </div>
  );
}

function PrimaryButton({
  children,
  disabled,
  type = 'button',
  large,
  form,
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: 'submit' | 'button';
  large?: boolean;
  form?: string;
}) {
  return (
    <button
      type={type}
      form={form}
      disabled={disabled}
      className={[
        'w-full rounded font-semibold transition disabled:opacity-50 active:scale-[0.99]',
        'bg-accent text-accent-ink hover:opacity-90',
        large ? 'min-h-16 px-4 text-lg' : 'min-h-14 px-4 text-base',
        // Theme-specific casing/style
        'concrete:font-black concrete:uppercase concrete:tracking-[0.05em]',
        'athletic:font-black athletic:italic athletic:uppercase athletic:tracking-[0.03em]',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full min-h-12 px-4 rounded bg-surface border border-line text-sm font-medium hover:border-muted transition-colors"
    >
      {children}
    </button>
  );
}

function ErrorText({ err }: { err: string | null }) {
  if (!err) return null;
  return (
    <p role="alert" className="text-sm text-danger">
      {err}
    </p>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
  type = 'text',
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  type?: 'text' | 'email';
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm text-muted-strong mb-1.5">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        inputMode={type === 'email' ? 'email' : undefined}
        autoCapitalize={type === 'email' ? 'off' : 'words'}
        spellCheck={type === 'email' ? false : undefined}
        className="w-full px-4 py-4 text-lg rounded bg-surface border border-line text-ink placeholder:text-muted focus:border-accent focus:outline-none"
      />
    </label>
  );
}

/**
 * Weight / reps entry. Big −/+ buttons for the common case (adjust the
 * pre-filled number without opening the keyboard); the number itself is
 * still a text input for anything the steppers can't reach quickly.
 */
function Stepper({
  label,
  unit,
  value,
  onChange,
  step,
  mode,
}: {
  label: string;
  unit?: string;
  value: string;
  onChange: (v: string) => void;
  step: number;
  mode: 'decimal' | 'numeric';
}) {
  function bump(dir: 1 | -1) {
    const n = Number(value);
    const base = Number.isFinite(n) ? n : 0;
    const next = Math.max(0, base + dir * step);
    onChange(mode === 'numeric' ? String(Math.round(next)) : fmtWeight(next));
    haptic(5);
  }
  const btn =
    'h-16 w-16 shrink-0 flex items-center justify-center rounded bg-surface border border-line text-ink text-2xl active:bg-surface-2 active:scale-95 transition';
  return (
    <div>
      <Kicker className="mb-1.5">
        {label}
        {unit ? ` · ${unit}` : ''}
      </Kicker>
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`${label} minus ${step}`} onClick={() => bump(-1)} className={btn}>
          −
        </button>
        <input
          type="text"
          inputMode={mode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          placeholder="0"
          aria-label={label}
          className={[
            'min-w-0 flex-1 h-16 text-center tabular-nums rounded bg-surface border border-line text-ink',
            'focus:border-accent focus:outline-none placeholder:text-muted',
            'text-3xl font-display',
            'concrete:text-4xl concrete:font-black',
            'athletic:font-black athletic:italic',
          ].join(' ')}
        />
        <button type="button" aria-label={`${label} plus ${step}`} onClick={() => bump(1)} className={btn}>
          +
        </button>
      </div>
    </div>
  );
}

function NumericInputBare({
  value,
  onChange,
  placeholder,
  mode,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  mode: 'decimal' | 'numeric';
  ariaLabel: string;
}) {
  return (
    <input
      type="text"
      inputMode={mode}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={(e) => e.currentTarget.select()}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={[
        'min-w-0 flex-1 h-16 px-4 tabular-nums rounded bg-surface border border-line text-ink',
        'focus:border-accent focus:outline-none placeholder:text-muted',
        'text-3xl font-display',
        'concrete:text-4xl concrete:font-black',
        'athletic:font-black athletic:italic',
      ].join(' ')}
    />
  );
}

/**
 * Four-box passcode entry. One real input sits invisibly over the boxes so
 * paste, autofill, and the numeric keypad all behave natively.
 */
function PinInput({
  label,
  value,
  onChange,
  autoFocus,
  reveal = false,
  onToggleReveal,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  reveal?: boolean;
  onToggleReveal?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm text-muted-strong">{label}</span>
        {onToggleReveal && (
          <button
            type="button"
            onClick={onToggleReveal}
            className="min-h-9 px-1 text-xs text-muted-strong underline underline-offset-4"
          >
            {reveal ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      <div className="relative">
        <div className="grid grid-cols-4 gap-2" aria-hidden>
          {[0, 1, 2, 3].map((i) => {
            const ch = value[i];
            const active = focused && i === Math.min(value.length, 3);
            return (
              <div
                key={i}
                className={[
                  'h-16 flex items-center justify-center rounded bg-surface border text-3xl font-display tabular-nums transition-colors',
                  active ? 'border-accent' : 'border-line',
                ].join(' ')}
              >
                {ch ? (reveal ? ch : '•') : ''}
              </div>
            );
          })}
        </div>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-label={label}
          maxLength={4}
          pattern="\d{4}"
          value={value}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
          className="absolute inset-0 w-full h-full opacity-0 text-base caret-transparent"
        />
      </div>
    </div>
  );
}

function rememberName(name: string) {
  try {
    localStorage.setItem('reptag_member_name', name);
  } catch {
    /* private mode */
  }
}

function fmtStrength(s: Set): string {
  return s.weight != null && s.reps != null ? `${fmtWeight(Number(s.weight))} × ${s.reps}` : '—';
}

function fmtCardio(s: Set): string {
  if (s.duration_seconds == null) return '—';
  const dur = formatDuration(Number(s.duration_seconds));
  if (s.distance_meters == null) return dur;
  return `${dur} · ${formatMiles(Number(s.distance_meters))} mi`;
}
