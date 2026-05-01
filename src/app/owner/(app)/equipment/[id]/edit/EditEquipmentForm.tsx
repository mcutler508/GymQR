'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { deleteEquipment, updateEquipment } from '../../../../actions';
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
  setsCount: number;
};

export function EditEquipmentForm({ id, initial, setsCount }: Props) {
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

  function onDelete() {
    const msg =
      setsCount > 0
        ? `Delete "${initial.name}"? This will also remove ${setsCount} logged ${
            setsCount === 1 ? 'set' : 'sets'
          } from member history. This cannot be undone.`
        : `Delete "${initial.name}"? This cannot be undone.`;
    if (!confirm(msg)) return;
    setErr(null);
    setSaved(false);
    startTransition(async () => {
      const res = await deleteEquipment({ id });
      if (!res.ok) return setErr(res.error);
      router.push('/owner/equipment');
    });
  }

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

      <div className="mt-8 pt-6 border-t border-neutral-900">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-500 mb-2">
          Danger zone
        </p>
        <p className="text-xs text-neutral-500 mb-3">
          {setsCount > 0
            ? `Deleting also removes ${setsCount} logged ${
                setsCount === 1 ? 'set' : 'sets'
              } from member history.`
            : 'No sets logged yet on this machine.'}
        </p>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="px-4 py-2 rounded-lg border border-red-900 text-red-300 text-sm hover:bg-red-950 hover:border-red-800 transition disabled:opacity-50"
        >
          Delete equipment
        </button>
      </div>
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
