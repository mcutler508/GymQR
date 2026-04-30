'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateGymTimezone } from '../../actions';
import { COMMON_TIMEZONES } from '@/lib/timezone';

export function TimezoneEditor({ currentTimezone }: { currentTimezone: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState(currentTimezone);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Detect the device TZ for the "Use this device's timezone" button.
  const deviceTz =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : null;

  const isInList = COMMON_TIMEZONES.some((t) => t.value === selected);
  const isCustom = !isInList;

  function save(tz: string) {
    if (pending) return;
    setSelected(tz);
    setMsg(null);
    setErr(null);
    startTransition(async () => {
      const res = await updateGymTimezone({ timezone: tz });
      if (!res.ok) {
        setErr(res.error);
        setSelected(currentTimezone);
        return;
      }
      setMsg(`Saved · ${tz}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="block text-sm text-neutral-400 mb-2">Gym timezone</span>
        <select
          value={isCustom ? '__custom__' : selected}
          onChange={(e) => {
            if (e.target.value === '__custom__') return;
            save(e.target.value);
          }}
          disabled={pending}
          className="w-full max-w-md px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 focus:border-neutral-500 focus:outline-none disabled:opacity-50"
        >
          {isCustom && (
            <option value="__custom__">{selected} (current — not in common list)</option>
          )}
          {COMMON_TIMEZONES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label} — {t.value}
            </option>
          ))}
        </select>
      </label>

      {deviceTz && deviceTz !== selected && (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-neutral-500">This device is in {deviceTz}.</span>
          <button
            type="button"
            onClick={() => save(deviceTz)}
            disabled={pending}
            className="text-neutral-300 underline hover:text-white disabled:opacity-50"
          >
            Use that
          </button>
        </div>
      )}

      {msg && <p className="text-sm text-emerald-400">{msg}</p>}
      {err && <p className="text-sm text-red-400">Couldn&apos;t save: {err}</p>}
    </div>
  );
}
