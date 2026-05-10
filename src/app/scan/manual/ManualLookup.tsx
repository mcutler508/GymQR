'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type EquipmentRow = {
  id: string;
  name: string;
  machine_label: string | null;
  qr_slug: string;
};

export function ManualLookup({ equipment }: { equipment: EquipmentRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const filtered = useMemo<EquipmentRow[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return equipment;
    return equipment.filter((e) => {
      const hay = `${e.name} ${e.machine_label ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, equipment]);

  return (
    <>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="e.g. Leg Press or LP-14"
        autoFocus
        className="mt-6 w-full px-4 py-4 text-lg rounded bg-surface border border-line text-ink placeholder:text-muted focus:border-accent focus:outline-none"
      />

      {equipment.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          No active equipment in your gym yet. Ask staff to add a machine.
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No matches.</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {filtered.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => router.push(`/scan/${e.qr_slug}`)}
                className="w-full text-left px-4 py-3 rounded-card bg-surface border border-line hover:border-accent transition flex items-center justify-between gap-3"
              >
                <span className="font-medium">{e.name}</span>
                {e.machine_label && (
                  <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                    {e.machine_label}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
