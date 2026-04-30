'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signInOwner } from '../actions';

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
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="block text-sm text-neutral-400 mb-1">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoFocus
          className="w-full px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-800 focus:border-neutral-500 focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="block text-sm text-neutral-400 mb-1">Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="w-full px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-800 focus:border-neutral-500 focus:outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full px-4 py-4 text-lg font-semibold rounded-lg bg-white text-black disabled:opacity-50"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
      {err && <p className="text-sm text-red-400">{err}</p>}
    </form>
  );
}
