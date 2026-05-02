'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ALL_COLUMNS,
  type ColumnDef,
  type ColumnId,
  type EquipmentTableRow,
} from '@/lib/equipment-columns';

type SortDir = 'asc' | 'desc';

type Props = {
  rows: EquipmentTableRow[];
  columnIds: ColumnId[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  allChecked: boolean;
  someChecked: boolean;
};

export function TableView({
  rows,
  columnIds,
  selected,
  onToggle,
  onToggleAll,
  allChecked,
  someChecked,
}: Props) {
  const [sortBy, setSortBy] = useState<ColumnId>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const cols = useMemo<ColumnDef[]>(
    () => columnIds.map((id) => ALL_COLUMNS.find((c) => c.id === id)!).filter(Boolean),
    [columnIds],
  );

  const sortedRows = useMemo<EquipmentTableRow[]>(() => {
    const def = ALL_COLUMNS.find((c) => c.id === sortBy);
    if (!def) return rows;
    const out = [...rows];
    out.sort((a, b) => {
      const av = def.sortValue(a);
      const bv = def.sortValue(b);
      if (av === bv) return 0;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return out;
  }, [rows, sortBy, sortDir]);

  function clickHeader(id: ColumnId) {
    if (sortBy === id) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(id);
      setSortDir('asc');
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-800">
      <table className="w-full text-sm">
        <thead className="bg-neutral-950 text-neutral-400">
          <tr>
            <th className="px-3 py-2 w-10 text-left">
              <input
                type="checkbox"
                checked={allChecked}
                ref={(el) => {
                  if (el) el.indeterminate = someChecked;
                }}
                onChange={onToggleAll}
                className="h-4 w-4 accent-white align-middle"
                aria-label="Select all equipment"
              />
            </th>
            {cols.map((c) => {
              const active = sortBy === c.id;
              return (
                <th
                  key={c.id}
                  className={[
                    'px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] whitespace-nowrap',
                    c.align === 'right' ? 'text-right' : 'text-left',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    onClick={() => clickHeader(c.id)}
                    className={[
                      'inline-flex items-center gap-1 hover:text-neutral-200',
                      active ? 'text-neutral-200' : '',
                    ].join(' ')}
                  >
                    <span>{c.label}</span>
                    <span className="text-neutral-600">
                      {active ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                    </span>
                  </button>
                </th>
              );
            })}
            <th className="px-3 py-2 text-right whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.18em]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((r) => {
            const checked = selected.has(r.id);
            return (
              <tr
                key={r.id}
                className={[
                  'border-t border-neutral-800 transition',
                  checked ? 'bg-neutral-900' : 'hover:bg-neutral-950',
                  r.status === 'inactive' ? 'text-neutral-500' : 'text-neutral-200',
                ].join(' ')}
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(r.id)}
                    className="h-4 w-4 accent-white align-middle"
                    aria-label={`Select ${r.name}`}
                  />
                </td>
                {cols.map((c) => (
                  <td
                    key={c.id}
                    className={[
                      'px-3 py-2 whitespace-nowrap',
                      c.align === 'right' ? 'text-right tabular-nums' : 'text-left',
                      c.id === 'name' ? 'font-medium text-neutral-100' : '',
                    ].join(' ')}
                  >
                    {c.render(r)}
                  </td>
                ))}
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <div className="inline-flex gap-2">
                    <Link
                      href={`/owner/equipment/${r.id}/qr`}
                      className="px-2.5 py-1 text-xs rounded-md bg-white text-black font-medium"
                    >
                      QR
                    </Link>
                    <Link
                      href={`/owner/equipment/${r.id}/edit`}
                      className="px-2.5 py-1 text-xs rounded-md border border-neutral-700 text-neutral-200"
                    >
                      Edit
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
