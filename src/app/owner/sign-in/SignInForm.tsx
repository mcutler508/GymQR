'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signInOwner } from '../actions';
import { Field } from '../_components/field';
import { SubmitButton } from '../_components/submit-button';

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      const res = await signInOwner({ email, password });
      if (!res.ok) return setErr(res.error);
      router.push('/owner');
      router.refresh();
    });
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
        autoComplete="current-password"
      />

      <div className="pt-2">
        <SubmitButton pending={pending} pendingLabel="Signing in…">
          Sign in
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
