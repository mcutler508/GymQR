'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { updateEquipment } from '../../../../actions';
import { ExercisePicker } from '../../ExercisePicker';
import type { EquipmentType } from '@/lib/supabase';

type Props = {
  id: string;
  initial: {
    name: string;
    machineLabel: string;
    status: 'active' | 'inactive';
    equipmentType: EquipmentType;
    exercises: string[];
  };
};

export function EditEquipmentForm({ id, initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [machineLabel, setMachineLabel] = useState(initial.machineLabel);
  const [status, setStatus] = useState<'active' | 'inactive'>(initial.status);
  const [equipmentType, setEquipmentType] = useState<EquipmentType>(initial.equipmentType);
  const [exercises, setExercises] = useState<string[]>(initial.exercises);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const willConvertToMulti =
    initial.equipmentType === 'strength_single' && equipmentType === 'strength_multi';

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setSaved(false);
    if (equipmentType === 'strength_multi' && exercises.length === 0) {
      return setErr('Add at least one exercise for a multi-exercise machine.');
    }
    startTransition(async () => {
      const res = await updateEquipment({
        id,
        name,
        machineLabel,
        status,
        equipmentType,
        exercises,
      });
      if (!res.ok) return setErr(res.error);
      setSaved(true);
      router.refresh();
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

      <fieldset className="space-y-2">
        <legend className="text-sm text-neutral-400 mb-1">Equipment type</legend>
        <TypeRadio
          checked={equipmentType === 'strength_single'}
          onSelect={() => setEquipmentType('strength_single')}
          label="Single exercise"
          hint="One movement only."
        />
        <TypeRadio
          checked={equipmentType === 'strength_multi'}
          onSelect={() => setEquipmentType('strength_multi')}
          label="Multi-exercise"
          hint="Members pick the exercise on scan."
        />
        <TypeRadio
          checked={equipmentType === 'cardio'}
          onSelect={() => setEquipmentType('cardio')}
          label="Cardio"
          hint="Treadmill, bike, rower, climber. Members log duration and optional distance."
        />
      </fieldset>

      {equipmentType === 'strength_multi' && (
        <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-950 space-y-3">
          <p className="text-sm text-neutral-300 font-medium">Exercises on this machine</p>
          <ExercisePicker value={exercises} onChange={setExercises} />
          {willConvertToMulti && (
            <p className="text-xs text-amber-400">
              Existing logged sets on this machine will be tagged as &quot;{initial.name}&quot;
              so PRs stay attached when you switch to multi-exercise.
            </p>
          )}
        </div>
      )}

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
