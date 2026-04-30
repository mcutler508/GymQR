'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { updateEquipment } from '../../../../actions';

type Props = {
  id: string;
  initial: { name: string; machineLabel: string; status: 'active' | 'inactive' };
};

export function EditEquipmentForm({ id, initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [machineLabel, setMachineLabel] = useState(initial.machineLabel);
  const [status, setStatus] = useState<'active' | 'inactive'>(initial.status);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateEquipment({ id, name, machineLabel, status });
      if (!res.ok) return setErr(res.error);
      setSaved(true);
      router.refresh();
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
          className="w-full px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-800 focus:border-neutral-500 focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="block text-sm text-neutral-400 mb-1">Machine label</span>
        <input
          type="text"
          value={machineLabel}
          onChange={(e) => setMachineLabel(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-800 focus:border-neutral-500 focus:outline-none"
        />
      </label>
      <label className="flex items-center gap-3 p-3 rounded-lg bg-neutral-900 border border-neutral-800">
        <input
          type="checkbox"
          checked={status === 'active'}
          onChange={(e) => setStatus(e.target.checked ? 'active' : 'inactive')}
          className="h-5 w-5"
        />
        <span className="text-sm">
          Active <span className="text-neutral-500">(members can scan and log on this machine)</span>
        </span>
      </label>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="flex-1 px-4 py-3 rounded-lg bg-white text-black font-medium disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
        <a
          href="/owner/equipment"
          className="px-4 py-3 rounded-lg border border-neutral-700 text-sm flex items-center"
        >
          Cancel
        </a>
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}
      {saved && <p className="text-sm text-emerald-400">Saved.</p>}
    </form>
  );
}
