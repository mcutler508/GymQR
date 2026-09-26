'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { requestOwnerPasswordReset } from '../actions';
import { Field } from '../_components/field';
import { SubmitButton } from '../_components/submit-button';

export function ForgotPasswordForm({ expired }: { expired: boolean }) {
  const [email, setEmail] = useState('');
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(
    expired ? 'That reset link is invalid or has expired. Request a new one.' : null,
  );
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      const res = await requestOwnerPasswordReset({ email });
      if (!res.ok) return setErr(res.error);
      setSent(true);
    });
  }

  if (sent) {
    return (
      <p className="text-sm leading-relaxed text-zinc-300">
        If an account exists for <span className="text-white">{email}</span>, a reset link is on
        its way. Open it on this device — it expires in one hour.
      </p>
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

      <div className="pt-2">
        <SubmitButton pending={pending} pendingLabel="Sending…">
          Send reset link
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
