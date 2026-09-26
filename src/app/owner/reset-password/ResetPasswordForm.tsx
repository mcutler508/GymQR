'use client';

import { useEffect, useMemo, useState, useTransition, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Field } from '../_components/field';
import { SubmitButton } from '../_components/submit-button';

/**
 * Runs in the browser with a cookie-backed Supabase client, so it shares the
 * session that /owner/auth/confirm set. Also accepts the older implicit-flow
 * link shape (`#access_token=…&type=recovery`, forwarded here from the landing
 * page), which never reaches the server because it lives in the URL hash.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );
  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get('access_token');
      const refreshToken = hash.get('refresh_token');
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        // Strip tokens from the address bar / history.
        window.history.replaceState(null, '', window.location.pathname);
      }
      const { data } = await supabase.auth.getUser();
      setStatus(data.user ? 'ready' : 'invalid');
    })();
  }, [supabase]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    if (password.length < 8) return setErr('Password must be at least 8 characters.');
    if (password !== confirm) return setErr('Passwords don’t match.');
    startTransition(async () => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return setErr(error.message);
      router.push('/owner');
      router.refresh();
    });
  }

  if (status === 'checking') {
    return <p className="text-sm text-zinc-500">Checking your reset link…</p>;
  }

  if (status === 'invalid') {
    return (
      <p className="text-sm leading-relaxed text-zinc-300">
        This reset link is invalid or has expired.{' '}
        <Link href="/owner/forgot-password" className="text-white underline underline-offset-4">
          Request a new one
        </Link>
        .
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-7">
      <Field
        label="New password"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        autoFocus
      />
      <Field
        label="Confirm password"
        type="password"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
      />

      <div className="pt-2">
        <SubmitButton pending={pending} pendingLabel="Saving…">
          Save and sign in
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
