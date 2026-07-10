'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { resetPasscodeAction } from './actions';

export function ResetForm({ token }: { token: string }) {
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
        await resetPasscodeAction({ token, passcode });
        router.push('/scan');
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Could not reset passcode.');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PasscodeField
        label="New 4-digit passcode"
        value={passcode}
        onChange={setPasscode}
        autoFocus
      />
      <PasscodeField label="Confirm passcode" value={confirm} onChange={setConfirm} />
      <button
        type="submit"
        disabled={pending || !passcode || !confirm}
        className="w-full px-4 py-4 rounded bg-accent text-accent-ink font-semibold disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Save passcode'}
      </button>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <p className="text-xs text-muted text-center">
        After you save, you’ll be signed in and can go back to scanning.
      </p>
    </form>
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
