'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createEquipment } from '../../../actions';
import { ExercisePicker } from '../ExercisePicker';
import type { EquipmentType } from '@/lib/supabase';

type FormType = Exclude<EquipmentType, 'cardio'>;

export function NewEquipmentForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [machineLabel, setMachineLabel] = useState('');
  const [equipmentType, setEquipmentType] = useState<FormType>('strength_single');
  const [exercises, setExercises] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    if (equipmentType === 'strength_multi' && exercises.length === 0) {
      return setErr('Add at least one exercise for a multi-exercise machine.');
    }
    startTransition(async () => {
      const res = await createEquipment({
        name,
        machineLabel,
        equipmentType,
        exercises,
      });
      if (!res.ok) return setErr(res.error);
      router.push(`/owner/equipment/${res.id}/qr`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
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

      <fieldset className="space-y-2">
        <legend className="text-sm text-neutral-400 mb-1">Equipment type</legend>
        <TypeRadio
          checked={equipmentType === 'strength_single'}
          onSelect={() => setEquipmentType('strength_single')}
          label="Single exercise"
          hint="One movement only (e.g. Leg Press, Bench Press)."
        />
        <TypeRadio
          checked={equipmentType === 'strength_multi'}
          onSelect={() => setEquipmentType('strength_multi')}
          label="Multi-exercise"
          hint="Members pick the exercise on scan (cable stack, dumbbell rack, multi-purpose bench)."
        />
        <p className="text-xs text-neutral-600 pt-1">
          Cardio equipment support is coming soon.
        </p>
      </fieldset>

      {equipmentType === 'strength_multi' && (
        <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-950 space-y-3">
          <p className="text-sm text-neutral-300 font-medium">Exercises on this machine</p>
          <ExercisePicker value={exercises} onChange={setExercises} />
        </div>
      )}

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

function TypeRadio({
  checked,
  onSelect,
  label,
  hint,
}: {
  checked: boolean;
  onSelect: () => void;
  label: string;
  hint: string;
}) {
  return (
    <label
      className={[
        'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition',
        checked
          ? 'border-neutral-400 bg-neutral-900'
          : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700',
      ].join(' ')}
    >
      <input
        type="radio"
        name="equipment_type"
        checked={checked}
        onChange={onSelect}
        className="mt-1 h-4 w-4"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-neutral-500 mt-0.5">{hint}</span>
      </span>
    </label>
  );
}
