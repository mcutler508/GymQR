'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signUpOwner } from '../actions';

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
    startTransition(async () => {
      const res = await signUpOwner({ email, password, gymName });
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
      <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 text-sm">
        <p className="font-medium">Check your inbox</p>
        <p className="mt-1 text-neutral-400">
          We sent a confirmation link to <span className="text-neutral-200">{email}</span>. Click it,
          then sign in to manage your gym.
        </p>
        <p className="mt-3 text-xs text-neutral-500">
          (Email confirmation can be turned off in Supabase &rsaquo; Authentication &rsaquo; Providers
          for a smoother demo.)
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" autoFocus />
      <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
      <Field label="Your gym's name" value={gymName} onChange={setGymName} placeholder="Iron House Gym" />
      <button
        type="submit"
        disabled={pending}
        className="w-full px-4 py-4 text-lg font-semibold rounded-lg bg-white text-black disabled:opacity-50"
      >
        {pending ? 'Creating…' : 'Create account'}
      </button>
      {err && <p className="text-sm text-red-400">{err}</p>}
    </form>
  );
}

function Field({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoFocus,
  autoComplete,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm text-neutral-400 mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        className="w-full px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-800 focus:border-neutral-500 focus:outline-none"
      />
    </label>
  );
}
