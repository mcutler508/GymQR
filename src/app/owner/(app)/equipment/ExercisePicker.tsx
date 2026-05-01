'use client';

import { useState } from 'react';
import { EXERCISE_CATALOG } from '@/lib/exercise-catalog';

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
};

export function ExercisePicker({ value, onChange }: Props) {
  const [category, setCategory] = useState<string>(EXERCISE_CATALOG[0].category);
  const [custom, setCustom] = useState('');

  const selectedKeys = new Set(value.map((v) => v.toLowerCase()));
  const presets =
    EXERCISE_CATALOG.find((c) => c.category === category)?.exercises ?? [];

  function toggle(name: string) {
    const key = name.toLowerCase();
    if (selectedKeys.has(key)) {
      onChange(value.filter((v) => v.toLowerCase() !== key));
    } else {
      onChange([...value, name]);
    }
  }

  function addCustom() {
    const v = custom.trim();
    if (!v) return;
    if (!selectedKeys.has(v.toLowerCase())) {
      onChange([...value, v]);
    }
    setCustom('');
  }

  function remove(name: string) {
    onChange(value.filter((v) => v !== name));
  }

  return (
    <div className="space-y-3">
      <div>
        <span className="block text-sm text-neutral-400 mb-1">Browse presets</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 focus:border-neutral-500 focus:outline-none text-sm"
        >
          {EXERCISE_CATALOG.map((c) => (
            <option key={c.category} value={c.category}>
              {c.category}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2 mt-2">
          {presets.map((name) => {
            const on = selectedKeys.has(name.toLowerCase());
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggle(name)}
                className={[
                  'px-3 py-1.5 rounded-full text-sm border transition',
                  on
                    ? 'bg-white text-black border-white'
                    : 'bg-neutral-900 text-neutral-200 border-neutral-700 hover:border-neutral-500',
                ].join(' ')}
              >
                {on ? '✓ ' : '+ '}
                {name}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <span className="block text-sm text-neutral-400 mb-1">Add custom exercise</span>
        <div className="flex gap-2">
          <input
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="e.g. Single-arm Pulldown"
            className="flex-1 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 focus:border-neutral-500 focus:outline-none text-sm"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!custom.trim()}
            className="px-4 py-2 rounded-lg border border-neutral-700 text-sm disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      <div>
        <span className="block text-sm text-neutral-400 mb-1">
          Selected ({value.length})
        </span>
        {value.length === 0 ? (
          <p className="text-xs text-neutral-500">
            Pick from presets above or add custom exercises.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {value.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-neutral-800 border border-neutral-700"
              >
                {name}
                <button
                  type="button"
                  onClick={() => remove(name)}
                  aria-label={`Remove ${name}`}
                  className="text-neutral-400 hover:text-white"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
