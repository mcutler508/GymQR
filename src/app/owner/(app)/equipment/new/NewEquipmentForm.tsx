'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createEquipment } from '../../../actions';

export function NewEquipmentForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [machineLabel, setMachineLabel] = useState('');
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      const res = await createEquipment({ name, machineLabel });
      if (!res.ok) return setErr(res.error);
      router.push(`/owner/equipment/${res.id}/qr`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="block text-sm text-neutral-400 mb-1">Equipment name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Leg Press"
          autoFocus
          className="w-full px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-800 focus:border-neutral-500 focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="block text-sm text-neutral-400 mb-1">Machine label (optional)</span>
        <input
          type="text"
          value={machineLabel}
          onChange={(e) => setMachineLabel(e.target.value)}
          placeholder="Machine 04"
          className="w-full px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-800 focus:border-neutral-500 focus:outline-none"
        />
        <span className="block mt-1 text-xs text-neutral-500">
          Helps members find the right machine if you have several of the same kind.
        </span>
      </label>
      <button
        type="submit"
        disabled={pending || !name.trim()}
        className="w-full px-4 py-4 text-lg font-semibold rounded-lg bg-white text-black disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Save & Print QR'}
      </button>
      {err && <p className="text-sm text-red-400">{err}</p>}
    </form>
  );
}
