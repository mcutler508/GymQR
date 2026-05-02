'use client';

import Link from 'next/link';
import { fmtRelative, type EquipmentTableRow } from '@/lib/equipment-columns';

type Props = {
  rows: EquipmentTableRow[];
  selected: Set<string>;
  onToggle: (id: string) => void;
};

export function CardsView({ rows, selected, onToggle }: Props) {
  return (
    <ul className="space-y-3">
      {rows.map((e) => {
        const checked = selected.has(e.id);
        return (
          <li
            key={e.id}
            className={[
              'p-4 rounded-xl border transition',
              checked
                ? 'bg-neutral-900 border-neutral-600'
                : 'bg-neutral-900 border-neutral-800',
            ].join(' ')}
          >
            <div className="flex items-start gap-4">
              <label className="pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(e.id)}
                  className="h-4 w-4 accent-white"
                  aria-label={`Select ${e.name}`}
                />
              </label>
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {e.name}
                  {e.equipment_type === 'strength_multi' && (
                    <span className="ml-2 text-[10px] font-mono uppercase tracking-[0.15em] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 align-middle">
                      Multi · {e.exercises.length} ex
                    </span>
                  )}
                  {e.equipment_type === 'cardio' && (
                    <span className="ml-2 text-[10px] font-mono uppercase tracking-[0.15em] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 align-middle">
                      Cardio
                    </span>
                  )}
                  {e.status === 'inactive' && (
                    <span className="ml-2 text-xs uppercase tracking-wider text-neutral-500">
                      inactive
                    </span>
                  )}
                </p>
                <p className="text-sm text-neutral-400">{e.machine_label ?? '—'}</p>
                <p className="text-xs text-neutral-600 mt-1 font-mono truncate">{e.qr_slug}</p>
                <div className="flex gap-3 mt-2 text-xs text-neutral-500">
                  <span>
                    <span className="text-neutral-300 tabular-nums">{e.setCount}</span> sets
                  </span>
                  <span>
                    Last scan{' '}
                    <span className="text-neutral-300">
                      {e.lastScanAt ? fmtRelative(e.lastScanAt) : '—'}
                    </span>
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <Link
                  href={`/owner/equipment/${e.id}/qr`}
                  className="px-3 py-1.5 text-sm rounded-md bg-white text-black font-medium text-center"
                >
                  Print QR
                </Link>
                <Link
                  href={`/owner/equipment/${e.id}/edit`}
                  className="px-3 py-1.5 text-sm rounded-md border border-neutral-700 text-center"
                >
                  Edit
                </Link>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
