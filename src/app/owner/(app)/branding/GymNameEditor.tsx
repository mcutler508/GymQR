'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateGymName } from '../../actions';

export function GymNameEditor({ currentName }: { currentName: string }) {
  const router = useRouter();
  const [value, setValue] = useState(currentName);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const trimmed = value.trim();
  const dirty = trimmed.length > 0 && trimmed !== currentName;

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (pending || !dirty) return;
    setMsg(null);
    setErr(null);
    startTransition(async () => {
      const res = await updateGymName({ name: trimmed });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setMsg(`Saved · ${res.name}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <label className="block">
        <span className="block text-sm text-neutral-400 mb-2">Gym name</span>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={80}
          disabled={pending}
          className="w-full max-w-md px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 focus:border-neutral-500 focus:outline-none disabled:opacity-50"
        />
      </label>

      <button
        type="submit"
        disabled={pending || !dirty}
        className="px-4 py-2 rounded-lg bg-neutral-100 text-neutral-900 text-sm font-medium hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {pending ? 'Saving…' : 'Save'}
      </button>

      {msg && <p className="text-sm text-emerald-400">{msg}</p>}
      {err && <p className="text-sm text-red-400">Couldn&apos;t save: {err}</p>}
    </form>
  );
}
