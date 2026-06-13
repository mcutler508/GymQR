'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ALL_COLUMNS,
  type ColumnDef,
  type ColumnId,
  type MemberStatRow,
} from '@/lib/member-stats-columns';

type SortDir = 'asc' | 'desc';

type Props = {
  rows: MemberStatRow[];
  columnIds: ColumnId[];
};

export function MachineTableView({ rows, columnIds }: Props) {
  // Default to "Last lifted" desc — most recently active machines surface
  // first, which is what a member usually wants to see.
  const [sortBy, setSortBy] = useState<ColumnId>('last_lifted');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const cols = useMemo<ColumnDef[]>(
    () => columnIds.map((id) => ALL_COLUMNS.find((c) => c.id === id)!).filter(Boolean),
    [columnIds],
  );

  const sortedRows = useMemo<MemberStatRow[]>(() => {
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
    <div className="overflow-x-auto rounded-card border border-line bg-surface">
      <table className="w-full text-sm">
        <thead className="bg-surface-2 text-muted">
          <tr>
            {cols.map((c) => {
              const active = sortBy === c.id;
              return (
                <th
                  key={c.id}
                  className={[
                    'px-3 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.2em] whitespace-nowrap',
                    c.align === 'right' ? 'text-right' : 'text-left',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    onClick={() => clickHeader(c.id)}
                    className={[
                      'inline-flex items-center gap-1 transition-colors hover:text-ink',
                      active ? 'text-ink' : '',
                    ].join(' ')}
                  >
                    <span>{c.label}</span>
                    <span className="text-muted opacity-70">
                      {active ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((r) => {
            const href = r.exerciseName
              ? `/me/stats/${r.equipmentId}?exercise=${encodeURIComponent(r.exerciseName)}`
              : `/me/stats/${r.equipmentId}`;
            return (
              <tr
                key={r.id}
                className="border-t border-line transition-colors hover:bg-surface-2 group"
              >
                {cols.map((c, i) => (
                  <td
                    key={c.id}
                    className={[
                      'whitespace-nowrap p-0',
                      c.align === 'right' ? 'text-right tabular-nums' : 'text-left',
                    ].join(' ')}
                  >
                    <Link
                      href={href}
                      className={[
                        'block px-3 py-3',
                        i === 0 ? 'font-medium text-ink' : 'text-muted-strong',
                      ].join(' ')}
                    >
                      {c.render(r)}
                    </Link>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
