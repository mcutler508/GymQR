'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signUpOwner } from '../actions';
import { Field } from '../_components/field';
import { SubmitButton } from '../_components/submit-button';

export function SignUpForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gymName, setGymName] = useState('');
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const timezone = (() => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
      } catch {
        return undefined;
      }
    })();
    startTransition(async () => {
      const res = await signUpOwner({ email, password, gymName, timezone });
      if (!res.ok) return setErr(res.error);
      if (res.needsEmailConfirm) {
        setNeedsConfirm(true);
      } else {
        router.push('/owner');
        router.refresh();
      }
    });
  }

  if (needsConfirm) {
    return (
      <div className="border-l-2 border-white/40 pl-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">
          Almost there
        </div>
        <p className="mt-3 font-display text-2xl leading-tight text-white">
          Check your inbox.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          We sent a confirmation link to{' '}
          <span className="text-white">{email}</span>. Click it, then sign in to walk
          the floor.
        </p>
        <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-600">
          Demo tip — disable email confirmation in Supabase &rsaquo; Auth &rsaquo; Providers.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-7">
      <Field
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        autoFocus
      />
      <Field
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
      />
      <Field
        label="Gym name"
        value={gymName}
        onChange={setGymName}
        placeholder="Iron House"
      />

      <div className="pt-2">
        <SubmitButton pending={pending} pendingLabel="Opening doors…">
          Create account
        </SubmitButton>
      </div>

      {err && (
        <p
          className="border-l-2 border-white/40 pl-3 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-300"
          role="alert"
        >
          {err}
        </p>
      )}
    </form>
  );
}
